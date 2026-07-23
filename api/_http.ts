import type { IncomingMessage, ServerResponse } from "http";

export type ApiRequest = IncomingMessage & {
  body?: unknown;
};

export type ApiResponse = ServerResponse;

const allowedCorsOrigins = new Set(
  [
    process.env.APP_URL,
    process.env.CORS_ORIGINS,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://echoingstill-lab.github.io",
  ]
    .flatMap(value => (value || "").split(","))
    .map(value => value.trim().replace(/\/+$/u, ""))
    .filter(Boolean),
);

export function applyCors(req: ApiRequest, res: ApiResponse): boolean {
  const origin = String(req.headers.origin || "").replace(/\/+$/u, "");
  if (origin && allowedCorsOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

export function sendJson(res: ApiResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export async function readJsonBody<T = any>(req: ApiRequest): Promise<T> {
  if (req.body && typeof req.body === "object") return req.body as T;
  let raw = "";
  for await (const chunk of req) {
    raw += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
  }
  return raw ? JSON.parse(raw) as T : {} as T;
}
