const service = require("../services/branch.service");
const { successResponse, errorResponse } = require("../utils/response");

exports.createBranch = async (req, res) => {
  try {
    const branch = await service.createBranch(req);
    return successResponse(res, "Branch created successfully", branch, 201);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

exports.getBranches = async (req, res) => {
  try {
    const branches = await service.getBranchesWithCounts(req);
    return successResponse(res, "Branches fetched successfully", branches);
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
};

exports.getBranchById = async (req, res) => {
  try {
    const branch = await service.getBranchById(req);
    return successResponse(res, "Branch fetched successfully", branch);
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
};

exports.getBranchSummary = async (req, res) => {
  try {
    const summary = await service.getBranchSummary(req);
    return successResponse(res, "Branch summary fetched successfully", summary);
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await service.updateBranch(req);
    return successResponse(res, "Branch updated successfully", branch);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branch = await service.deleteBranch(req);
    return successResponse(res, "Branch deleted successfully", branch);
  } catch (e) {
    return errorResponse(res, e.message, 400);
  }
};
