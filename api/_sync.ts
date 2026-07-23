import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import type { ApiRequest } from "./_http";

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/u, "");
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const syncAuthSecret = (process.env.SYNC_AUTH_SECRET || process.env.ADMIN_TOKEN || "").trim();

export function isCloudSyncConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey && syncAuthSecret);
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9_\-\u4e00-\u9fa5]{2,32}$/u.test(normalized)) {
    return "用户名需为 2-32 位，可使用中文、英文、数字、下划线或短横线。";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length < 6) {
    return "密码至少需要 6 位。";
  }
  return null;
}

export function hashPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(hash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function signSyncToken(userId: string, username: string): string {
  const payload = {
    sub: userId,
    username,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", syncAuthSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySyncToken(token: string): { sub: string; username: string } | null {
  if (!syncAuthSecret || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  const expected = createHmac("sha256", syncAuthSecret).update(body).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature || "");
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.sub || !payload?.username || Date.now() > payload.exp) return null;
    return { sub: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export function getAuthUser(req: ApiRequest): { sub: string; username: string } | null {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return verifySyncToken(token);
}

export async function supabaseRest(pathname: string, init: RequestInit = {}): Promise<Response> {
  if (!isCloudSyncConfigured()) {
    throw new Error("Cloud sync is not configured.");
  }
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseServiceRoleKey);
  headers.set("authorization", `Bearer ${supabaseServiceRoleKey}`);
  headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...init,
    headers,
  });
}

export async function findSyncUser(username: string): Promise<any | null> {
  const normalized = encodeURIComponent(normalizeUsername(username));
  const res = await supabaseRest(`app_users?username=eq.${normalized}&select=id,username,password_salt,password_hash&limit=1`);
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
