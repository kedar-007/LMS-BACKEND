// index.js
"use strict";

const url = require("url");
const auditController = require("./controllers/audit.controller");

// simple JSON writer
function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

// adapters to mimic express-style req/res used by your controllers
function 
attachExpressLike(req, res) {
  const parsed = url.parse(req.url, true);

  req.query = parsed.query || {};
  req.path = parsed.pathname || "/";
  req.originalUrl = req.url;

  // params will be set by router matcher
  req.params = req.params || {};

  // methods used by your response utils
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };
  return { req, res };
}

function match(pathname, method) {
  // versioned base
  // 1) GET /api/v1/audit-logs
  if (method === "GET" && pathname === "/api/v1/audit-logs") {
    return { handler: auditController.listAuditLogs, params: {} };
  }

  // 2) GET /api/v1/audit-logs/:id
  const m = pathname.match(/^\/api\/v1\/audit-logs\/(\d+)$/);
  if (method === "GET" && m) {
    return {
      handler: auditController.getAuditLog,
      params: { id: m[1] },
    };
  }

  return null;
}

/**
 * Catalyst entry
 */
module.exports = async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname || "/";
    const method = (req.method || "GET").toUpperCase();

    const route = match(pathname, method);

    if (!route) {
      if (pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Hello from index.js</h1>");
        return;
      }
      sendJson(res, 404, {
        success: false,
        message: "Not Found",
        data: null,
      });
      return;
    }

    req.params = route.params || {};
    attachExpressLike(req, res);

    // call controller
    await route.handler(req, res);
  } catch (err) {
    console.error("index.js error:", err);
    sendJson(res, 500, {
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};
