// services/locker.service.js
const catalystApp = require("../utils/catalyst");
const zlib = require("zlib");

/* -------------------- helpers -------------------- */

function ensureRowId(rowId) {
  if (!rowId || !/^\d+$/.test(String(rowId))) throw new Error("Invalid rowId");
  return String(rowId);
}

function safeJsonParse(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function normalizePayload(configObj) {
  if (!configObj) return null;
  if (typeof configObj === "object" && !Array.isArray(configObj)) {
    const key = Object.keys(configObj).find(
      (k) => k.toLowerCase() === "payload"
    );
    return key ? configObj[key] : configObj;
  }
  return null;
}

function encodeGzJson(obj) {
  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(obj), "utf8"));
  return "gz:" + gz.toString("base64");
}

function tryDecodeGzJson(str) {
  if (typeof str !== "string") return null;
  if (!str.startsWith("gz:")) return null;
  const buf = Buffer.from(str.slice(3), "base64");
  const json = zlib.gunzipSync(buf).toString("utf8");
  return JSON.parse(json);
}

function parseConfiguration(raw) {
  if (!raw) return null;
  const gz = tryDecodeGzJson(raw);
  if (gz) return gz;
  return safeJsonParse(raw);
}

function isTruncatedJsonString(raw) {
  const t = String(raw || "").trim();
  if (!t) return false;
  return (
    (t.startsWith("{") || t.startsWith("[")) &&
    !(t.endsWith("}") || t.endsWith("]"))
  );
}

function toStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toInt(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getRowId(row) {
  return String(row?.ROWID ?? "");
}

/** Catalyst ZCQL unwrap */
function unwrapZcqlRow(obj) {
  const key = Object.keys(obj || {})[0];
  return key ? obj[key] : null;
}

function chunkArray(arr, size = 100) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function insertLockersBatch(lockerTable, rows) {
  if (!rows.length) return [];
  if (typeof lockerTable.insertRows === "function") {
    const res = await lockerTable.insertRows(rows);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.rows)) return res.rows;
    return [];
  }

  const out = [];
  for (const r of rows) out.push(await lockerTable.insertRow(r));
  return out;
}

/* ------------------------------------------------ */
/* OPTION A: create cabinets first, then lockers     */
/* ------------------------------------------------ */

async function createCabinetsAndLockers(req, payload, industryName) {
  const ds = catalystApp(req).datastore();
  const cabinetTable = ds.table("cabinets");
  const lockerTable = ds.table("lockers");

  const cabinetIds = [];
  let totalLockersCreated = 0;

  console.log("==============================================");
  console.log("🚀 OPTION A START");
  console.log("🏭 industryName:", industryName);
  console.log("🧩 groups:", Object.keys(payload || {}));
  console.log("==============================================");

  for (const [groupName, models] of Object.entries(payload || {})) {
    if (!Array.isArray(models)) continue;

    console.log("----------------------------------------------");
    console.log(`📁 GROUP: "${groupName}" | cabinets=${models.length}`);
    console.log("----------------------------------------------");

    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];

      console.log("");
      console.log(`🗄️  Creating Cabinet: "${model?.name}" (index=${idx})`);

      if (!model?.name) {
        console.log("⚠️ skipped: model.name missing");
        continue;
      }

      // ✅ CABINET schema EXACT (your schema)
      const cabinetInsertPayload = {
        name: toStr(model.name),
        width: toStr(model.width),
        height: toStr(model.height),
        depth: toStr(model.depth),
        status: toStr(model.status) || "STANDARD",
        org_id: null,
        branch_id: null,
      };

      console.log("   🧾 cabinet insert payload:", cabinetInsertPayload);

      const cabinetRow = await cabinetTable.insertRow(cabinetInsertPayload);
      const cabinetId = getRowId(cabinetRow);

      if (!cabinetId) throw new Error("Cabinet insert returned no ROWID");

      cabinetIds.push(cabinetId);
      console.log(`✅ Cabinet created: cabinetId=${cabinetId}`);

      // ✅ LOCKERS schema EXACT (your schema)
      const lockers = Array.isArray(model.lockers) ? model.lockers : [];
      const modelLockerDepth = toNum(model?.locker_internal_depth); // comes from cabinet level
      console.log(
        `🔐 inserting lockers for cabinetId=${cabinetId} count=${lockers.length}`
      );
      console.log(`   📏 model locker_internal_depth =`, modelLockerDepth);

      const lockerRows = lockers.map((l, i) => {
        // ✅ FIX: If locker doesn't carry locker_internal_depth, inherit from model
        const resolvedDepth =
          toNum(l?.locker_internal_depth) != null
            ? toNum(l?.locker_internal_depth)
            : modelLockerDepth;

        if (i === 0) {
          console.log("   🧪 sample locker depth resolve:", {
            lockerProvided: l?.locker_internal_depth,
            modelProvided: model?.locker_internal_depth,
            finalUsed: resolvedDepth,
          });
        }

        return {
          cabinet_id: cabinetId,
          status: toStr(l?.status) || null,
          book_id: toStr(l?.book_id) || null,
          label: toStr(l?.label) || null,
          width: toNum(l?.width),
          height: toNum(l?.height),
          rowNo: toInt(l?.RowNo ?? l?.rowNo),
          position: toInt(l?.position),
          price: toInt(l?.price),
          locker_internal_depth: resolvedDepth, // ✅ FIXED
          row_thickness: toNum(l?.row_thickness),
          thickness: toNum(l?.thickness),
        };
      });

      const chunks = chunkArray(lockerRows, 100);
      let insertedCount = 0;

      for (let c = 0; c < chunks.length; c++) {
        console.log(
          `   📦 lockers chunk ${c + 1}/${chunks.length} size=${
            chunks[c].length
          }`
        );
        const inserted = await insertLockersBatch(lockerTable, chunks[c]);
        insertedCount += inserted.length;
      }

      totalLockersCreated += insertedCount;
      console.log(
        `✅ Lockers inserted for cabinetId=${cabinetId} inserted=${insertedCount}`
      );
    }
  }

  console.log("==============================================");
  console.log("✅ OPTION A DONE");
  console.log("🗄️ cabinetsCreated:", cabinetIds.length);
  console.log("🔐 lockersCreated :", totalLockersCreated);
  console.log("==============================================");

  return { cabinetIds, totalLockersCreated };
}

