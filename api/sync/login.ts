import { createHmac, pbkdf2Sync, timingSafeEqual } from "crypto";

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/u, "");
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const syncAuthSecret = (process.env.SYNC_AUTH_SECRET || process.env.ADMIN_TOKEN || "").trim();

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

function sendJson(res: any, statusCode: number, data: unknown): void {
  res.status(statusCode).json(data);
}

function isConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey && syncAuthSecret);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = hashPassword(password, salt);
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(hash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function signToken(userId: string, username: string): string {
  const payload = { sub: userId, username, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", syncAuthSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

async function supabaseRest(pathname: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseServiceRoleKey);
  headers.set("authorization", `Bearer ${supabaseServiceRoleKey}`);
  headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${pathname}`, { ...init, headers });
}

async function findUser(username: string): Promise<any | null> {
  const res = await supabaseRest(`app_users?username=eq.${encodeURIComponent(username)}&select=id,username,password_salt,password_hash&limit=1`);
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed." });
  if (!isConfigured()) {
    return sendJson(res, 503, { success: false, error: "云同步尚未配置。请联系部署者开启云同步。" });
  }
  try {
    const { username = "", password = "" } = typeof req.body === "object" && req.body ? req.body : {};
    const normalized = normalizeUsername(String(username));
    const user = await findUser(normalized);
    if (!user || !verifyPassword(String(password), user.password_salt, user.password_hash)) {
      return sendJson(res, 401, { error: "用户名或密码错误。" });
    }
    return sendJson(res, 200, {
      success: true,
      token: signToken(user.id, user.username),
      user: { id: user.id, username: user.username },
    });
  } catch (error: any) {
    return sendJson(res, 500, { error: error.message || "登录失败。" });
  }
}
