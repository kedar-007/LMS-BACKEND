const catalystApp = require("../utils/catalyst");

// -------------------- helpers --------------------
function unwrapZcqlRow(obj) {
  const key = Object.keys(obj || {})[0];
  return key ? obj[key] : null;
}

function ensureRowId(rowId) {
  if (!rowId || !/^\d+$/.test(String(rowId))) throw new Error("Invalid rowId");
  return String(rowId);
}

function escapeZcqlString(value) {
  return String(value).replace(/'/g, "''");
}

function decodeParam(v) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
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

/**
 * normalizePayload:
 * - if you accidentally stored wrapper objects like { name, payload } in configuration
 * - or wrapper key was "Payload" / "PAYLOAD"
 * - always return the inner payload object for your logic
 */
function normalizePayload(configObj) {
  if (!configObj) return {};

  // if configObj is already the usable payload object
  if (configObj && typeof configObj === "object" && !Array.isArray(configObj)) {
    // unwrap payload (case-insensitive)
    const payloadKey =
      Object.keys(configObj).find((k) => k.toLowerCase() === "payload") || null;

    if (payloadKey && configObj[payloadKey] && typeof configObj[payloadKey] === "object") {
      return configObj[payloadKey];
    }
  }

  return configObj;
}

function snippetAround(str, index, radius = 60) {
  const s = String(str || "");
  const start = Math.max(index - radius, 0);
  const end = Math.min(index + radius, s.length);
  return s.slice(start, end);
}

function balanceClosers(str) {
  const s = String(str || "");
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" && stack[stack.length - 1] === "{") stack.pop();
    else if (ch === "]" && stack[stack.length - 1] === "[") stack.pop();
  }

  let out = s;
  while (stack.length) {
    const opener = stack.pop();
    out += opener === "{" ? "}" : "]";
  }
  return out;
}

/**
 * Parses Zoho/Deluge style string:
 * {Guardwel Cabinets=[{name=Guardwel SLD-90, width=1130, lockers=[{label=L1}]}]}
 */
function parseZohoKvFormat(str) {
  const s = String(str || "").trim();
  let i = 0;

  const skip = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  const peek = () => s[i];

  const fail = (msg) => {
    const near = snippetAround(s, i, 80);
    throw new Error(`${msg} at index ${i}. Near: ${near}`);
  };

  const consume = (ch) => {
    if (s[i] !== ch) fail(`Expected '${ch}' but found '${s[i]}'`);
    i++;
  };

  const parseAtom = () => {
    skip();
    const start = i;
    while (i < s.length && ![",", "}", "]"].includes(s[i])) i++;
    const token = s.slice(start, i).trim();

    if (token === "") return "";
    if (token === "null") return null;
    if (token === "true") return true;
    if (token === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
    return token;
  };

  const parseValue = () => {
    skip();
    if (peek() === "{") return parseObject();
    if (peek() === "[") return parseArray();
    return parseAtom();
  };

  // stricter key parse: stop if we hit delimiters before '='
  const parseKey = () => {
    skip();
    const start = i;
    while (i < s.length && s[i] !== "=") {
      if (s[i] === "," || s[i] === "}" || s[i] === "]") {
        const bad = s.slice(start, i).trim();
        fail(`Invalid key=value format (missing '=' for key '${bad}')`);
      }
      i++;
    }
    if (i >= s.length) fail("Invalid key=value format (reached end before '=')");
    return s.slice(start, i).trim();
  };

  const parseObject = () => {
    consume("{");
    skip();
    const obj = {};

    while (i < s.length && peek() !== "}") {
      const key = parseKey();
      consume("=");
      const value = parseValue();
      obj[key] = value;

      skip();
      if (peek() === ",") {
        i++;
        skip();
      }
    }

    if (peek() !== "}") fail("Unclosed object '}' missing");
    consume("}");
    return obj;
  };

  const parseArray = () => {
    consume("[");
    skip();
    const arr = [];

    while (i < s.length && peek() !== "]") {
      arr.push(parseValue());
      skip();
      if (peek() === ",") {
        i++;
        skip();
      }
    }

    if (peek() !== "]") fail("Unclosed array ']' missing");
    consume("]");
    return arr;
  };

  skip();
  const out = parseValue();
  skip();
  return out;
}

/**
 * FINAL: parse configuration TEXT:
 * - JSON object string => JSON.parse
 * - KV string => parseZohoKvFormat (with salvage attempt)
 * - also handles "double-encoded" JSON string
 */
function parseConfiguration(confStr) {
  if (!confStr) return null;

  // 1) JSON first
  const json = safeJsonParse(confStr);
  // console.log("JSON--", json);

  if (json != null) {
    // if accidentally stored as JSON string inside JSON (double encoded)
    if (typeof json === "string") {
      const inner = safeJsonParse(json);
      if (inner && typeof inner === "object") return normalizePayload(inner);

      // if inner is KV
      const trimmed = json.trim();
      if (trimmed.startsWith("{") && trimmed.includes("=")) {
        try {
          return normalizePayload(parseZohoKvFormat(trimmed));
        } catch {
          // continue to fallback below
        }
      }
      return null;
    }

    if (typeof json === "object") return normalizePayload(json);
  }

  // 2) KV format
  const s = String(confStr).trim();
  if (s.startsWith("{") && s.includes("=")) {
    try {
      return normalizePayload(parseZohoKvFormat(s));
    } catch (e) {
      // salvage: trim to last '}' or ']' then balance remaining closers
      const lastClose = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
      if (lastClose > 0) {
        const cut = s.slice(0, lastClose + 1);
        const repaired = balanceClosers(cut);
        try {
          return normalizePayload(parseZohoKvFormat(repaired));
        } catch (e2) {
          const preview = s.slice(0, 250);
          throw new Error(`${e2.message}. Preview: ${preview}`);
        }
      }
      const preview = s.slice(0, 250);
      throw new Error(`${e.message}. Preview: ${preview}`);
    }
  }

  return null;
}

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
  catalystApp(req).datastore().table("lockers").updateRow({ ROWID: req.params.id, ...req.body });

exports.deleteLocker = async (req) =>
  catalystApp(req).datastore().table("lockers").updateRow({ ROWID: req.params.id, status: "inactive" });

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

// -------------------- Industry Lockers --------------------

// ✅ Create: ALWAYS store as proper JSON string going forward
// Also: if frontend accidentally sends wrapper {name, payload} inside payload, normalize it.
exports.createIndustryLocker = async (req) => {
  const { payload, name } = req.body;
  if (!name) throw new Error("name is required");
  if (!payload) throw new Error("payload is required");

  let obj;

  if (typeof payload === "object") {
    obj = normalizePayload(payload);
  } else {
    // string input: could be JSON or KV
    const parsed = parseConfiguration(payload);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Payload is not valid JSON/KV. Preview: ${String(payload).slice(0, 200)}`);
    }
    obj = normalizePayload(parsed);
  }

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("Final payload must be an object (groupName => models[])");
  }

  const configuration = JSON.stringify(obj);

  const row = await catalystApp(req)
    .datastore()
    .table("industry_lockers")
    .insertRow({ name, configuration });

  return { status: "Created", rowId: row.ROWID };
};

// ✅ Step-1: list structures
exports.getIndustryLockers = async (req) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "100", 10), 1), 300);
  const offset = (page - 1) * limit;

  const zcql = catalystApp(req).zcql();
  const query = `SELECT ROWID, name FROM industry_lockers LIMIT ${offset}, ${limit}`;
  const rows = await zcql.executeZCQLQuery(query);

  const items = (rows || [])
    .map(unwrapZcqlRow)
    .filter(Boolean)
    .map((r) => ({ rowId: r.ROWID, name: r.name }));

  return { page, limit, items };
};

// ✅ Step-2: cabinets dropdown (flat + groups)
exports.getIndustryLockerCabinets = async (req) => {
  const rowId = ensureRowId(req.params.rowId);

  const zcql = catalystApp(req).zcql();
  const query = `SELECT ROWID, name, configuration FROM industry_lockers WHERE ROWID = ${rowId}`;
  const rows = await zcql.executeZCQLQuery(query);

  const record = unwrapZcqlRow(rows?.[0]);
  // console.log("RECORD-",record);
  if (!record) throw new Error("Industry locker not found");

  const payload = parseConfiguration(record.configuration);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Invalid configuration stored. Preview: ${String(record.configuration).slice(0, 200)}`);
  }

  const cabinets = [];
  const groups = Object.entries(payload).map(([groupName, models]) => {
    const arr = Array.isArray(models) ? models : [];

    arr.forEach((m) => {
      cabinets.push({
        cabinetName: m?.name,
        groupName,
        width: m?.width,
        height: m?.height,
        depth: m?.depth,
        locker_internal_depth: m?.locker_internal_depth,
        totalLockers: Array.isArray(m?.lockers) ? m.lockers.length : 0,
      });
    });

    return {
      groupName,
      models: arr.map((m) => ({
        name: m?.name,
        width: m?.width,
        height: m?.height,
        depth: m?.depth,
        locker_internal_depth: m?.locker_internal_depth,
        totalLockers: Array.isArray(m?.lockers) ? m.lockers.length : 0,
      })),
    };
  });

  return {
    rowId: record.ROWID,
    industryName: record.name,
    cabinets,
  };
};

// ✅ Step-3: cabinet details by name (no need groupName from UI)
exports.getIndustryLockerCabinetDetails = async (req) => {
  const rowId = ensureRowId(req.params.rowId);
  const modelName = decodeParam(req.params.modelName);

  const zcql = catalystApp(req).zcql();
  const query = `SELECT ROWID, name, configuration FROM industry_lockers WHERE ROWID = ${rowId}`;
  const rows = await zcql.executeZCQLQuery(query);

  const record = unwrapZcqlRow(rows?.[0]);
  if (!record) throw new Error("Industry locker not found");

  const payload = parseConfiguration(record.configuration);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Invalid configuration stored. Preview: ${String(record.configuration).slice(0, 200)}`);
  }

  const equals = (a, b) =>
    String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  let foundGroup = null;
  let foundModel = null;

  for (const [gName, models] of Object.entries(payload)) {
    const arr = Array.isArray(models) ? models : [];
    const match = arr.find((m) => equals(m?.name, modelName));
    if (match) {
      foundGroup = gName;
      foundModel = match;
      break;
    }
  }

  if (!foundModel) throw new Error(`Cabinet not found: ${modelName}`);

  return {
    rowId: record.ROWID,
    industryName: record.name,
    cabinetName: foundModel.name,
    groupName: foundGroup,
    cabinet: foundModel,
    lockers: Array.isArray(foundModel.lockers) ? foundModel.lockers : [],
  };
};