/* ------------------------------------------------ */
/* STEP-0: Create industry lockers structure         */
/* ------------------------------------------------ */

exports.createIndustryLocker = async (req) => {
  const { payload, name, storeCompressed } = req.body;

  console.log("\n================ createIndustryLocker ================");
  console.log("name:", name);
  console.log("storeCompressed:", !!storeCompressed);
  console.log("payloadType:", typeof payload);
  console.log("======================================================\n");

  if (!name) throw new Error("name is required");
  if (!payload) throw new Error("payload is required");

  const parsed =
    typeof payload === "object" ? payload : parseConfiguration(payload);
  const normalized = normalizePayload(parsed);

  if (
    !normalized ||
    typeof normalized !== "object" ||
    Array.isArray(normalized)
  ) {
    throw new Error(
      "Payload must be object like { groupName: [cabinets...] } or { payload: {...} }"
    );
  }

  console.log("✅ Parsed payload groups:", Object.keys(normalized));

  // 1) Create cabinets + lockers first
  const { cabinetIds, totalLockersCreated } = await createCabinetsAndLockers(
    req,
    normalized,
    name
  );

  // 2) Save cabinetIds in industry_lockers configuration
  const configObj = {
    industryName: name,
    cabinetIds,
    createdAt: new Date().toISOString(),
  };

  const configuration = storeCompressed
    ? encodeGzJson(configObj)
    : JSON.stringify(configObj);

  console.log("🧾 saving industry_lockers row");
  console.log("   configObj:", configObj);
  console.log("   configLen:", configuration.length);

  const row = await catalystApp(req)
    .datastore()
    .table("industry_lockers")
    .insertRow({ name, configuration });

  return {
    status: "Created",
    rowId: row.ROWID,
    cabinetsCreated: cabinetIds.length,
    lockersCreated: totalLockersCreated,
    cabinetIds,
  };
};

/* ------------------------------------------------ */
/* STEP-1: List all Industry Lockers (dropdown)      */
/* ------------------------------------------------ */

exports.getIndustryLockers = async (req) => {
  const ds = catalystApp(req).datastore();
  const zcql = catalystApp(req).zcql();

  console.log("🔥 getIndustryLockers (dropdown)");
  const rows = await zcql.executeZCQLQuery(
    `SELECT ROWID, name ,logo_url FROM industry_lockers ORDER BY ROWID DESC`
  );

  console.log("ROWS---", rows);

  const result = (rows || []).map((r) => {
    const row = unwrapZcqlRow(r) || {};
    return { rowId: String(row.ROWID), name: row.name, logo_url: row.logo_url };
  });

  console.log("✅ industry lockers count:", result.length);
  return result;
};

