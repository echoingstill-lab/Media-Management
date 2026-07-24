import { Readable } from "stream";

function isBlockedProxyHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower === "0.0.0.0" || lower === "::1") return true;
  if (/^127\./u.test(lower) || /^10\./u.test(lower) || /^169\.254\./u.test(lower)) return true;
  if (/^192\.168\./u.test(lower)) return true;
  const private172 = lower.match(/^172\.(\d+)\./u);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

function getImageReferer(targetUrl: URL): string {
  const host = targetUrl.hostname.toLowerCase();
  if (host.endsWith("doubanio.com") || host.endsWith("douban.com")) return "https://movie.douban.com/";
  if (host.endsWith("steamstatic.com") || host.endsWith("steampowered.com")) return "https://store.steampowered.com/";
  return targetUrl.origin;
}

export default async function handler(req: any, res: any) {
  const origin = String(req.headers.origin || "").replace(/\/+$/u, "");
  const allowedOrigins = [
    process.env.APP_URL,
    process.env.CORS_ORIGINS,
    "https://echoingstill-lab.github.io",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ]
    .flatMap(value => String(value || "").split(","))
    .map(value => value.trim().replace(/\/+$/u, ""))
    .filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const rawUrl = String(req.query?.url || "");
  if (!rawUrl) {
    res.status(400).json({ error: "Missing image URL." });
    return;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "Invalid image URL." });
    return;
  }

  if (!["http:", "https:"].includes(targetUrl.protocol) || isBlockedProxyHostname(targetUrl.hostname)) {
    res.status(400).json({ error: "Image URL is not allowed." });
    return;
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: getImageReferer(targetUrl),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Image fetch failed." });
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      res.status(415).json({ error: "URL did not return an image." });
      return;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=2592000");
    res.setHeader("CDN-Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=2592000");
    res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=2592000");
    const contentLength = response.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    if (!response.body) {
      const bytes = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Length", String(bytes.length));
      res.status(200).send(bytes);
      return;
    }

    res.status(200);
    Readable.fromWeb(response.body as any).pipe(res);
  } catch (error: any) {
    res.status(502).json({ error: error.message || "Image proxy failed." });
  }
}
