const service = require("../services/announcement.service");
const { successResponse, errorResponse } = require("../utils/response");

// -------------------------
// CREATE
// -------------------------
exports.createAnnouncement = async (req, res) => {
  try {
    const result = await service.createAnnouncement(req);
    return successResponse(res, "Announcement created successfully", result, 201);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

// -------------------------
// READ (ALL)
// -------------------------
exports.getAnnouncements = async (req, res) => {
  try {
    const result = await service.getAnnouncements(req);
    return successResponse(res, "Announcements fetched successfully", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

// -------------------------
// READ (ACTIVE)
// -------------------------
exports.getActiveAnnouncements = async (req, res) => {
  try {
    const result = await service.getActiveAnnouncements(req);
    return successResponse(res, "Active announcements fetched", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

// -------------------------
// READ SINGLE
// -------------------------
exports.getAnnouncementById = async (req, res) => {
  try {
    const result = await service.getAnnouncementById(req);
    return successResponse(res, "Announcement fetched successfully", result);
  } catch (e) {
    return errorResponse(res, e.message, 404);
  }
};

// -------------------------
// UPDATE
// -------------------------
exports.updateAnnouncement = async (req, res) => {
  try {
    const result = await service.updateAnnouncement(req);
    return successResponse(res, "Announcement updated successfully", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

// -------------------------
// DELETE
// -------------------------
exports.deleteAnnouncement = async (req, res) => {
  try {
    const result = await service.deleteAnnouncement(req);
    return successResponse(res, "Announcement deleted successfully", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};
