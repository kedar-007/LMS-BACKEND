// services/audit.service.js
"use strict";

const catalystApp = require("../utils/catalyst");
const {
  toDateTimeStart,
  toDateTimeEnd,
  safeJsonParse,
  encodeCursor,
  decodeCursor,
  clampInt,
  escZcqlString,
} = require("../utils/auditRead");

const AUDIT_TABLE = "audit_logs";

/**
 * LIST audit logs
 * Required: org_id
 *
 * Query params:
 *   org_id (required)
 *   from (YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
 *   to   (YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)
 *   entity
 *   entity_id
 *   action
 *   actor_id
 *   actor_email
 *   limit (default 50 max 200)
 *   cursor (base64)
 */
exports.getAuditLogs = async (req) => {
  const app = catalystApp(req);
  const zcql = app.zcql();

  const limit = clampInt(req.query.limit, 50, 1, 200);

  // ✅ org_id required (bigint)
  const orgIdRaw = req.query.org_id;
  const orgId = Number(orgIdRaw);
  if (!Number.isFinite(orgId)) throw new Error("org_id (bigint) is required");

  // date filters
  const fromDt = toDateTimeStart(req.query.from);
  const toDt = toDateTimeEnd(req.query.to);

  // string filters
  const entity = req.query.entity ? String(req.query.entity) : null;
  const entityId = req.query.entity_id ? String(req.query.entity_id) : null; // ✅ NEW
  const action = req.query.action ? String(req.query.action) : null;
  const actorId = req.query.actor_id ? String(req.query.actor_id) : null;
  const actorEmail = req.query.actor_email
    ? String(req.query.actor_email)
    : null; // ✅ NEW

  // cursor
  const cursor = decodeCursor(req.query.cursor);
  const cursorTime = cursor?.t ? String(cursor.t) : null;
  const cursorRowId = cursor?.id ? String(cursor.id) : null;

  const where = [];

  // ✅ org_id bigint numeric
  where.push(`org_id = ${orgId}`);

  if (fromDt) where.push(`CREATEDTIME >= '${escZcqlString(fromDt)}'`);
  if (toDt) where.push(`CREATEDTIME <= '${escZcqlString(toDt)}'`);

  if (entity) where.push(`entity = '${escZcqlString(entity)}'`);
  if (entityId) where.push(`entity_id = '${escZcqlString(entityId)}'`); // ✅ NEW

  if (action) where.push(`action = '${escZcqlString(action)}'`);
  if (actorId) where.push(`actor_id = '${escZcqlString(actorId)}'`);
  if (actorEmail)
    where.push(`actor_email = '${escZcqlString(actorEmail)}'`); // ✅ NEW

  // Keyset pagination (DESC)
  // ORDER BY CREATEDTIME DESC, ROWID DESC
  if (cursorTime && cursorRowId) {
    const rowIdNum = Number(cursorRowId);
    if (!Number.isFinite(rowIdNum)) throw new Error("Invalid cursor row id");

    where.push(
      `(CREATEDTIME < '${escZcqlString(cursorTime)}' OR (CREATEDTIME = '${escZcqlString(
        cursorTime
      )}' AND ROWID < ${rowIdNum}))`
    );
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;

  const q = `
    SELECT ROWID, CREATEDTIME, org_id, actor_type, actor_id, actor_email, action, entity, entity_id, meta_data
    FROM ${AUDIT_TABLE}
    ${whereClause}
    ORDER BY CREATEDTIME DESC, ROWID DESC
    LIMIT 0, ${limit}
  `;

  const rows = await zcql.executeZCQLQuery(q);

  const items = (rows || [])
    .map((r) => r[AUDIT_TABLE])
    .filter(Boolean)
    .map((r) => ({
      id: String(r.ROWID),
      created_time: r.CREATEDTIME,
      org_id: r.org_id,
      actor_type: r.actor_type,
      actor_id: r.actor_id,
      actor_email: r.actor_email || null,
      action: r.action,
      entity: r.entity,
      entity_id: r.entity_id,
      meta_data: safeJsonParse(r.meta_data) || r.meta_data,
    }));

  const last = items[items.length - 1];
  const next_cursor =
    last && items.length === limit
      ? encodeCursor({ t: last.created_time, id: last.id })
      : null;

  return {
    items,
    page_size: limit,
    next_cursor,
    effective_org_id: orgId,
    applied_filters: {
      from: fromDt || null,
      to: toDt || null,
      entity,
      entity_id: entityId,
      action,
      actor_id: actorId,
      actor_email: actorEmail,
    },
  };
};

/**
 * GET single audit log by ROWID
 * Recommended: pass org_id in query for safety
 * GET /audit-logs/:id?org_id=123
 */
exports.getAuditLogById = async (req) => {
  const app = catalystApp(req);
  const ds = app.datastore();

  const idRaw = String(req.params.id || "").trim();
  const id = Number(idRaw);
  if (!Number.isFinite(id)) throw new Error("Invalid audit log id");

  const row = await ds.table(AUDIT_TABLE).getRow(String(id));
  if (!row) throw new Error("Audit log not found");

  // Optional org check
  const orgIdRaw = req.query.org_id;
  if (orgIdRaw != null) {
    const orgId = Number(orgIdRaw);
    if (!Number.isFinite(orgId)) throw new Error("Invalid org_id");
    if (Number(row.org_id) !== orgId)
      throw new Error("Forbidden (org mismatch)");
  }

  return {
    id: String(row.ROWID),
    created_time: row.CREATEDTIME,
    org_id: row.org_id,
    actor_type: row.actor_type,
    actor_id: row.actor_id,
    actor_email: row.actor_email || null,
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id,
    meta_data: safeJsonParse(row.meta_data) || row.meta_data,
  };
};
