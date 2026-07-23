import type { ApiRequest, ApiResponse } from "../_http";
import { applyCors, readJsonBody, sendJson } from "../_http";

let customDailyLimit = parseInt(process.env.AI_DAILY_LIMIT || "50", 10);
const adminToken = (process.env.ADMIN_TOKEN || "").trim();

function isAdminRequest(req: ApiRequest): boolean {
  if (!adminToken) return false;
  return req.headers["x-admin-token"] === adminToken;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method === "GET") {
    return sendJson(res, 200, { limit: customDailyLimit });
  }
  if (req.method === "POST") {
    if (!isAdminRequest(req)) {
      return sendJson(res, 403, {
        error: adminToken
          ? "Admin token is required to change the shared daily limit."
          : "ADMIN_TOKEN is not configured on the server.",
      });
    }
    const { limit } = await readJsonBody<{ limit?: number }>(req);
    if (typeof limit === "number" && limit >= 1) {
      customDailyLimit = Math.floor(limit);
      return sendJson(res, 200, { success: true, limit: customDailyLimit });
    }
    return sendJson(res, 400, { error: "无效的限额数字" });
  }
  return sendJson(res, 405, { error: "Method not allowed." });
}
