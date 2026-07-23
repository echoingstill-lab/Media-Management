type ParsedMedia = {
  title: string;
  type: "book" | "movie" | "tv" | "anime" | "music" | "game" | "other";
  creator: string;
  coverUrl: string;
  description: string;
  tags: string[];
  rating: number | null;
  releaseYear: string | number | null;
};

function applyCors(req: any, res: any): boolean {
  const allowed = [
    process.env.APP_URL,
    process.env.CORS_ORIGINS,
    "https://echoingstill-lab.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].flatMap(value => String(value || "").split(",")).map(value => value.trim().replace(/\/+$/u, "")).filter(Boolean);
  const origin = String(req.headers.origin || "").replace(/\/+$/u, "");
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripHtml(input: string): string {
  return decodeHtml(input.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getMetaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]).trim();
  }
  return "";
}

function getTitleTag(html: string): string {
  return stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function getInfoValue(html: string, label: string): string {
  const infoMatch = html.match(/<div[^>]+id=["']info["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!infoMatch) return "";
  const infoHtml = infoMatch[1];
  const labelIndex = infoHtml.indexOf(label);
  if (labelIndex < 0) return "";
  const afterLabel = infoHtml.slice(labelIndex + label.length);
  const endMatch = afterLabel.match(/<br\s*\/?>/i);
  const segment = endMatch ? afterLabel.slice(0, endMatch.index) : afterLabel.slice(0, 260);
  return stripHtml(segment.replace(/^[:：\s]*/, ""));
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

function normalizeImageUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url;
}

function extractYear(text: string): string | null {
  return text.match(/(?:19|20)\d{2}/)?.[0] || null;
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      },
    });
    return { ok: response.ok, status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

function isUrlInput(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

function parseDoubanUrl(input: string): { id: string; section: "book" | "movie" | "music" | "game"; candidates: string[] } | null {
  try {
    const parsed = new URL(input);
    if (!/(^|\.)douban\.com$/i.test(parsed.hostname)) return null;
    const mobileMatch = parsed.pathname.match(/^\/(book|movie|music|game)\/subject\/(\d+)/);
    const subjectMatch = parsed.pathname.match(/\/subject\/(\d+)/);
    const id = mobileMatch?.[2] || subjectMatch?.[1];
    if (!id) return null;
    let section = mobileMatch?.[1] as "book" | "movie" | "music" | "game" | undefined;
    if (!section) {
      if (parsed.hostname.startsWith("book.")) section = "book";
      else if (parsed.hostname.startsWith("movie.")) section = "movie";
      else if (parsed.hostname.startsWith("music.")) section = "music";
    }
    if (!section) return null;
    const mobileUrl = `https://m.douban.com/${section}/subject/${id}/`;
    return { id, section, candidates: Array.from(new Set([mobileUrl, parsed.toString()])) };
  } catch {
    return null;
  }
}

function cleanDoubanTitle(raw: string): string {
  return decodeHtml(raw)
    .replace(/\s*-\s*(图书|电影|电视剧|唱片|音乐|游戏)\s*$/u, "")
    .replace(/\s*\(豆瓣\)\s*$/u, "")
    .replace(/\s*-\s*豆瓣\s*$/u, "")
    .replace(/\s*\((?:19|20)\d{2}\)\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferDoubanType(section: string, title: string, description: string): ParsedMedia["type"] {
  if (section === "book") return "book";
  if (section === "music") return "music";
  if (section === "game") return "game";
  const text = `${title} ${description}`;
  if (/动画|动漫|anime|番剧/i.test(text)) return "anime";
  if (/电视剧|剧集|集数|series|tv/i.test(text)) return "tv";
  return "movie";
}

async function parseDoubanSubject(input: string): Promise<ParsedMedia | null> {
  const douban = parseDoubanUrl(input);
  if (!douban) return null;
  const fragments: string[] = [];
  for (const candidate of douban.candidates) {
    try {
      const fetched = await fetchText(candidate);
      if (fetched.ok && fetched.text) fragments.push(fetched.text);
    } catch {
      // Try the next candidate.
    }
  }
  if (!fragments.length) return null;
  const html = fragments.find(fragment => getMetaContent(fragment, "og:image")) || fragments[0];
  const combined = fragments.join("\n");
  const rawTitle = getMetaContent(html, "og:title") || getTitleTag(html);
  const title = cleanDoubanTitle(rawTitle);
  if (!title) return null;
  const description = stripHtml(getMetaContent(html, "og:description") || getMetaContent(html, "description"));
  const cover = normalizeImageUrl(getMetaContent(html, "og:image") || getMetaContent(html, "image"));
  const creator =
    getInfoValue(combined, "作者") ||
    getInfoValue(combined, "导演") ||
    getInfoValue(combined, "表演者") ||
    getInfoValue(combined, "开发商") ||
    "";
  const ratingText = getMetaContent(html, "ratingValue") || combined.match(/ratingValue["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)/i)?.[1] || "";
  const rating = Number(ratingText) || null;
  const keywords = getMetaContent(html, "keywords");
  const tags = keywords ? keywords.split(/[,，/]/).map(tag => tag.trim()).filter(Boolean).slice(0, 8) : [];
  return {
    title,
    type: inferDoubanType(douban.section, rawTitle, description),
    creator,
    coverUrl: isValidImageUrl(cover) ? cover : "",
    description,
    tags,
    rating,
    releaseYear: getInfoValue(combined, "出版年") || getInfoValue(combined, "发行时间") || extractYear(combined),
  };
}

function parseSteamUrl(input: string): { appId: string; slug: string } | null {
  try {
    const parsed = new URL(input);
    if (parsed.hostname !== "store.steampowered.com") return null;
    const match = parsed.pathname.match(/\/app\/(\d+)\/?([^/]*)/);
    return match ? { appId: match[1], slug: decodeURIComponent(match[2] || "") } : null;
  } catch {
    return null;
  }
}

async function parseSteamSubject(input: string): Promise<ParsedMedia | null> {
  const steam = parseSteamUrl(input);
  if (!steam) return null;
  try {
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${steam.appId}&l=schinese`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
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
          releaseYear: extractYear(data.release_date?.date || ""),
        };
      }
    }
  } catch {
    // Fall through to deterministic fallback.
  }
  const title = steam.slug ? steam.slug.replace(/[_-]+/g, " ").trim() : `Steam App ${steam.appId}`;
  return {
    title,
    type: "game",
    creator: "",
    coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${steam.appId}/header.jpg`,
    description: "",
    tags: [],
    rating: null,
    releaseYear: null,
  };
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

async function parseImdbSubject(input: string): Promise<ParsedMedia | null> {
  const imdbId = parseImdbUrl(input);
  if (!imdbId) return null;
  try {
    const response = await fetch(`https://v3.sg.media-imdb.com/suggestion/t/${imdbId}.json`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const item = Array.isArray(payload?.d) ? payload.d.find((entry: any) => entry?.id === imdbId) || payload.d[0] : null;
    if (!item?.l) return null;
    const qid = String(item.qid || item.q || "").toLowerCase();
    return {
      title: String(item.l).trim(),
      type: qid.includes("tv") ? "tv" : qid.includes("game") ? "game" : "movie",
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

function cleanCommonTitle(hostname: string, raw: string): string {
  let title = decodeHtml(raw).replace(/\s+/g, " ").trim();
  if (hostname.includes("wikipedia.org")) title = title.replace(/\s*-\s*维基百科.*$/u, "").trim();
  if (hostname.includes("music.163.com")) title = title.replace(/\s*-\s*网易云音乐\s*$/u, "").trim();
  if (hostname.includes("bangumi.tv") || hostname.includes("bgm.tv") || hostname.includes("chii.in")) title = title.replace(/\s*\|\s*番组计划\s*$/u, "").trim();
  if (hostname.includes("music.apple.com")) {
    const match = title.match(/《([^》]+)》/u);
    if (match) return match[1].trim();
  }
  return title.split(/\s+-\s+/)[0]?.trim() || title;
}

function extractCreator(hostname: string, rawTitle: string, description: string): string {
  if (hostname.includes("music.163.com")) return description.match(/由\s+(.+?)\s+演唱/u)?.[1]?.trim() || rawTitle.split(/\s+-\s+/)[1]?.trim() || "";
  if (hostname.includes("music.apple.com")) return rawTitle.match(/-\s*(.+?)的专辑/u)?.[1]?.trim() || "";
  return description.match(/作者[:：]\s*([^，。]+)/u)?.[1]?.trim() || "";
}

async function parseCommonMetadata(input: string): Promise<ParsedMedia | null> {
  if (!isUrlInput(input)) return null;
  const imdb = await parseImdbSubject(input);
  if (imdb) return imdb;
  const steam = await parseSteamSubject(input);
  if (steam) return steam;
  const normalized = normalizeCommonUrl(input);
  const parsed = new URL(normalized);
  const fetched = await fetchText(normalized);
  if (!fetched.ok || !fetched.text) return null;
  const html = fetched.text;
  const rawTitle = getMetaContent(html, "og:title") || getMetaContent(html, "twitter:title") || getTitleTag(html);
  const description = stripHtml(getMetaContent(html, "og:description") || getMetaContent(html, "description"));
  const cover = normalizeImageUrl(getMetaContent(html, "og:image") || getMetaContent(html, "twitter:image") || getMetaContent(html, "image"));
  const ogType = getMetaContent(html, "og:type");
  const title = cleanCommonTitle(parsed.hostname, rawTitle);
  if (!title || ["403 forbidden", "access denied"].includes(title.toLowerCase())) return null;
  return {
    title,
    type: inferCommonType(parsed.hostname, title, description, ogType),
    creator: extractCreator(parsed.hostname, rawTitle, description),
    coverUrl: isValidImageUrl(cover) ? cover : "",
    description,
    tags: [],
    rating: null,
    releaseYear: extractYear(`${rawTitle} ${description}`),
  };
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const { url } = typeof req.body === "object" && req.body ? req.body : {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Please provide a valid URL." });
    }
    const input = url.trim();
    if (!isUrlInput(input)) {
      return res.status(400).json({ error: "Vercel 线上版当前支持链接解析；纯作品名请先手动录入，或后续接入 AI 解析。" });
    }
    const douban = await parseDoubanSubject(input);
    if (douban) return res.status(200).json({ success: true, data: douban, remaining: 999, source: "douban" });
    const metadata = await parseCommonMetadata(input);
    if (metadata) return res.status(200).json({ success: true, data: metadata, remaining: 999, source: "metadata" });
    return res.status(400).json({ error: "无法解析该链接，请检查链接或手动输入。" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "无法解析该链接，请检查链接或手动输入。" });
  }
}
