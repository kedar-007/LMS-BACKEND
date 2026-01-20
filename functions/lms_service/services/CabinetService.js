class CabinetService {
    constructor(req) {
      this.zcql = req.catalystApp.zcql();
    }
  
    async create(payload) {
      const query = `
        INSERT INTO cabinets (branch_id, name, security_level, total_lockers)
        VALUES ('${payload.branch_id}', '${payload.name}', '${payload.security_level}', ${payload.total_lockers})
      `;
      return this.zcql.executeZCQLQuery(query);
    }
  
    async getByBranch(branchId) {
      const query = `SELECT * FROM cabinets WHERE branch_id='${branchId}'`;
      return this.zcql.executeZCQLQuery(query);
    }
  }
  
  module.exports = CabinetService;
  