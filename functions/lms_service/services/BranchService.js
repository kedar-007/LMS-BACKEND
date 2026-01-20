class BranchService {
    constructor(req) {
      this.zcql = req.catalystApp.zcql();
    }
  
    async createBranch(payload) {
      const query = `
        INSERT INTO branches (org_id, branch_code, name, address)
        VALUES ('${payload.org_id}', '${payload.branch_code}', '${payload.name}', '${payload.address}')
      `;
      return this.zcql.executeZCQLQuery(query);
    }
  
    async getBranches(org_id) {
      const query = `SELECT * FROM branches WHERE org_id='${org_id}'`;
      return this.zcql.executeZCQLQuery(query);
    }
  
    async updateBranch(branchId, payload) {
      const query = `
        UPDATE branches
        SET name='${payload.name}', address='${payload.address}'
        WHERE ROWID='${branchId}'
      `;
      return this.zcql.executeZCQLQuery(query);
    }
  
    async deleteBranch(branchId) {
      const query = `UPDATE branches SET is_deleted=true WHERE ROWID='${branchId}'`;
      return this.zcql.executeZCQLQuery(query);
    }
  }
  
  module.exports = BranchService;
  