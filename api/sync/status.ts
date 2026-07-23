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

export default function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  res.status(200).json({
    configured: Boolean(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.SYNC_AUTH_SECRET || process.env.ADMIN_TOKEN),
    ),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSyncAuthSecret: Boolean(process.env.SYNC_AUTH_SECRET || process.env.ADMIN_TOKEN),
    supabaseUrlHost: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null,
  });
}
