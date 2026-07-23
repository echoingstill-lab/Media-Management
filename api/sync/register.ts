import type { ApiRequest, ApiResponse } from "../_http";
import { applyCors, readJsonBody, sendJson } from "../_http";
import { findSyncUser, hashPassword, isCloudSyncConfigured, normalizeUsername, signSyncToken, supabaseRest, validatePassword, validateUsername } from "../_sync";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed." });
  if (!isCloudSyncConfigured()) {
    return sendJson(res, 503, {
      success: false,
      error: "云同步尚未配置。请联系部署者开启云同步。",
    });
  }
  try {
    const { username, password } = await readJsonBody<{ username?: string; password?: string }>(req);
    const normalized = normalizeUsername(username || "");
    const usernameError = validateUsername(normalized);
    const passwordError = validatePassword(password || "");
    if (usernameError || passwordError) return sendJson(res, 400, { error: usernameError || passwordError });

    const existing = await findSyncUser(normalized);
    if (existing) return sendJson(res, 409, { error: "该用户名已被注册。" });

    const { salt, hash } = hashPassword(password || "");
    const insertRes = await supabaseRest("app_users", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        username: normalized,
        password_salt: salt,
        password_hash: hash,
      }),
    });
    if (!insertRes.ok) throw new Error(await insertRes.text());
    const rows = await insertRes.json();
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user?.id) throw new Error("创建云同步账号失败。");
    return sendJson(res, 200, {
      success: true,
      token: signSyncToken(user.id, user.username),
      user: { id: user.id, username: user.username },
    });
  } catch (error: any) {
    return sendJson(res, 500, { error: error.message || "注册失败。" });
  }
}
