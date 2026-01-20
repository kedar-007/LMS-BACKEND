class LockerService {
    constructor(req) {
      this.zcql = req.catalystApp.zcql();
    }
  
    async create(payload) {
      const query = `
        INSERT INTO lockers (cabinet_id, locker_number, size, annual_rent, status)
        VALUES ('${payload.cabinet_id}', '${payload.locker_number}', '${payload.size}', ${payload.annual_rent}, 'AVAILABLE')
      `;
      return this.zcql.executeZCQLQuery(query);
    }
  
    async changeStatus(lockerId, status) {
      const query = `
        UPDATE lockers SET status='${status}' WHERE ROWID='${lockerId}'
      `;
      return this.zcql.executeZCQLQuery(query);
    }
  
    async getAvailable({ branchId, size }) {
      const query = `
        SELECT l.*
        FROM lockers l
        JOIN cabinets c ON l.cabinet_id = c.ROWID
        WHERE c.branch_id='${branchId}'
        AND l.size='${size}'
        AND l.status='AVAILABLE'
      `;
      return this.zcql.executeZCQLQuery(query);
    }
  }
  
  module.exports = LockerService;
  