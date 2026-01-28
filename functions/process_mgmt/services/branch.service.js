// services/branch.service.js  ✅ UPDATED (with audit logs added only to POST/PUT/DELETE)

const catalystApp = require("../utils/catalyst");
const { writeAuditLog } = require("../utils/auditLogger"); // ✅ add this helper (given below)

// -------------------------
// CREATE (POST /branches)
// -------------------------
exports.createBranch = async (req) => {
  const { org_id, name, address, branch_code } = req.body;
  if (!org_id || !name) throw new Error("Missing fields");

  const created = await catalystApp(req)
    .datastore()
    .table("branches")
    .insertRow({ org_id, name, address, status: "ACTIVE", branch_code });

  
  console.log("CREATED - ",created);
  // ✅ AUDIT: CREATE
  await writeAuditLog(
    req,
    {
      org_id,
      action: "CREATE",
      entity: "branch",
      entity_id: created?.ROWID || created?.rowid || created?.id || "",
      after: created,
      extra: { payload: { name, address, branch_code } },
    }
  );

  return created;
};

// -------------------------
// READ APIs (No audit)
// -------------------------
exports.getBranches = async (req) => {
  const zcql = catalystApp(req).zcql();

  const orgId = Number(req.query.org_id);
  if (!Number.isFinite(orgId)) {
    throw new Error("Valid org_id is required");
  }

  const branchRows = await zcql.executeZCQLQuery(`
    SELECT ROWID, name, address, branch_code, status
    FROM branches
    WHERE org_id = ${orgId}
  `);

  return branchRows
    .map(row => row.branches)
    .filter(Boolean)
    .map(b => ({
      id: b.ROWID,
      name: b.name,
      address: b.address,
      branch_code: b.branch_code,
      status: b.status
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

// -------------------------
// UPDATE (PUT /branches/:id)
// -------------------------
exports.updateBranch = async (req) => {
  const table = catalystApp(req).datastore().table("branches");
  const branchId = req.params.id;

  // ✅ BEFORE snapshot
  const before = await table.getRow(branchId);
  if (!before) throw new Error("Branch not found");

  // ✅ server-truth org_id (ignore client org_id if sent)
  const org_id = before.org_id;

  // prevent org_id changing via update API
  const { org_id: _ignoredOrgId, ...safeBody } = req.body;

  // Perform update
  await table.updateRow({ ROWID: branchId, ...safeBody });

  // ✅ AFTER snapshot
  const after = await table.getRow(branchId);

  // ✅ AUDIT: UPDATE (before + after)
  await writeAuditLog(
    req,
    {
      org_id,
      action: "UPDATE",
      entity: "branch",
      entity_id: branchId,
      before,
      after,
      extra: { payload: safeBody },
    }
  );

  return after;
};

// -------------------------
// DELETE (soft delete) (DELETE /branches/:id)
// -------------------------
exports.deleteBranch = async (req) => {
  const table = catalystApp(req).datastore().table("branches");
  const branchId = req.params.id;

  // ✅ BEFORE snapshot
  const before = await table.getRow(branchId);
  if (!before) throw new Error("Branch not found");

  const org_id = before.org_id;

  // Soft delete
  await table.updateRow({ ROWID: branchId, status: "INACTIVE" });

  // ✅ AFTER snapshot
  const after = await table.getRow(branchId);

  // ✅ AUDIT: DELETE
  await writeAuditLog(
    req,
    {
      org_id,
      action: "DELETE",
      entity: "branch",
      entity_id: branchId,
      before,
      after,
      extra: { reason: "status_inactive" },
    }
  );

  return after;
};