/* ------------------------------------------------ */
/* STEP-2: Cabinets for selected Industry Locker     */
/* ------------------------------------------------ */

exports.getIndustryLockerCabinets = async (req) => {
  const rowId = ensureRowId(req.params.rowId);
  const app = catalystApp(req);
  const ds = app.datastore();
  const zcql = app.zcql();

  console.log("🔥 getIndustryLockerCabinets rowId =", rowId);

  // 1️⃣ Fetch industry record
  const record = await ds.table("industry_lockers").getRow(rowId);

  const rawConfig = String(record?.configuration || "");
  if (isTruncatedJsonString(rawConfig)) {
    throw new Error("Configuration truncated. Use CLOB / Large Text.");
  }

  const config = parseConfiguration(rawConfig);
  const cabinetIds = Array.isArray(config?.cabinetIds)
    ? config.cabinetIds.map((id) => String(id).trim())
    : [];

  // console.log("📦 Cabinet IDs from config:", cabinetIds);

  if (!cabinetIds.length) {
    return {
      rowId,
      industryName: record?.name,
      cabinets: [],
    };
  }

  // Fetch cabinets safely (NO IN)
  const cabinets = [];
  const foundIds = new Set();

  for (const cabinetId of cabinetIds) {
    if (!/^\d+$/.test(cabinetId)) {
      console.warn("⚠️ Invalid cabinet ID skipped:", cabinetId);
      continue;
    }

    const query = `
      SELECT ROWID, name, width, height, depth
      FROM cabinets
      WHERE ROWID = ${cabinetId}
    `;

    const res = await zcql.executeZCQLQuery(query);

    if (!res || !res.length) {
      console.warn("❌ Cabinet not found for ID:", cabinetId);
      continue;
    }

    const cab = unwrapZcqlRow(res[0]);
    foundIds.add(cabinetId);

    cabinets.push({
      cabinetId: String(cab.ROWID),
      cabinetName: cab.name,
      width: cab.width,
      height: cab.height,
      depth: cab.depth,
    });
  }

  console.log(`✅ Cabinets fetched: ${cabinets.length}/${cabinetIds.length}`);

  // 3️⃣ Fetch locker counts (NO IN, NO N+1)
  const lockerCounts = {};

  for (const c of cabinets) {
    const countQuery = `
      SELECT COUNT(ROWID) AS cnt
      FROM lockers
      WHERE cabinet_id = ${c.cabinetId}
    `;

    const res = await zcql.executeZCQLQuery(countQuery);
    const row = unwrapZcqlRow(res?.[0]) || {};

    lockerCounts[c.cabinetId] = Number(row.cnt || 0);
  }

  // 4️⃣ Attach locker counts
  cabinets.forEach((c) => {
    c.totalLockers = lockerCounts[c.cabinetId] || 0;
  });

  // 5️⃣ Log missing cabinets
  const missingCabinets = cabinetIds.filter((id) => !foundIds.has(id));
  if (missingCabinets.length) {
    console.warn("🚨 Missing cabinet IDs:", missingCabinets);
  }

  return {
    rowId,
    industryName: record?.name,
    cabinets,
  };
};

/* ------------------------------------------------ */
/* STEP-3: Cabinet Details + Lockers by cabinetId    */
/* ------------------------------------------------ */

