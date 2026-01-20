const CabinetService = require("../services/CabinetService");
const response = require("../utils/response");

class CabinetController {
  constructor(req) {
    this.service = new CabinetService(req);
  }

  async create(req, res) {
    const data = await this.service.create(req.body);
    return response.success(res, data, "Cabinet created");
  }

  async getByBranch(req, res) {
    const data = await this.service.getByBranch(req.query.branchId);
    return response.success(res, data);
  }
}

module.exports = CabinetController;
