const service = require("../services/locker.service");
const { successResponse, errorResponse } = require("../utils/response");

// -------------------- Normal Lockers --------------------
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

// -------------------- Industry Lockers --------------------
exports.createIndustryLocker = async (req, res) => {
  try {
    const result = await service.createIndustryLocker(req);
    return successResponse(res, "Locker Structure Created", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

// Step-1 (dropdown list)
exports.listIndustryLockers = async (req, res) => {
  try {
    const result = await service.getIndustryLockers(req);
    return successResponse(res, "Locker Structures Fetched", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

// Step-2 (cabinet sizes/models)
exports.listIndustryLockerCabinets = async (req, res) => {
  try {
    const result = await service.getIndustryLockerCabinets(req);
    return successResponse(res, "Cabinet Sizes Fetched", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

// Step-3 (model details)
exports.getIndustryLockerCabinetDetails = async (req, res) => {
  try {
    const result = await service.getIndustryLockerCabinetDetails(req);
    return successResponse(res, "Cabinet Detail Fetched", result);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};
