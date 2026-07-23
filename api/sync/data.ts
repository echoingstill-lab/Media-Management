import type { ApiRequest, ApiResponse } from "../_http";
import { applyCors, readJsonBody, sendJson } from "../_http";
import { getAuthUser, isCloudSyncConfigured, supabaseRest } from "../_sync";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (applyCors(req, res)) return;
  if (!isCloudSyncConfigured()) {
    return sendJson(res, 503, {
      success: false,
      error: "云同步尚未配置。请联系部署者开启云同步。",
    });
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
      const { payload, baseUpdatedAt, force } = await readJsonBody<{
        payload?: any;
        baseUpdatedAt?: string | null;
        force?: boolean;
      }>(req);
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
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
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
