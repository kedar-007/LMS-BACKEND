// utils/auditLogger.js  ✅ NEW FILE (matches your existing audit_log schema)

const crypto = require("crypto");
const catalystApp = require("./catalyst");

// ⚠️ change if your audit table name is different
const AUDIT_TABLE = "audit_logs";

function safeJson(obj) {
  if (obj === undefined) return "";
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return JSON.stringify({ _error: "stringify_failed", message: e?.message || String(e) });
  }
}

function diff(before = {}, after = {}) {
  const changes = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const k of keys) {
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changes[k] = { from: b ?? null, to: a ?? null };
    }
  }
  return changes;
}

function reqMeta(req) {
  return {
    request_id: req.headers["x-request-id"] || crypto.randomUUID(),
    ip: (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "",
    user_agent: req.headers["user-agent"] || "",
    path: req.originalUrl || req.url || "",
    method: req.method || "",
  };
}

async function getActor(req) {
  try {
    const user = await catalystApp(req).userManagement().getCurrentUser();
    return {
      actor_type: "USER",
      actor_id: String(user.user_id || ""),
      actor_email: user.email_id || user.email || "",
    };
  } catch {
    // fallback if current user isn't available
    return {
      actor_type: "USER",
      actor_id: String(req.headers["x-user-id"] || ""),
      actor_email: String(req.headers["x-user-email"] || ""),
    };
  }
}

/**
 * Writes to your existing audit table schema:
 * org_id (FK), actor_type, actor_id, action, entity, entity_id, meta_data (varchar)
 */
async function writeAuditLog(req, { org_id, action, entity, entity_id, before, after, extra = {} }) {
  if (!org_id) throw new Error("Audit: org_id is required");
  if (!action) throw new Error("Audit: action is required");
  if (!entity) throw new Error("Audit: entity is required");
  if (entity_id === undefined || entity_id === null) throw new Error("Audit: entity_id is required");

  const actor = await getActor(req);
  const meta = reqMeta(req);

  const metaPayload = {
    ...meta,
    actor_email: actor.actor_email,
    ...extra,
  };

  if (before !== undefined) metaPayload.before = before;
  if (after !== undefined) metaPayload.after = after;

  if (action === "UPDATE" && before && after) {
    metaPayload.changes = diff(before, after);
  }

  const row = {
    org_id,
    actor_type: actor.actor_type,
    actor_id: actor.actor_id,
    actor_email:actor.actor_email,
    action,
    entity,
    entity_id: String(entity_id),
    meta_data: safeJson(metaPayload),
  };

  console.log("row",row);

  await catalystApp(req).datastore().table(AUDIT_TABLE).insertRow(row);

  return meta.request_id;
}

module.exports = { writeAuditLog };
