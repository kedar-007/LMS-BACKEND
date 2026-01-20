const LockerService = require("../services/LockerService");
const response = require("../utils/response");

class LockerController {
  constructor(req) {
    this.service = new LockerService(req);
  }

  async create(req, res) {
    const data = await this.service.create(req.body);
    return response.success(res, data, "Locker created");
  }

  async changeStatus(req, res) {
    await this.service.changeStatus(req.params.lockerId, req.body.status);
    return response.success(res, null, "Status updated");
  }

  async available(req, res) {
    const data = await this.service.getAvailable(req.query);
    return response.success(res, data);
  }
}

module.exports = LockerController;
