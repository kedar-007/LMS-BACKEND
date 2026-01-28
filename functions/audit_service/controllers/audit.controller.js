// controllers/audit.controller.js
"use strict";

const auditService = require("../services/audit.service");
const { successResponse, errorResponse } = require("../utils/response");

exports.listAuditLogs = async (req, res) => {
  try {
    res.setHeader("X-API-Version", "v1");
    const result = await auditService.getAuditLogs(req);
    return successResponse(res, "Audit logs fetched", result, 200);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

exports.getAuditLog = async (req, res) => {
  try {
    res.setHeader("X-API-Version", "v1");
    const result = await auditService.getAuditLogById(req);
    return successResponse(res, "Audit log fetched", result, 200);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};
