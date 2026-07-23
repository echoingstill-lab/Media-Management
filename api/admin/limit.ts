let customDailyLimit = parseInt(process.env.AI_DAILY_LIMIT || "50", 10);
const adminToken = (process.env.ADMIN_TOKEN || "").trim();

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

function isAdminRequest(req: any): boolean {
  if (!adminToken) return false;
  return req.headers["x-admin-token"] === adminToken;
}

function sendJson(res: any, statusCode: number, data: unknown): void {
  res.status(statusCode).json(data);
}

export default async function handler(req: any, res: any) {
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
    const { limit } = typeof req.body === "object" && req.body ? req.body : {};
    if (typeof limit === "number" && limit >= 1) {
      customDailyLimit = Math.floor(limit);
      return sendJson(res, 200, { success: true, limit: customDailyLimit });
    }
    return sendJson(res, 400, { error: "无效的限额数字" });
  }
  return sendJson(res, 405, { error: "Method not allowed." });
}
