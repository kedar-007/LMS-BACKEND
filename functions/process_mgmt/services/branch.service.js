const catalystApp = require("../utils/catalyst");

exports.createBranch = async (req) => {
  const { org_id, name, address, branch_code } = req.body;
  if (!org_id || !name) throw new Error("Missing fields");

  return await catalystApp(req)
    .datastore()
    .table("branches")
    .insertRow({ org_id, name, address, status: "ACTIVE", branch_code });
};

exports.getBranchesWithCounts = async (req) => {
    const zcql = catalystApp(req).zcql();
  
    const { org_id } = req.query;
    if (!org_id) {
      throw new Error("org_id is required");
    }
  
    const query = `
      SELECT
        branches.ROWID,
        branches.name,
        cabinets.ROWID,
        lockers.ROWID,
        lockers.status
      FROM branches
      LEFT JOIN cabinets
        ON cabinets.branch_id = branches.ROWID
      LEFT JOIN lockers
        ON lockers.cabinet_id = cabinets.ROWID
      WHERE branches.org_id = ${org_id}
    `;
  
    const rows = await zcql.executeZCQLQuery(query);
  
    const branchMap = {};
  
    for (const row of rows) {
      const branch = row.branches;
      const cabinet = row.cabinets;
      const locker = row.lockers;
  
      if (!branch || !branch.ROWID) continue;
  
      // ✅ Ensure EVERY branch is created once
      if (!branchMap[branch.ROWID]) {
        branchMap[branch.ROWID] = {
          id: branch.ROWID,
          name: branch.name,
          cabinets: new Set(),
          lockers: 0,
          available: 0,
          booked: 0
        };
      }
  
      if (cabinet && cabinet.ROWID) {
        branchMap[branch.ROWID].cabinets.add(cabinet.ROWID);
      }
  
      if (locker && locker.ROWID) {
        branchMap[branch.ROWID].lockers++;
  
        if (locker.status === "available") {
          branchMap[branch.ROWID].available++;
        } else if (locker.status === "booked") {
          branchMap[branch.ROWID].booked++;
        }
      }
    }
  
    return Object.values(branchMap).map(b => ({
      id: b.id,
      name: b.name,
      cabinets: b.cabinets.size,
      lockers: b.lockers,
      available: b.available,
      booked: b.booked
    }));
  };
  
exports.getBranchById = async (req) =>
  catalystApp(req).datastore().table("branches").getRow(req.params.id);

exports.getBranchSummary = async (req) => {
  const db = catalystApp(req).datastore();
  const cabinets = await db
    .table("cabinets")
    .getRows({ criteria: `branch_id == ${req.params.id}` });

  const lockers = await db.table("lockers").getRows();

  const branchLockers = lockers.filter((l) =>
    cabinets.some((c) => c.ROWID === l.cabinet_id)
  );

  return {
    cabinets: cabinets.length,
    lockers: {
      total: branchLockers.length,
      available: branchLockers.filter((l) => l.status === "available").length,
      booked: branchLockers.filter((l) => l.status === "booked").length,
    },
  };
};

exports.updateBranch = async (req) =>
  catalystApp(req)
    .datastore()
    .table("branches")
    .updateRow({ ROWID: req.params.id, ...req.body });

exports.deleteBranch = async (req) =>
  catalystApp(req)
    .datastore()
    .table("branches")
    .updateRow({ ROWID: req.params.id, status: "INACTIVE" });
