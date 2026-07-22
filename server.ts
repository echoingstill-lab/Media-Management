import express from "express";
import path from "path";
import type { Request } from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize Firebase Admin
let firebaseApp: App | null = null;
if (!getApps().length) {
  try {
    firebaseApp = initializeApp();
  } catch (e) {
    console.warn("Firebase Admin failed to initialize. Usage tracking will be disabled.");
  }
}
const db: Firestore | null = getApps().length ? getFirestore() : null;

// Lazy initializer for Gemini client to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(customKey?: string): GoogleGenAI | null {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return aiClient;
}

// DeepSeek Client (OpenAI compatible)
function getDeepSeekClient(customKey?: string): OpenAI | null {
  const apiKey = customKey || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

// Usage tracking helper with in-memory fallback
const inMemoryUsage = new Map<string, { count: number; date: string }>();
let isFirestoreAvailable = true;

// Dynamic daily limit (default 50)
let customDailyLimit = parseInt(process.env.AI_DAILY_LIMIT || "50", 10);
const adminToken = (process.env.ADMIN_TOKEN || "").trim();

type ParsedMedia = {
  title: string;
  type: "book" | "movie" | "tv" | "anime" | "music" | "game" | "other";
  creator: string;
  coverUrl: string;
  description: string;
  tags: string[];
  rating: number | null;
  releaseYear: number | string | null;
};

function isAdminRequest(req: Request): boolean {
  if (!adminToken) return false;
  return req.get("x-admin-token") === adminToken;
}

// Admin limit management endpoints
app.get("/api/admin/limit", (req, res) => {
  res.json({ limit: customDailyLimit });
});

app.post("/api/admin/limit", (req, res) => {
  if (!isAdminRequest(req)) {
    return res.status(403).json({
      error: adminToken
        ? "Admin token is required to change the shared daily limit."
        : "ADMIN_TOKEN is not configured on the server.",
    });
  }

  const { limit } = req.body;
  if (typeof limit === "number" && limit >= 1) {
    customDailyLimit = Math.floor(limit);
    return res.json({ success: true, limit: customDailyLimit });
  }
  return res.status(400).json({ error: "无效的限额数字" });
});

async function checkUsage(clientId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split("T")[0];
  const usageId = `${clientId}_${today}`;
  const DAILY_LIMIT = customDailyLimit;

  if (db && isFirestoreAvailable) {
    try {
      const usageRef = db.collection("ai_usage").doc(usageId);
      const doc = await usageRef.get();
      const data = doc.data();
      const count = data?.count || 0;

      if (count >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
      }

      await usageRef.set({
        count: count + 1,
        last_request: FieldValue.serverTimestamp(),
      }, { merge: true });

      return { allowed: true, remaining: DAILY_LIMIT - (count + 1) };
    } catch (e: any) {
      if (e?.code === 7 || (e?.message && (e.message.includes("PERMISSION_DENIED") || e.message.includes("not been used")))) {
        console.warn("Firestore API not enabled or permitted. Falling back to in-memory usage tracking.");
        isFirestoreAvailable = false;
      } else {
        console.warn("Firestore usage check warning:", e?.message || e);
      }
    }
  }

  // Fallback in-memory tracking
  const mem = inMemoryUsage.get(clientId);
  let count = 0;
  if (mem && mem.date === today) {
    count = mem.count;
  }

  if (count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  inMemoryUsage.set(clientId, { count: count + 1, date: today });
  return { allowed: true, remaining: DAILY_LIMIT - (count + 1) };
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase().trim();
  
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) return false;
  
  // Known high-quality direct image hosts
  if (lower.includes("doubanio.com") || 
      lower.includes("mzstatic.com") || 
      lower.includes("ytimg.com") ||
      lower.includes("media-amazon.com") ||
      lower.includes("images-na.ssl-images-amazon.com") ||
      lower.includes("steamstatic.com") ||
      lower.includes("gcores.com") ||
      lower.includes("shinchosha.co.jp") ||
      lower.includes("akamaihd.net")) {
    return true;
  }
  
  // Exclude common webpage URL patterns instead of actual direct images
  if (lower.includes("google.com/imgres") || 
      lower.includes("google.com/url") ||
      lower.includes("search?") ||
      lower.includes("wikipedia.org/wiki/") ||
      (lower.includes("douban.com/") && !lower.includes("doubanio.com/")) ||
      lower.includes("imdb.com/title/") ||
      lower.includes("bangumi.tv/subject/") ||
      lower.includes(".html") || 
      lower.includes(".htm")) {
    return false;
  }
  
  // We want to make sure it's an actual image extension or is from a reliable image host
  const hasImageExtension = /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(lower);
  const isImageHost = lower.includes("unsplash.com") || 
                      lower.includes("openlibrary.org") || 
                      lower.includes("vignette.wikia.nocookie.net");
                      
  return hasImageExtension || isImageHost;
}

function decodeHtml(input = ""): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function stripHtml(input = ""): string {
  return decodeHtml(input)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHtmlAttr(tag: string, attr: string): string {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`${escaped}\\s*=\\s*["']([^"']*)["']`, "i"));
  return decodeHtml(match?.[1] || "").trim();
}

