import { createHmac, timingSafeEqual } from "crypto";

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

function verifyToken(token: string): { sub: string; username: string } | null {
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

function getAuthUser(req: any): { sub: string; username: string } | null {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return verifyToken(token);
}

async function supabaseRest(pathname: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseServiceRoleKey);
  headers.set("authorization", `Bearer ${supabaseServiceRoleKey}`);
  headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${pathname}`, { ...init, headers });
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  if (!isConfigured()) {
    return sendJson(res, 503, { success: false, error: "云同步尚未配置。请联系部署者开启云同步。" });
  }
  const user = getAuthUser(req);
  if (!user) return sendJson(res, 401, { error: "请先登录云同步账号。" });

  try {
    if (req.method === "GET") {
      const dataRes = await supabaseRest(
        `user_snapshots?user_id=eq.${encodeURIComponent(user.sub)}&select=payload,updated_at,revision&limit=1`,
      );
      if (!dataRes.ok) throw new Error(await dataRes.text());
      const rows = await dataRes.json();
      const snapshot = Array.isArray(rows) ? rows[0] : null;
      return sendJson(res, 200, {
        success: true,
        data: snapshot?.payload || null,
        updatedAt: snapshot?.updated_at || null,
        revision: snapshot?.revision || 0,
      });
    }

    if (req.method === "PUT") {
      const { payload, baseUpdatedAt, force } = typeof req.body === "object" && req.body ? req.body : {};
      if (!payload || typeof payload !== "object") {
        return sendJson(res, 400, { error: "无效的同步数据。" });
      }

      const existingRes = await supabaseRest(
        `user_snapshots?user_id=eq.${encodeURIComponent(user.sub)}&select=updated_at,revision&limit=1`,
      );
      if (!existingRes.ok) throw new Error(await existingRes.text());
      const existingRows = await existingRes.json();
      const existing = Array.isArray(existingRows) ? existingRows[0] : null;
      if (existing?.updated_at && baseUpdatedAt && existing.updated_at !== baseUpdatedAt && !force) {
        return sendJson(res, 409, {
          error: "云端数据已变化，请先选择从云端恢复，或确认用本机覆盖云端。",
          conflict: { updatedAt: existing.updated_at },
        });
      }

      const nextRevision = (existing?.revision || 0) + 1;
      const upsertRes = await supabaseRest("user_snapshots", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          user_id: user.sub,
          payload,
          revision: nextRevision,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!upsertRes.ok) throw new Error(await upsertRes.text());
      const rows = await upsertRes.json();
      const snapshot = Array.isArray(rows) ? rows[0] : null;
      return sendJson(res, 200, {
        success: true,
        updatedAt: snapshot?.updated_at || null,
        revision: snapshot?.revision || nextRevision,
      });
    }

    return sendJson(res, 405, { error: "Method not allowed." });
  } catch (error: any) {
    return sendJson(res, 500, { error: error.message || "同步失败。" });
  }
}