exports.getIndustryLockerCabinetDetails = async (req) => {
  const rowId = ensureRowId(req.params.rowId);
  const cabinetId = ensureRowId(req.params.cabinetId); // ✅ cabinetId from route

  const ds = catalystApp(req).datastore();
  const zcql = catalystApp(req).zcql();

  // console.log(
  //   "🔥 getIndustryLockerCabinetDetails rowId=",
  //   rowId,
  //   "cabinetId=",
  //   cabinetId
  // );

  // 1) read industry_lockers config
  const record = await ds.table("industry_lockers").getRow(rowId);
  const raw = String(record?.configuration || "");

  console.log("   configLen=", raw.length);
  if (isTruncatedJsonString(raw))
    throw new Error("Configuration truncated. Use CLOB/Large Text.");

  const config = parseConfiguration(raw);
  const cabinetIds = Array.isArray(config?.cabinetIds)
    ? config.cabinetIds.map(String)
    : [];

  console.log("   linked cabinetIds count=", cabinetIds.length);

  // 2) validate cabinetId belongs to this industry locker
  if (!cabinetIds.includes(String(cabinetId))) {
    throw new Error(
      `This cabinetId=${cabinetId} is not linked to industry rowId=${rowId}`
    );
  }

  // 3) fetch cabinet
  const qCab = `SELECT ROWID, name, width, height, depth FROM cabinets WHERE ROWID = ${Number(
    cabinetId
  )}`;
  console.log("   🧾 ZCQL cabinet:", qCab);

  const cabRows = await zcql.executeZCQLQuery(qCab);
  const cab = unwrapZcqlRow(cabRows?.[0]) || null;
  if (!cab) throw new Error(`Cabinet not found for cabinetId=${cabinetId}`);

  // 4) fetch lockers for this cabinet
  const qLockers = `SELECT * FROM lockers WHERE cabinet_id = ${Number(
    cabinetId
  )} ORDER BY rowNo, position`;
  console.log("   🧾 ZCQL lockers:", qLockers);

  const lockerRows = await zcql.executeZCQLQuery(qLockers);

  const lockers = (lockerRows || []).map((r) => {
    const l = unwrapZcqlRow(r) || {};
    return {
      lockerId: String(l.ROWID),
      cabinet_id: String(l.cabinet_id),
      label: l.label,
      width: l.width,
      height: l.height,
      rowNo: l.rowNo,
      position: l.position,
      price: l.price,
      locker_internal_depth: l.locker_internal_depth,
      row_thickness: l.row_thickness,
      thickness: l.thickness,
      status: l.status,
      book_id: l.book_id,
    };
  });

  console.log("✅ cabinet fetched:", cab?.name);
  console.log("✅ lockers fetched:", lockers.length);

  return {
    rowId,
    industryName: record?.name,
    cabinet: {
      cabinetId: String(cab.ROWID),
      name: cab.name,
      width: cab.width,
      height: cab.height,
      depth: cab.depth,
    },
    lockers,
  };
};

/* ------------------------------------------------ */
/* Normal lockers methods (keep your existing ones)  */
/* ------------------------------------------------ */
// NOTE: keep your existing createLocker/getLockersByCabinet/getLockerById/updateLocker/deleteLocker/bookLocker below
// exports.createLocker = async (req) => { ... }

// -------------------- Normal Lockers --------------------
exports.createLocker = async (req) => {
  const { cabinet_id, label, height, width } = req.body;
  if (!cabinet_id || !label) throw new Error("Missing fields");

  return catalystApp(req)
    .datastore()
    .table("lockers")
    .insertRow({ cabinet_id, label, height, width, status: "available" });
};

exports.getLockersByCabinet = async (req) => {
  const cabinetId = req.query.cabinet_id;
  if (!cabinetId) throw new Error("cabinet_id is required");

  const zcql = catalystApp(req).zcql();
  const safeCabinetId = escapeZcqlString(cabinetId);

  const query = `
    SELECT ROWID, cabinet_id, label, height, width, status, booking_id
    FROM lockers
    WHERE cabinet_id = '${safeCabinetId}'
      AND (status IS NULL OR status != 'inactive')
    LIMIT 0, 300
  `;

  const rows = await zcql.executeZCQLQuery(query);
  return (rows || []).map(unwrapZcqlRow).filter(Boolean);
};

exports.getLockerById = async (req) =>
  catalystApp(req).datastore().table("lockers").getRow(req.params.id);

exports.updateLocker = async (req) =>
  catalystApp(req)
    .datastore()
    .table("lockers")
    .updateRow({ ROWID: req.params.id, ...req.body });

exports.deleteLocker = async (req) =>
  catalystApp(req)
    .datastore()
    .table("lockers")
    .updateRow({ ROWID: req.params.id, status: "inactive" });

exports.bookLocker = async (req) => {
  const { lockerId } = req.params;
  const { booking_id } = req.body;
  if (!booking_id) throw new Error("booking_id is required");

  await catalystApp(req)
    .datastore()
    .table("lockers")
    .updateRow({ ROWID: lockerId, status: "booked", booking_id });

  return { lockerId, status: "booked" };
};
