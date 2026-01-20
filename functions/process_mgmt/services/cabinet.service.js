const catalystApp = require("../utils/catalyst");

/* =====================================================
   CREATE CABINET + LOCKERS
===================================================== */
exports.createCabinetWithLockers = async (req) => {
  const { org_id, branch_id, name, width, height, depth, lockers,locker_internal_depth } = req.body;

  if (
    !org_id ||
    !branch_id ||
    !name ||
    !width ||
    !height ||
    !depth ||
    !Array.isArray(lockers)
  ) {
    throw new Error("Missing required fields");
  }

  console.log("Lockers",lockers);

  const app = catalystApp(req);
  const datastore = app.datastore();

  /* ---------------------------
     1. Create Cabinet
  ---------------------------- */
  const cabinet = await datastore.table("cabinets").insertRow({
    org_id,
    branch_id,
    name,
    width,
    height,
    depth,
    status: "ACTIVE",
  });

  console.log("Cabinet",cabinet);
  const cabinetId = cabinet.ROWID;

  /* ---------------------------
     2. Create Lockers
  ---------------------------- */
  const lockerRows = lockers.map((locker) => {
    if (!locker.label || locker.width == null) {
      throw new Error("Invalid locker data");
    }

    return {
      cabinet_id: cabinetId,
      label: locker.label,
      width: locker.width,
      status: "available",
      book_id: "",
      height:locker.height,
      rowNo:locker.RowNo,
      position:locker.position,
      price:locker.price,
      locker_internal_depth,
      thickness:locker.thickness,
      row_thickness:locker.row_thickness,


    };
  });

  if (lockerRows.length > 0) {
    const resLocker = await datastore.table("lockers").insertRows(lockerRows);

  }

  return {
    cabinet_id: cabinetId,
    lockers_created: lockerRows.length,
  };
};

/* =====================================================
   GET CABINETS BY BRANCH
===================================================== */
exports.getCabinetsByBranch = async (req) => {
  const { branch_id, org_id } = req.query;

  if (!branch_id || !org_id) {
    throw new Error("branch_id and org_id are required");
  }

  const zcql = catalystApp(req).zcql();

  const query = `
    SELECT *
    FROM cabinets
    WHERE branch_id = '${branch_id}'
      AND org_id = '${org_id}'
      AND status = 'ACTIVE'
  `;

  const rows = await zcql.executeZCQLQuery(query);
  return rows.map((r) => r.cabinets);
};

/* =====================================================
   GET CABINET WITH LOCKERS
===================================================== */
exports.getCabinetWithLockers = async (req) => {
  const { cabinet_id } = req.params;
  const { org_id } = req.query;

  if (!cabinet_id || !org_id) {
    throw new Error("cabinet_id and org_id are required");
  }

  const zcql = catalystApp(req).zcql();

  const query = `
    SELECT *
    FROM cabinets
    LEFT JOIN lockers
      ON lockers.cabinet_id = cabinets.ROWID
    WHERE cabinets.ROWID = '${cabinet_id}'
      AND cabinets.org_id = '${org_id}'
      AND cabinets.status = 'ACTIVE'
  `;

  const rows = await zcql.executeZCQLQuery(query);


  if (!rows || rows.length === 0) {
    throw new Error("Cabinet not found");
  }

  // Extract cabinet info from the first row
  const cabinet = {
    id: rows[0].cabinets.ROWID,
    name: rows[0].cabinets.name,
    width: rows[0].cabinets.width,
    height: rows[0].cabinets.height,
    depth: rows[0].cabinets.depth,
    status: rows[0].cabinets.status,
    lockers: []
  };

  let available = 0;
  let booked = 0;

  rows.forEach(row => {
    if (row.lockers && row.lockers.ROWID) {
      cabinet.lockers.push({
        id: row.lockers.ROWID,
        label: row.lockers.label,
        width: row.lockers.width,
        status: row.lockers.status,
        book_id: row.lockers.book_id || "",
        height:row.lockers.height,
        rowNo:row.lockers.rowNo,
        position:row.lockers.position,
        price:row.lockers.price,
        row_thickness:row.lockers.row_thickness,
        locker_internal_depth:row.lockers.locker_internal_depth,
        thickness:row.lockers.thickness,

      });

      if (row.lockers.status === "available") available++;
      if (row.lockers.status === "booked") booked++;
    }
  });

  cabinet.summary = {
    total: cabinet.lockers.length,
    available,
    booked
  };

  return cabinet;
};

/* =====================================================
   UPDATE CABINET
===================================================== */
exports.updateCabinet = async (req) => {
  const { id } = req.params;
  if (!id) throw new Error("Cabinet ID is required");

  return catalystApp(req)
    .datastore()
    .table("cabinets")
    .updateRow({
      ROWID: id,
      ...req.body,
    });
};

/* =====================================================
   SOFT DELETE CABINET
===================================================== */
exports.deleteCabinet = async (req) => {
  const { id } = req.params;
  if (!id) throw new Error("Cabinet ID is required");

  return catalystApp(req).datastore().table("cabinets").updateRow({
    ROWID: id,
    status: "INACTIVE",
  });
};
