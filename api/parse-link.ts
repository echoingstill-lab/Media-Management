type MediaType = "book" | "movie" | "tv" | "anime" | "music" | "game" | "other";

type ParsedMedia = {
  title: string;
  originalTitle?: string;
  type: MediaType;
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
  ]
    .flatMap(value => String(value || "").split(","))
    .map(value => value.trim().replace(/\/+$/u, ""))
    .filter(Boolean);
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
  return decodeHtml(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
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

function getInfoBlock(html: string): string {
  return html.match(/<div[^>]+id=["']info["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || "";
}

function getInfoValue(html: string, labels: string[]): string {
  const infoHtml = getInfoBlock(html);
  if (!infoHtml) return "";
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escaped}\\s*[:：]?\\s*([\\s\\S]*?)(?:<br\\s*\\/?>|</div>|</span>\\s*<br|$)`, "i");
    const match = infoHtml.match(pattern);
    const value = stripHtml(match?.[1] || "").replace(/^[:：]\s*/u, "").trim();
    if (value) return value;
  }
  return "";
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return decodeHtml(value).replace(/\s+/g, " ").trim();
  }
  return "";
}

function isValidImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

function normalizeImageUrl(url: string): string {
  if (!url) return "";
  const normalized = url.startsWith("//") ? `https:${url}` : url;
  return normalized
    .replace("/s_ratio_poster/", "/l_ratio_poster/")
    .replace("/m_ratio_poster/", "/l_ratio_poster/")
    .replace("/mpic/", "/lpic/")
    .replace("/spic/", "/lpic/");
}

function extractImageFromHtml(html: string): string {
  return normalizeImageUrl(
    getMetaContent(html, "og:image") ||
      getMetaContent(html, "twitter:image") ||
      getMetaContent(html, "image") ||
      firstMatch(html, [
        /https?:\/\/img\d\.doubanio\.com\/view\/photo\/[^"'<> ]+\.(?:webp|jpg|jpeg|png)/i,
        /https?:\/\/img\d\.doubanio\.com\/view\/subject\/[^"'<> ]+\.(?:webp|jpg|jpeg|png)/i,
        /https?:\/\/[^"'<> ]+\.(?:webp|jpg|jpeg|png)/i,
      ]),
  );
}

function extractYear(text: string): string | null {
  return text.match(/(?:19|20)\d{2}/)?.[0] || null;
}

async function fetchText(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
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
      else if (parsed.pathname.includes("/game/")) section = "game";
    }
    if (!section) return null;

    const desktopUrl =
      section === "game"
        ? `https://www.douban.com/game/subject/${id}/`
        : `https://${section}.douban.com/subject/${id}/`;
    const mobileUrl = `https://m.douban.com/${section}/subject/${id}/`;
    return { id, section, candidates: Array.from(new Set([mobileUrl, desktopUrl, parsed.toString()])) };
  } catch {
    return null;
  }
}

function cleanDoubanTitle(raw: string): string {
  const title = decodeHtml(raw)
    .replace(/\s*-\s*(图书|电影|电视剧|唱片|音乐|游戏)\s*$/u, "")
    .replace(/\s*\(豆瓣\)\s*$/u, "")
    .replace(/\s*-\s*豆瓣\s*$/u, "")
    .replace(/[“”]/g, "")
    .replace(/\s*\((?:19|20)\d{2}\)\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  const chinesePrefix = title.match(/^([\u4e00-\u9fff][\u4e00-\u9fff·、，。！？《》（）\s]+?)\s+[A-Za-z0-9]/u);
  return (chinesePrefix?.[1] || title).trim();
}

function inferDoubanType(section: string, title: string, description: string): MediaType {
  if (section === "book") return "book";
  if (section === "music") return "music";
  if (section === "game") return "game";
  const text = `${title} ${description}`;
  if (/动画|动漫|anime|番剧/i.test(text)) return "anime";
  if (/电视剧|剧集|集数|series|tv/i.test(text)) return "tv";
  return "movie";
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

function extractDoubanCreator(section: string, combined: string, movieAbstract: any | null): string {
  if (Array.isArray(movieAbstract?.directors) && movieAbstract.directors.length) {
    return movieAbstract.directors.join(" / ");
  }
  if (section === "book") return getInfoValue(combined, ["作者", "作者:"]);
  if (section === "music") return getInfoValue(combined, ["表演者", "艺术家", "发行"]);
  if (section === "game") return getInfoValue(combined, ["开发商", "发行商", "制作发行", "厂商"]);
  return getInfoValue(combined, ["导演", "作者", "表演者"]);
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
      // Keep trying alternate Douban pages.
    }
  }
  const movieAbstract = douban.section === "movie" ? await fetchDoubanMovieAbstract(douban.id) : null;
  if (!fragments.length && !movieAbstract) return null;
  if (!fragments.length && movieAbstract) {
    const title = cleanDoubanTitle(movieAbstract.title || "");
    if (!title) return null;
    return {
      title,
      type: movieAbstract.is_tv ? "tv" : "movie",
      creator: Array.isArray(movieAbstract.directors) ? movieAbstract.directors.join(" / ") : "",
      coverUrl: "",
      description: movieAbstract.short_comment?.content || "",
      tags: Array.isArray(movieAbstract.types) ? movieAbstract.types.map(String).filter(Boolean) : [],
      rating: Number(movieAbstract.rate) || null,
      releaseYear: movieAbstract.release_year || null,
    };
  }

  const html = fragments.find(fragment => getMetaContent(fragment, "og:title")) || fragments[0];
  const combined = fragments.join("\n");
  const pageTitle = getMetaContent(html, "og:title") || getTitleTag(html) || "";
  const rawTitle = pageTitle && pageTitle !== "豆瓣" ? pageTitle : movieAbstract?.title || pageTitle;
  const title = cleanDoubanTitle(rawTitle);
  if (!title) return null;

  const description =
    stripHtml(getMetaContent(html, "og:description") || getMetaContent(html, "description")) ||
    movieAbstract?.short_comment?.content ||
    "";
  const cover = extractImageFromHtml(combined);
  const ratingText =
    movieAbstract?.rate ||
    getMetaContent(html, "ratingValue") ||
    combined.match(/ratingValue["']?\s*[:=]\s*["']?(\d+(?:\.\d+)?)/i)?.[1] ||
    combined.match(/rating_num[^>]*>\s*(\d+(?:\.\d+)?)/i)?.[1] ||
    "";
  const keywords = getMetaContent(html, "keywords");
  const tags = Array.isArray(movieAbstract?.types)
    ? movieAbstract.types.map(String).filter(Boolean)
    : keywords
      ? keywords.split(/[,，、]/).map(tag => tag.trim()).filter(Boolean).slice(0, 8)
      : [];

  return {
    title,
    type: movieAbstract?.is_tv ? "tv" : inferDoubanType(douban.section, rawTitle, description),
    creator: extractDoubanCreator(douban.section, combined, movieAbstract),
    coverUrl: isValidImageUrl(cover) ? cover : "",
    description,
    tags,
    rating: Number(ratingText) || null,
    releaseYear:
      movieAbstract?.release_year ||
      getInfoValue(combined, ["出版年", "发行时间", "上映日期"]) ||
      extractYear(combined),
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
    const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${steam.appId}&l=schinese&cc=cn`, {
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

function parseAppleMusicUrl(input: string): { id: string; country: string } | null {
  try {
    const parsed = new URL(input);
    if (!parsed.hostname.includes("music.apple.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const country = parts[0] || "us";
    const id = parsed.pathname.match(/\/(?:album|song|music-video)\/[^/]+\/(\d+)/)?.[1] || parsed.searchParams.get("i") || "";
    return id ? { id, country } : null;
  } catch {
    return null;
  }
}

async function parseAppleMusicSubject(input: string): Promise<ParsedMedia | null> {
  const apple = parseAppleMusicUrl(input);
  if (!apple) return null;
  try {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(apple.id)}&country=${encodeURIComponent(apple.country)}&entity=album,song,musicVideo`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const item = Array.isArray(payload?.results) ? payload.results[0] : null;
    if (!item) return null;
    const title = String(item.collectionName || item.trackName || "").trim();
    if (!title) return null;
    const cover = String(item.artworkUrl100 || "").replace(/\/100x100bb\.(jpg|png|webp)$/i, "/600x600bb.$1");
    return {
      title,
      type: "music",
      creator: String(item.artistName || "").trim(),
      coverUrl: isValidImageUrl(cover) ? cover : "",
      description: [item.primaryGenreName, item.releaseDate ? `发行时间：${String(item.releaseDate).slice(0, 10)}` : ""].filter(Boolean).join(" / "),
      tags: item.primaryGenreName ? [String(item.primaryGenreName)] : [],
      rating: null,
      releaseYear: extractYear(item.releaseDate || ""),
    };
  } catch {
    return null;
  }
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

function parseJsonLdMedia(html: string): Partial<ParsedMedia> {
  const scripts = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(decodeHtml(script[1]).trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      const media = nodes.find((node: any) => node?.name || node?.headline);
      if (!media) continue;
      const director = Array.isArray(media.director) ? media.director : media.director ? [media.director] : [];
      const author = Array.isArray(media.author) ? media.author : media.author ? [media.author] : [];
      const creator = [...director, ...author].map((person: any) => person?.name || person).filter(Boolean).join(" / ");
      return {
        title: String(media.name || media.headline || "").trim(),
        creator,
        coverUrl: normalizeImageUrl(Array.isArray(media.image) ? media.image[0] : media.image || ""),
        description: stripHtml(media.description || ""),
        rating: Number(media.aggregateRating?.ratingValue) || null,
        releaseYear: extractYear(media.datePublished || ""),
      };
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return {};
}

async function parseImdbSubject(input: string): Promise<ParsedMedia | null> {
  const imdbId = parseImdbUrl(input);
  if (!imdbId) return null;
  try {
    const page = await fetchText(`https://www.imdb.com/title/${imdbId}/`);
    const jsonLd = page.ok ? parseJsonLdMedia(page.text) : {};
    const response = await fetch(`https://v3.sg.media-imdb.com/suggestion/t/${imdbId}.json`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    const payload = response.ok ? await response.json() : null;
    const item = Array.isArray(payload?.d) ? payload.d.find((entry: any) => entry?.id === imdbId) || payload.d[0] : null;
    const qid = String(item?.qid || item?.q || "").toLowerCase();
    const title = String(jsonLd.title || item?.l || "").trim();
    if (!title) return null;
    return {
      title,
      type: qid.includes("tv") ? "tv" : qid.includes("game") ? "game" : "movie",
      creator: String(jsonLd.creator || item?.s || "").trim(),
      coverUrl: isValidImageUrl(jsonLd.coverUrl || item?.i?.imageUrl || "") ? String(jsonLd.coverUrl || item?.i?.imageUrl) : "",
      description: jsonLd.description || "",
      tags: [],
      rating: typeof jsonLd.rating === "number" ? jsonLd.rating : null,
      releaseYear: jsonLd.releaseYear || item?.y || null,
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

function inferCommonType(hostname: string, title: string, description: string, ogType: string): MediaType {
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
    title = title.replace(/\s+by\s+.+?\s+on\s+Apple Music\s*$/iu, "").trim();
  }
  return title.split(/\s+-\s+/)[0]?.trim() || title;
}

function extractCreator(hostname: string, rawTitle: string, description: string): string {
  if (hostname.includes("music.163.com")) {
    return firstMatch(`${description} ${rawTitle}`, [
      /由\s+(.+?)\s+演唱/u,
      /歌手[：:]\s*([^，。]+)/u,
      /\s+-\s*([^-\n]+?)\s*-\s*网易云音乐/u,
    ]);
  }
  if (hostname.includes("music.apple.com")) {
    return firstMatch(`${rawTitle} ${description}`, [
      /\s+by\s+(.+?)\s+on\s+Apple Music/iu,
      /Album\s*·\s*[^·]+·\s*([^·。]+)/iu,
      /专辑\s*·\s*[^·]+·\s*([^·。]+)/iu,
    ]);
  }
  if (hostname.includes("wikipedia.org")) {
    return firstMatch(description, [
      /作家([^，。]+?)创作/u,
      /作家([^，。]+?)所著/u,
      /由([^，。]+?)执导/u,
      /由([^，。]+?)开发/u,
    ]);
  }
  return firstMatch(description, [/作者[：:]\s*([^，。]+)/u, /导演[：:]\s*([^，。]+)/u]);
}

async function parseCommonMetadata(input: string): Promise<ParsedMedia | null> {
  if (!isUrlInput(input)) return null;
  const imdb = await parseImdbSubject(input);
  if (imdb) return imdb;
  const steam = await parseSteamSubject(input);
  if (steam) return steam;
  const appleMusic = await parseAppleMusicSubject(input);
  if (appleMusic) return appleMusic;
  const normalized = normalizeCommonUrl(input);
  const parsed = new URL(normalized);
  let fetched: { ok: boolean; status: number; text: string };
  try {
    fetched = await fetchText(normalized);
  } catch {
    return null;
  }
  if (!fetched.ok || !fetched.text) return null;
  const html = fetched.text;
  const jsonLd = parseJsonLdMedia(html);
  const rawTitle = getMetaContent(html, "og:title") || getMetaContent(html, "twitter:title") || getTitleTag(html) || jsonLd.title || "";
  const description = stripHtml(getMetaContent(html, "og:description") || getMetaContent(html, "description") || jsonLd.description || "");
  const cover = extractImageFromHtml(html) || jsonLd.coverUrl || "";
  const ogType = getMetaContent(html, "og:type");
  const title = cleanCommonTitle(parsed.hostname, String(rawTitle));
  if (!title || ["403 forbidden", "access denied"].includes(title.toLowerCase())) return null;
  return {
    title,
    type: inferCommonType(parsed.hostname, title, description, ogType),
    creator: extractCreator(parsed.hostname, String(rawTitle), description) || jsonLd.creator || "",
    coverUrl: isValidImageUrl(String(cover)) ? String(cover) : "",
    description,
    tags: [],
    rating: typeof jsonLd.rating === "number" ? jsonLd.rating : null,
    releaseYear: jsonLd.releaseYear || extractYear(`${rawTitle} ${description}`),
  };
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    const { url } = typeof req.body === "object" && req.body ? req.body : {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "请提供有效链接。" });
    }
    const input = url.trim();
    if (!isUrlInput(input)) {
      return res.status(400).json({ error: "线上版当前支持链接解析；纯作品名请先手动录入，或后续接入 AI 解析。" });
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
