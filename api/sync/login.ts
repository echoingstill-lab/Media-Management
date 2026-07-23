import type { ApiRequest, ApiResponse } from "../_http";
import { applyCors, readJsonBody, sendJson } from "../_http";
import { findSyncUser, isCloudSyncConfigured, normalizeUsername, signSyncToken, validatePassword, validateUsername, verifyPassword } from "../_sync";

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
    if (usernameError || passwordError) return sendJson(res, 400, { error: "用户名或密码错误。" });

    const user = await findSyncUser(normalized);
    if (!user || !verifyPassword(password || "", user.password_salt, user.password_hash)) {
      return sendJson(res, 401, { error: "用户名或密码错误。" });
    }
    return sendJson(res, 200, {
      success: true,
      token: signSyncToken(user.id, user.username),
      user: { id: user.id, username: user.username },
    });
  } catch (error: any) {
    return sendJson(res, 500, { error: error.message || "登录失败。" });
  }
}
