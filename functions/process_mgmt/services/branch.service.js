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
exports.getBranchesWithCounts = async (req) => {
  const zcql = catalystApp(req).zcql();

  const orgId = Number(req.query.org_id);
  if (!Number.isFinite(orgId)) {
    throw new Error("Valid org_id is required");
  }

  // helpers
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const esc = (val) => String(val).replace(/'/g, "''");

  // 1) Fetch branches
  const branchRows = await zcql.executeZCQLQuery(`
    SELECT ROWID, name
    FROM branches
    WHERE org_id = ${orgId}
  `);

  const branches = branchRows.map((r) => r.branches).filter(Boolean);

  // build branchMap like your original logic
  const branchMap = new Map();
  for (const b of branches) {
    if (!b?.ROWID) continue;
    branchMap.set(b.ROWID, {
      id: b.ROWID,
      name: b.name,
      cabinets: new Set(),
      lockers: 0,
      available: 0,
      booked: 0,
    });
  }

  if (branchMap.size === 0) return [];

  const branchIds = Array.from(branchMap.keys()).map((id) => `'${esc(id)}'`);

  // 2) Fetch cabinets for those branches (branch_id is VARCHAR)
  const cabinetToBranch = new Map(); // cabinetRowId -> branchRowId
  const cabinetIds = [];

  for (const ids of chunk(branchIds, 200)) {
    const cabRows = await zcql.executeZCQLQuery(`
      SELECT ROWID, branch_id
      FROM cabinets
      WHERE branch_id IN (${ids.join(",")})
    `);

    for (const row of cabRows) {
      const c = row.cabinets;
      if (!c?.ROWID) continue;

      cabinetIds.push(`'${esc(c.ROWID)}'`);
      cabinetToBranch.set(c.ROWID, c.branch_id);

      const bm = branchMap.get(c.branch_id);
      if (bm) bm.cabinets.add(c.ROWID);
    }
  }

  // 3) Fetch lockers for those cabinets and aggregate counts per branch
  if (cabinetIds.length) {
    for (const ids of chunk(cabinetIds, 200)) {
      const lockRows = await zcql.executeZCQLQuery(`
        SELECT ROWID, cabinet_id, status
        FROM lockers
        WHERE cabinet_id IN (${ids.join(",")})
      `);

      for (const row of lockRows) {
        const l = row.lockers;
        if (!l?.ROWID) continue;

        const branchId = cabinetToBranch.get(l.cabinet_id);
        if (!branchId) continue;

        const bm = branchMap.get(branchId);
        if (!bm) continue;

        bm.lockers++;
        if (l.status === "available") bm.available++;
        else if (l.status === "booked") bm.booked++;
      }
    }
  }

  // final output (same shape as your return)
  return Array.from(branchMap.values()).map((b) => ({
    id: b.id,
    name: b.name,
    cabinets: b.cabinets.size,
    lockers: b.lockers,
    available: b.available,
    booked: b.booked,
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
