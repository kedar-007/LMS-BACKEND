const BranchService = require("../services/BranchService");
const response = require("../utils/response");

class BranchController {
  constructor(req) {
    this.service = new BranchService(req);
  }

  async create(req, res) {
    const data = await this.service.createBranch(req.body);
    return response.success(res, data, "Branch created");
  }

  async getAll(req, res) {
    const data = await this.service.getBranches(req.query.org_id);
    return response.success(res, data);
  }

  async update(req, res) {
    const data = await this.service.updateBranch(req.params.branchId, req.body);
    return response.success(res, data, "Branch updated");
  }

  async remove(req, res) {
    await this.service.deleteBranch(req.params.branchId);
    return response.success(res, null, "Branch deleted");
  }
}

module.exports = BranchController;
