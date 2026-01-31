const catalystApp = require("../utils/catalyst");
const { writeAuditLog } = require("../utils/auditLogger");

// -------------------------
// UTILITY – normalize datetime
// -------------------------
const normalizeDateTime = (value) =>
    new Date(value).toISOString().replace("T", " ").split(".")[0];

// -------------------------
// CREATE
// -------------------------
exports.createAnnouncement = async (req) => {
    const { orgId } = req.params;
    const { title, message, type, start_at, end_at } = req.body;

    if (!title || !message || !start_at || !end_at) {
        throw new Error("Missing required fields");
    }

    const payload = {
        org_id: orgId,
        title,
        message,
        type,
        start_at: normalizeDateTime(start_at),
        end_at: normalizeDateTime(end_at),
        status: "ACTIVE" // ✅ ALWAYS ACTIVE ON CREATE
    };

    const created = await catalystApp(req)
        .datastore()
        .table("announcements")
        .insertRow(payload);

    // AUDIT LOG
    await writeAuditLog(req, {
        org_id: orgId,
        action: "CREATE",
        entity: "announcement",
        entity_id: created?.ROWID || "",
        after: created
    });

    return created;
};

// -------------------------
// READ (ALL – ORG)
// -------------------------
exports.getAnnouncements = async (req) => {
    const { orgId } = req.params;

    const result = await catalystApp(req)
        .zcql()
        .executeZCQLQuery(`
      SELECT * FROM announcements
      WHERE org_id='${orgId}'
      AND status != 'DELETED'
      ORDER BY CREATEDTIME DESC
    `);

    return result.map(r => r.announcements);
};

// -------------------------
// READ (ACTIVE + VALID TIMELINE ONLY)
// -------------------------
exports.getActiveAnnouncements = async (req) => {
    const { orgId } = req.params;

    console.log("🔔 getActiveAnnouncements CALLED");
    console.log("➡️ orgId:", orgId);

    // 1️⃣ Fetch ACTIVE announcements only
    const result = await catalystApp(req)
        .zcql()
        .executeZCQLQuery(`
        SELECT * FROM announcements
        WHERE org_id='${orgId}'
        AND status='ACTIVE'
        ORDER BY start_at DESC
      `);

    console.log("📦 RAW ZCQL RESULT:", JSON.stringify(result, null, 2));

    const rows = result.map(r => r.announcements);
    console.log("📄 ROWS:", rows);

    // 2️⃣ Current time (Catalyst runtime – UTC)
    const now = new Date();
    console.log("⏰ NOW (UTC):", now.toISOString(), now.getTime());

    // 3️⃣ Filter with FULL logs
    const activeTimelineAnnouncements = rows.filter((a, index) => {
        console.log(`\n🔍 CHECKING ROW #${index + 1}`);
        console.log("🆔 ROWID:", a.ROWID);
        console.log("📅 start_at (raw):", a.start_at);
        console.log("📅 end_at   (raw):", a.end_at);

        // Split start date
        const [sDate, sTime] = a.start_at.split(" ");
        const [sy, sm, sd] = sDate.split("-").map(Number);
        const [sh, smin, ss] = sTime.split(":").map(Number);

        // Split end date
        const [eDate, eTime] = a.end_at.split(" ");
        const [ey, em, ed] = eDate.split("-").map(Number);
        const [eh, emin, es] = eTime.split(":").map(Number);

        console.log("📐 Parsed START:", { sy, sm, sd, sh, smin, ss });
        console.log("📐 Parsed END  :", { ey, em, ed, eh, emin, es });

        // IST → UTC conversion
        const startAt = new Date(Date.UTC(sy, sm - 1, sd, sh - 5, smin - 30, ss));
        const endAt = new Date(Date.UTC(ey, em - 1, ed, eh - 5, emin - 30, es));

        console.log("🌍 startAt UTC:", startAt.toISOString(), startAt.getTime());
        console.log("🌍 endAt   UTC:", endAt.toISOString(), endAt.getTime());

        const isActive = startAt <= now && endAt >= now;
        console.log("✅ IS ACTIVE?", isActive);

        return isActive;
    });

    console.log("\n🎯 FINAL FILTERED RESULT:", activeTimelineAnnouncements);

    return activeTimelineAnnouncements;
};



// -------------------------
// READ SINGLE
// -------------------------
exports.getAnnouncementById = async (req) => {
    const { orgId, announcementId } = req.params;

    const row = await catalystApp(req)
        .datastore()
        .table("announcements")
        .getRow(announcementId);

    if (!row || row.org_id !== orgId || row.status === "DELETED") {
        throw new Error("Announcement not found");
    }

    return row;
};

// -------------------------
// UPDATE
// -------------------------
exports.updateAnnouncement = async (req) => {
    const { orgId, announcementId } = req.params;
    console.log("Announcement id",announcementId);

    const table = catalystApp(req).datastore().table("announcements");
    const zcql = catalystApp(req).zcql();
    const querry = `SELECT *FROM announcements WHERE ROWID = ${announcementId}`
    const existing = await table.getRow(announcementId);
    // console.log("Existing announcement",existing);

    if (!existing || existing.status === "DELETED") {
        throw new Error("Announcement not found");
    }

    const updatedPayload = {
        ...req.body
    };

    // Normalize dates if passed
    if (updatedPayload.start_at) {
        updatedPayload.start_at = normalizeDateTime(updatedPayload.start_at);
    }
    if (updatedPayload.end_at) {
        updatedPayload.end_at = normalizeDateTime(updatedPayload.end_at);
    }

    const updated = await table.updateRow({
        ROWID: announcementId,
        ...updatedPayload
    });

    // AUDIT LOG
    await writeAuditLog(req, {
        org_id: orgId,
        action: "UPDATE",
        entity: "announcement",
        entity_id: announcementId,
        before: existing,
        after: updated
    });

    return updated;
};

// -------------------------
// DELETE (SOFT)
// -------------------------
exports.deleteAnnouncement = async (req) => {
    const { orgId, announcementId } = req.params;

    const table = catalystApp(req).datastore().table("announcements");
    const existing = await table.getRow(announcementId);

    if (!existing) {
        throw new Error("Announcement not found");
    }

    const deleted = await table.updateRow({
        ROWID: announcementId,
        status: "DELETED",
    });

    // AUDIT LOG
    await writeAuditLog(req, {
        org_id: orgId,
        action: "DELETE",
        entity: "announcement",
        entity_id: announcementId,
        before: existing
    });

    return deleted;
};