function getMetaContent(html: string, key: string): string {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const meta of metas) {
    const property = getHtmlAttr(meta, "property");
    const name = getHtmlAttr(meta, "name");
    const itemprop = getHtmlAttr(meta, "itemprop");
    if ([property, name, itemprop].includes(key)) {
      return getHtmlAttr(meta, "content");
    }
  }
  return "";
}

function getFirstMetaContent(htmlFragments: string[], key: string): string {
  for (const fragment of htmlFragments) {
    const value = getMetaContent(fragment, key);
    if (value) return value;
  }
  return "";
}

function getTitleTag(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripHtml(match?.[1] || "");
}

function getInfoValue(html: string, label: string): string {
  const infoMatch = html.match(/<div[^>]+id=["']info["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!infoMatch) return "";
  const infoHtml = infoMatch[1];
  const labelIndex = infoHtml.indexOf(label);
  if (labelIndex < 0) return "";
  const afterLabel = infoHtml.slice(labelIndex + label.length);
  const endMatch = afterLabel.match(/<br\s*\/?>/i);
  const segment = endMatch ? afterLabel.slice(0, endMatch.index) : afterLabel.slice(0, 300);
  return stripHtml(segment.replace(/^[:：]\s*/, ""));
}

function extractJsonLd(html: string): any[] {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return blocks.flatMap((match) => {
    try {
      const parsed = JSON.parse(stripHtml(match[1]));
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
}

function cleanDoubanTitle(rawTitle: string): string {
  const withoutSuffix = decodeHtml(rawTitle)
    .replace(/\s*-\s*(图书|电影|电视剧|唱片|音乐|游戏)\s*$/u, "")
    .replace(/\s*\(豆瓣\)\s*$/u, "")
    .replace(/\s*‎\s*/g, " ")
    .replace(/\s*\((?:19|20)\d{2}\)\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();

  const chinesePrefix = withoutSuffix.match(/^([\u4e00-\u9fff][\u4e00-\u9fff：·、，。！？《》（）\s]+?)\s+[\u3040-\u30ffA-Za-z0-9]/u);
  return (chinesePrefix?.[1] || withoutSuffix).trim();
}

function cleanDoubanDescription(description: string, title: string): string {
  let text = decodeHtml(description).replace(/\s+/g, " ").trim();
  text = text.replace(/^.*?豆瓣评分[:：]?\s*\d+(?:\.\d+)?\s*简介[:：]\s*/u, "");
  if (title) {
    text = text.replace(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "u"), "");
  }
  text = text.replace(/^豆瓣评分[:：]?\s*\d+(?:\.\d+)?\s*/u, "");
  text = text.replace(/^简介[:：]\s*/u, "");
  return text.trim();
}

function inferDoubanType(section: string, title: string, description: string, tags: string[]): ParsedMedia["type"] {
  if (section === "book") return "book";
  if (section === "music") return "music";
  if (section === "game") return "game";
  if (section === "movie") {
    const animeSignals = ["动画", "动漫", "番剧", "配音"];
    if (tags.some((tag) => animeSignals.includes(tag)) || animeSignals.some((signal) => description.includes(signal))) {
      return "anime";
    }
    if (title.includes("电视剧") || description.includes("集数") || description.includes("剧集")) {
      return "tv";
    }
    return "movie";
  }
  return "other";
}

function parseDoubanUrl(input: string): { id: string; section: "book" | "movie" | "music" | "game"; candidates: string[] } | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }

  if (!/(^|\.)douban\.com$/i.test(parsed.hostname)) return null;

  const subjectMatch = parsed.pathname.match(/\/subject\/(\d+)/);
  const mobileMatch = parsed.pathname.match(/^\/(book|movie|music|game)\/subject\/(\d+)/);
  const id = mobileMatch?.[2] || subjectMatch?.[1];
  if (!id) return null;

  let section = mobileMatch?.[1] as "book" | "movie" | "music" | "game" | undefined;
  if (!section) {
    if (parsed.hostname.startsWith("book.")) section = "book";
    else if (parsed.hostname.startsWith("movie.")) section = "movie";
    else if (parsed.hostname.startsWith("music.")) section = "music";
  }
  if (!section) return null;

  const normalizedOriginal = parsed.toString();
  const mobileUrl = `https://m.douban.com/${section}/subject/${id}/`;
  const candidates = Array.from(new Set([
    section === "movie" || section === "game" ? mobileUrl : normalizedOriginal,
    mobileUrl,
    normalizedOriginal,
  ]));

  return { id, section, candidates };
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const isMobileUrl = new URL(url).hostname === "m.douban.com";
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": isMobileUrl
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
          : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      },
    });
    return { ok: response.ok, status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDoubanMovieAbstract(id: string): Promise<any | null> {
  try {
    const response = await fetch(`https://movie.douban.com/j/subject_abstract?subject_id=${id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Referer": `https://movie.douban.com/subject/${id}/`,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.r === 0 ? data.subject : null;
  } catch {
    return null;
  }
}

async function parseDoubanSubject(input: string): Promise<ParsedMedia | null> {
  const douban = parseDoubanUrl(input);
  if (!douban) return null;

  const htmlFragments: string[] = [];
  for (const candidate of douban.candidates) {
    try {
      const fetched = await fetchText(candidate);
      if (fetched.ok && fetched.text.includes("douban")) {
        htmlFragments.push(fetched.text);
      }
    } catch {
      // Try the next candidate.
    }
  }

  const html = htmlFragments.find((fragment) => getMetaContent(fragment, "og:image")) || htmlFragments[0] || "";
  const combinedHtml = htmlFragments.join("\n");
  const movieAbstract = douban.section === "movie" ? await fetchDoubanMovieAbstract(douban.id) : null;
  const titleFromMeta = getFirstMetaContent(htmlFragments, "og:title") || getTitleTag(html);
  const title = cleanDoubanTitle(titleFromMeta || movieAbstract?.title);
  if (!title) return null;

  const metaDescription = getFirstMetaContent(htmlFragments, "og:description") || getFirstMetaContent(htmlFragments, "description");
  const tags = Array.isArray(movieAbstract?.types) ? movieAbstract.types.filter(Boolean).map(String) : [];
  const description = cleanDoubanDescription(metaDescription, title);
  const jsonLd = extractJsonLd(combinedHtml);
  const bookData = jsonLd.find((entry) => entry?.["@type"] === "Book");
  const rating = Number(movieAbstract?.rate || getFirstMetaContent(htmlFragments, "ratingValue")) || null;
  const sectionType = inferDoubanType(douban.section, titleFromMeta, `${title} ${description}`, tags);

  const creator =
    (Array.isArray(movieAbstract?.directors) ? movieAbstract.directors.join(" / ") : "") ||
    (Array.isArray(bookData?.author) ? bookData.author.map((author: any) => author?.name).filter(Boolean).join(" / ") : "") ||
    getInfoValue(combinedHtml, "作者") ||
    getInfoValue(combinedHtml, "表演者") ||
    "";

  const releaseYear =
    movieAbstract?.release_year ||
    getInfoValue(combinedHtml, "出版年") ||
    getInfoValue(combinedHtml, "发行时间") ||
    null;

  const coverUrl = getFirstMetaContent(htmlFragments, "og:image") || getFirstMetaContent(htmlFragments, "image") || "";

  return {
    title,
    type: sectionType,
    creator,
    coverUrl: isValidImageUrl(coverUrl) ? coverUrl : "",
    description,
    tags,
    rating,
    releaseYear,
  };
}

function isUrlInput(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

function normalizeCommonUrl(input: string): string {
  const parsed = new URL(input);

  if (parsed.hostname === "music.163.com" && parsed.hash.startsWith("#/")) {
    const hashUrl = new URL(parsed.hash.slice(1), parsed.origin);
    parsed.pathname = hashUrl.pathname;
    parsed.search = hashUrl.search;
    parsed.hash = "";
  }

  return parsed.toString();
}

function getCommonUrlCandidates(input: string): string[] {
  const normalized = normalizeCommonUrl(input);
  const parsed = new URL(normalized);
  const candidates = [normalized];

  if (parsed.hostname === "music.apple.com" && /^\/[a-z]{2}\//i.test(parsed.pathname)) {
    const cnUrl = new URL(normalized);
    cnUrl.pathname = cnUrl.pathname.replace(/^\/[a-z]{2}\//i, "/cn/");
    candidates.unshift(cnUrl.toString());
  }

  if (parsed.hostname === "music.163.com" && parsed.pathname === "/song") {
    const mobileUrl = new URL(normalized);
    mobileUrl.pathname = "/m/song";
    candidates.unshift(mobileUrl.toString());
  }

  return Array.from(new Set(candidates));
}

function parseImdbUrl(input: string): string | null {
  try {
    const parsed = new URL(input);
    if (!/(^|\.)imdb\.com$/i.test(parsed.hostname)) return null;
    return parsed.pathname.match(/\/title\/(tt\d+)/)?.[1] || null;
  } catch {
    return null;
  }
}

function parseSteamUrl(input: string): { appId: string; slug: string } | null {
  try {
    const parsed = new URL(input);
    if (parsed.hostname !== "store.steampowered.com") return null;
    const match = parsed.pathname.match(/\/app\/(\d+)\/?([^/]*)/);
    if (!match) return null;
    return { appId: match[1], slug: decodeURIComponent(match[2] || "") };
  } catch {
    return null;
  }
}

async function parseSteamSubject(input: string): Promise<ParsedMedia | null> {
  const steam = parseSteamUrl(input);
  if (!steam) return null;

  try {
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${steam.appId}&l=schinese`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });
    if (response.ok) {
      const payload = await response.json();
      const data = payload?.[steam.appId]?.data;
      if (data?.name) {
        return {
          title: String(data.name).trim(),
          type: "game",
          creator: Array.isArray(data.developers) ? data.developers.join(" / ") : "",
          coverUrl: isValidImageUrl(data.header_image || "") ? data.header_image : "",
          description: stripHtml(data.short_description || ""),
          tags: Array.isArray(data.genres) ? data.genres.map((genre: any) => String(genre?.description || "")).filter(Boolean) : [],
          rating: null,
          releaseYear: extractCommonYear(data.release_date?.date || ""),
        };
      }
    }
  } catch {
    // Fall back to deterministic Steam app metadata below.
  }

  const fallbackTitle = steam.slug
    ? steam.slug.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
    : `Steam App ${steam.appId}`;

  return {
    title: fallbackTitle,
    type: "game",
    creator: "",
    coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steam.appId}/header.jpg`,
    description: "",
    tags: [],
    rating: null,
    releaseYear: null,
  };
}

async function parseImdbSubject(input: string): Promise<ParsedMedia | null> {
  const imdbId = parseImdbUrl(input);
  if (!imdbId) return null;

  try {
    const response = await fetch(`https://v3.sg.media-imdb.com/suggestion/t/${imdbId}.json`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const item = Array.isArray(payload?.d)
      ? payload.d.find((entry: any) => entry?.id === imdbId) || payload.d[0]
      : null;
    if (!item?.l) return null;

    const qid = String(item.qid || item.q || "").toLowerCase();
    const type: ParsedMedia["type"] =
      qid.includes("tv") ? "tv" :
      qid.includes("game") ? "game" :
      "movie";

    return {
      title: String(item.l).trim(),
      type,
      creator: String(item.s || "").trim(),
      coverUrl: isValidImageUrl(item.i?.imageUrl || "") ? item.i.imageUrl : "",
      description: "",
      tags: [],
      rating: null,
      releaseYear: item.y || null,
    };
  } catch {
    return null;
  }
}

function parseWikipediaFallback(input: string): ParsedMedia | null {
  try {
    const parsed = new URL(input);
    if (!parsed.hostname.includes("wikipedia.org")) return null;
    const rawPage = decodeURIComponent(parsed.pathname.split("/").pop() || "").replace(/_/g, " ");
    if (!rawPage) return null;
    const type = inferCommonType(parsed.hostname, rawPage, rawPage, "");
    const title = rawPage.replace(/\s*[（(](小说|電影|电影|电视剧|動畫|动画|遊戲|游戏|音樂|音乐)[）)]\s*$/u, "").trim();
    return {
      title,
      type,
      creator: "",
      coverUrl: "",
      description: "",
      tags: [],
      rating: null,
      releaseYear: null,
    };
  } catch {
    return null;
  }
}

function inferCommonType(hostname: string, title: string, description: string, ogType: string): ParsedMedia["type"] {
  const host = hostname.toLowerCase();
  const text = `${title} ${description} ${ogType}`;
  if (host.includes("steampowered.com")) return "game";
  if (host.includes("music.apple.com") || host.includes("music.163.com") || host.includes("open.spotify.com")) return "music";
  if (host.includes("imdb.com")) return "movie";
  if (host.includes("bangumi.tv") || host.includes("bgm.tv") || host.includes("chii.in")) {
    if (/游戏|game/i.test(text)) return "game";
    if (/音乐|唱片|music|album/i.test(text)) return "music";
    if (/书籍|图书|小说|book/i.test(text)) return "book";
    return "anime";
  }
  if (/动画|动漫|anime|番剧/i.test(text)) return "anime";
  if (/电视剧|剧集|series|tv/i.test(text)) return "tv";
  if (/电影|movie|film/i.test(text)) return "movie";
  if (/游戏|game|steam/i.test(text)) return "game";
  if (/音乐|歌曲|专辑|唱片|music|album|song/i.test(text)) return "music";
  if (/图书|小说|书籍|book|novel/i.test(text)) return "book";
  return "other";
}

function cleanCommonTitle(hostname: string, rawTitle: string): string {
  let title = decodeHtml(rawTitle)
    .replace(/\s+/g, " ")
    .replace(/^‎/, "")
    .trim();

  if (hostname.includes("steampowered.com")) {
    title = title.replace(/^Steam\s+上的\s*/u, "").trim();
  }

  if (hostname.includes("wikipedia.org")) {
    title = title.replace(/\s*-\s*维基百科，自由的百科全书\s*$/u, "").trim();
  }

  if (hostname.includes("music.apple.com")) {
    const appleOgAlbum = title.match(/^Apple\s*Music\s*上(.+?)的专辑《([^》]+)》/u);
    if (appleOgAlbum) return appleOgAlbum[2].trim();
    const appleAlbum = title.match(/《([^》]+)》\s*-\s*(.+?)的专辑/u);
    if (appleAlbum) return appleAlbum[1].trim();
    title = title.replace(/^Apple\s*Music\s*上/u, "").trim();
  }

  if (hostname.includes("music.163.com")) {
    title = title.replace(/\s*-\s*网易云音乐\s*$/u, "").trim();
    title = title.split(/\s+-\s+/)[0]?.trim() || title;
  }

  if (hostname.includes("bangumi.tv") || hostname.includes("bgm.tv") || hostname.includes("chii.in")) {
    title = title.replace(/\s*\|\s*番组计划\s*$/u, "").trim();
  }

  return title;
}

function extractCommonCreator(hostname: string, title: string, description: string): string {
  const host = hostname.toLowerCase();
  const text = `${title} ${description}`;

  if (host.includes("music.apple.com")) {
    return title.match(/^Apple\s*Music\s*上(.+?)的专辑《[^》]+》/u)?.[1]?.trim() ||
      title.match(/-\s*(.+?)的专辑/u)?.[1]?.trim() ||
      "";
  }

  if (host.includes("music.163.com")) {
    return description.match(/由\s+(.+?)\s+演唱/u)?.[1]?.trim() || title.split(/\s+-\s+/)[1]?.trim() || "";
  }

  if (host.includes("steampowered.com")) {
    return "";
  }

  return text.match(/作者[:：]\s*([^，。]+)/u)?.[1]?.trim() || "";
}

function extractCommonYear(text: string): string | number | null {
  return text.match(/(?:19|20)\d{2}/)?.[0] || null;
}

async function parseCommonMetadata(input: string): Promise<ParsedMedia | null> {
  if (!isUrlInput(input)) return null;
  const imdbResult = await parseImdbSubject(input);
  if (imdbResult) return imdbResult;
  const steamResult = await parseSteamSubject(input);
  if (steamResult) return steamResult;

  let parsed: URL;
  try {
    parsed = new URL(normalizeCommonUrl(input));
  } catch {
    return null;
  }

  for (const candidate of getCommonUrlCandidates(input)) {
    try {
      const fetched = await fetchText(candidate);
      if (!fetched.ok || !fetched.text) continue;

      const html = fetched.text;
      const candidateUrl = new URL(candidate);
      const rawTitle = getMetaContent(html, "og:title") || getMetaContent(html, "twitter:title") || getTitleTag(html);
      const description = getMetaContent(html, "og:description") || getMetaContent(html, "description") || "";
      const coverUrl = getMetaContent(html, "og:image") || getMetaContent(html, "twitter:image") || getMetaContent(html, "image") || "";
      const ogType = getMetaContent(html, "og:type");
      const title = cleanCommonTitle(candidateUrl.hostname, rawTitle);

      if (!title || ["403 forbidden", "access denied"].includes(title.toLowerCase())) continue;

      const creator = extractCommonCreator(candidateUrl.hostname, rawTitle, description);
      const type = inferCommonType(candidateUrl.hostname, title, description, ogType);

      return {
        title,
        type,
        creator,
        coverUrl: isValidImageUrl(coverUrl) ? coverUrl : "",
        description: decodeHtml(description).replace(/\s+/g, " ").trim(),
        tags: [],
        rating: null,
        releaseYear: extractCommonYear(`${rawTitle} ${description}`),
      };
    } catch {
      // Try the next normalized candidate before falling back to AI.
    }
  }

  return parseWikipediaFallback(input);
}

// Helper to validate and sanitize AI parse output
function sanitizeParseResult(resultText: string): { data?: any; error?: string } {
  let json: any = {};
  try {
    json = JSON.parse(resultText);
  } catch (e) {
    return { error: "无法解析该网址或内容，请检查输入或手动填写。" };
  }

  if (json.error && typeof json.error === "string") {
    return { error: json.error };
  }

  const title = json.title ? String(json.title).trim() : "";
  const invalidTitles = ["unknown", "n/a", "null", "undefined", "未知", "无", "解析失败", "error", "none", "n/a title"];
  if (!title || invalidTitles.includes(title.toLowerCase())) {
    return { error: "无法解析该网址或内容，请检查链接或手动填写。" };
  }

  if (json.coverUrl && !isValidImageUrl(json.coverUrl)) {
    json.coverUrl = "";
  }

  return { data: json };
}

// API: Parse Book/Movie/Anime/Music links or titles using Gemini + Search Grounding
app.post("/api/parse-link", async (req, res) => {
  try {
    const { url, userApiKey, provider, baseUrl, model, clientId } = req.body;
    const hasAdminAccess = isAdminRequest(req);
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Please provide a valid URL or title." });
    }

    const doubanResult = await parseDoubanSubject(url);
    if (doubanResult) {
      return res.json({ success: true, data: doubanResult, remaining: 999, source: "douban" });
    }

    const commonMetadataResult = await parseCommonMetadata(url);
    if (commonMetadataResult) {
      return res.json({ success: true, data: commonMetadataResult, remaining: 999, source: "metadata" });
    }

    // Usage check for shared key (public mode)
    let usageInfo = { allowed: true, remaining: 999 };
    if (!userApiKey) {
      if (hasAdminAccess) {
        // Admin mode gets unlimited parse usage
        usageInfo = { allowed: true, remaining: 9999 };
      } else {
        usageInfo = await checkUsage(clientId || req.ip || "anonymous");
        if (!usageInfo.allowed) {
          return res.status(429).json({ 
            error: `今日 AI 解析次数已达上限（${customDailyLimit}次）。配置个人 API Key 或使用服务器管理员令牌可不受限制。` 
          });
        }
      }
    }

    // Determine which AI to use
    let activeProvider = provider;
    if (!activeProvider) {
      if (userApiKey) {
        activeProvider = "openai"; 
      } else {
        // Prioritize SiliconFlow if configured, then Gemini, then DeepSeek
        if (process.env.SILICONFLOW_API_KEY) {
          activeProvider = "siliconflow";
        } else if (process.env.GEMINI_API_KEY) {
          activeProvider = "gemini";
        } else {
          activeProvider = "openai";
        }
      }
    }
    
    const prompt = `You are a professional media cataloging assistant specializing in Chinese and International media (books, movies, TV shows, anime, music albums, video games).
User Input: "${url}"

Tasks:
1. Identify the media item from the input. 
2. If the input is a Douban Link (e.g., movie.douban.com/subject/1292052/), prioritize information from that specific Douban entry.
3. If the input URL or text is invalid, random gibberish, an unparseable generic webpage, or CANNOT be matched to a real book, movie, TV show, anime, album, or game, you MUST return JSON:
   { "error": "无法解析该网址或内容，请检查链接或手动输入" }
4. If valid, return a JSON object:
   - title: (string) Official Chinese title (e.g., "肖申克的救赎")
   - type: (one of: 'book', 'movie', 'tv', 'anime', 'music', 'game', 'other')
   - creator: (string) Author/Director/Studio/Artist
   - coverUrl: (string) DIRECT static image URL ending in .jpg, .png, .webp. If none found, use empty string "".
   - description: (string) Chinese summary (1-2 sentences)
   - tags: (array of strings in Chinese)
   - rating: (number 0-10 or null)
   - releaseYear: (number or string or null)

CRITICAL: Do NOT invent fake or placeholder titles if you are uncertain. Return { "error": "无法解析该网址或内容，请检查链接或手动输入" } instead.`;

    if (activeProvider === "gemini" && !baseUrl) {
      const ai = getGeminiClient(userApiKey);
      if (!ai) {
        return res.status(400).json({ error: "Gemini API key is not configured." });
      }

      const response = await ai.models.generateContent({
        model: model || "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        }
      });

      const resultText = response.text?.trim() || "{}";
      const sanitized = sanitizeParseResult(resultText);
      if (sanitized.error) {
        return res.status(400).json({ error: sanitized.error });
      }

      return res.json({ success: true, data: sanitized.data, remaining: usageInfo.remaining });
    } else {
      // OpenAI compatible (SiliconFlow, DeepSeek, Local LLM, etc.)
      let apiKey = userApiKey;
      let finalBaseUrl = baseUrl;
      let finalModel = model;

      if (!userApiKey) {
        if (activeProvider === "siliconflow") {
          apiKey = process.env.SILICONFLOW_API_KEY;
          finalBaseUrl = "https://api.siliconflow.cn/v1";
          finalModel = model || "deepseek-ai/DeepSeek-V3";
        } else {
          apiKey = process.env.DEEPSEEK_API_KEY;
          finalBaseUrl = "https://api.deepseek.com";
          finalModel = model || "deepseek-chat";
        }
      } else {
        // Personal Key
        if (activeProvider === "siliconflow") {
          finalBaseUrl = baseUrl || "https://api.siliconflow.cn/v1";
          finalModel = model || "deepseek-ai/DeepSeek-V3";
        } else {
          finalBaseUrl = baseUrl || "https://api.openai.com/v1";
          if (!finalModel) {
            if (finalBaseUrl.includes("deepseek.com")) finalModel = "deepseek-chat";
            else if (finalBaseUrl.includes("openai.com")) finalModel = "gpt-4o-mini";
            else finalModel = "gpt-4o-mini";
          }
        }
      }

      if (!apiKey) {
        return res.status(400).json({ error: `${activeProvider} API key is not configured.` });
      }

      const client = new OpenAI({
        apiKey,
        baseURL: finalBaseUrl,
      });

      const response = await client.chat.completions.create({
        model: finalModel,
        messages: [
          { role: "system", content: "You are a helpful assistant that parses media information into JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const resultText = response.choices[0].message.content || "{}";
      const sanitized = sanitizeParseResult(resultText);
      if (sanitized.error) {
        return res.status(400).json({ error: sanitized.error });
      }

      return res.json({ success: true, data: sanitized.data, remaining: usageInfo.remaining });
    }
  } catch (error: any) {
    console.error("AI parse link error:", error);
    res.status(500).json({ error: error.message || "无法解析该网址或内容，请检查链接或手动输入。" });
  }
});

// Configure Vite or Static files depending on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (http://localhost:${PORT})`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
