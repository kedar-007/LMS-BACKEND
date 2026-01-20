const service = require("../services/locker.service");
const { successResponse, errorResponse } = require("../utils/response");

exports.createLocker = async (req, res) => {
  try {
    const locker = await service.createLocker(req);
    return successResponse(res, "Locker created successfully", locker, 201);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

exports.getLockers = async (req, res) => {
  try {
    const lockers = await service.getLockersByCabinet(req);
    return successResponse(res, "Lockers fetched successfully", lockers);
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
};

exports.getLockerById = async (req, res) => {
  try {
    const locker = await service.getLockerById(req);
    return successResponse(res, "Locker fetched successfully", locker);
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
};

exports.updateLocker = async (req, res) => {
  try {
    const locker = await service.updateLocker(req);
    return successResponse(res, "Locker updated successfully", locker);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

exports.deleteLocker = async (req, res) => {
  try {
    const locker = await service.deleteLocker(req);
    return successResponse(res, "Locker deleted successfully", locker);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

exports.bookLocker = async (req, res) => {
  try {
    const result = await service.bookLocker(req);
    return successResponse(res, "Locker booked successfully", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};
