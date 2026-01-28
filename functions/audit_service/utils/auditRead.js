// utils/auditRead.js
"use strict";

function toDateTimeStart(dateStr) {
  // dateStr: YYYY-MM-DD -> YYYY-MM-DD 00:00:00
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr} 00:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function toDateTimeEnd(dateStr) {
  // dateStr: YYYY-MM-DD -> YYYY-MM-DD 23:59:59
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr} 23:59:59`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function safeJsonParse(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function encodeCursor(obj) {
  if (!obj) return null;
  const json = JSON.stringify(obj);
  return Buffer.from(json, "utf8").toString("base64");
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const json = Buffer.from(String(cursor), "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function clampInt(v, def, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const x = Math.trunc(n);
  return Math.max(min, Math.min(max, x));
}

// minimal escaping for ZCQL string literals
function escZcqlString(s) {
  return String(s).replace(/'/g, "''");
}

module.exports = {
  toDateTimeStart,
  toDateTimeEnd,
  safeJsonParse,
  encodeCursor,
  decodeCursor,
  clampInt,
  escZcqlString,
};
