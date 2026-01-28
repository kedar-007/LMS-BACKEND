/* ===============================
   Date Utilities (IST SAFE)
================================*/

// YYYY-MM-DD HH:mm:ss
function isValidDateTimeFormat(value) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
}

// Current IST datetime string
function getCurrentISTDateTimeString() {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(
      now.getUTCDate()
    )} ` +
    `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(
      now.getUTCSeconds()
    )}`
  );
}

/* ===============================
   AUDIT LOGGER ✅
================================ */
const { writeAuditLog } = require("../utils/auditLogger"); // ✅ add this

/* ===============================
   EMAIL HELPERS
================================ */

async function sendMail(catalystApp, { to, subject, html }) {
  const email = catalystApp.email();

  const config = {
    from_email: "catalystadmin@dsv360.ai", // MUST be verified in console
    to_email: [to],
    subject,
    content: html,
    html_mode: true,
  };

  return await email.sendMail(config);
}

/* ===============================
   EMAIL TEMPLATES
================================ */

function lockerBookingEmail(data) {
  return `<div style="font-family:Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:20px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.08); overflow:hidden;">

<div style="background:#1d4ed8; color:#ffffff; padding:20px; text-align:center;">
  <h2 style="margin:0;">🔐 Booking Confirmed</h2>
  <p style="margin:8px 0 0; font-size:14px;">
    Your locker has been successfully reserved
  </p>
</div>

<div style="padding:24px;">
  <p style="font-size:15px; color:#333;">
    Hello <strong>${data.name}</strong>,
  </p>

  <p style="font-size:14px; color:#555;">
    We’re happy to let you know that <strong>your locker booking is confirmed</strong>.
    Below are the details of your reservation:
  </p>

  <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse:collapse; font-size:14px; margin-top:16px;">
    <tr style="background:#f1f5f9;">
      <td style="border:1px solid #e5e7eb;"><strong>Organization</strong></td>
      <td style="border:1px solid #e5e7eb;">${data.org}</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;"><strong>Branch</strong></td>
      <td style="border:1px solid #e5e7eb;">${data.branch}</td>
    </tr>
    <tr style="background:#f1f5f9;">
      <td style="border:1px solid #e5e7eb;"><strong>Cabinet</strong></td>
      <td style="border:1px solid #e5e7eb;">${data.cabinet}</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;"><strong>Locker Number</strong></td>
      <td style="border:1px solid #e5e7eb;">${data.locker}</td>
    </tr>
    <tr style="background:#f1f5f9;">
      <td style="border:1px solid #e5e7eb;"><strong>Start Date</strong></td>
      <td style="border:1px solid #e5e7eb;">${data.start}</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;"><strong>End Date</strong></td>
      <td style="border:1px solid #e5e7eb;">${data.end}</td>
    </tr>
    <tr style="background:#f1f5f9;">
      <td style="border:1px solid #e5e7eb;"><strong>Duration</strong></td>
      <td style="border:1px solid #e5e7eb;">${data.months} Month(s)</td>
    </tr>
  </table>

  <p style="margin-top:20px; font-size:14px; color:#555;">
    Please keep this email for your records. If you have any questions or need assistance,
    feel free to contact our support team.
  </p>

  <p style="margin-top:24px; font-size:14px; color:#333;">
    Thank you for choosing our <strong>Locker Management System</strong>.
  </p>

  <p style="font-size:14px; color:#333;">
    Best regards,<br>
    <strong>Locker Management Team</strong>
  </p>
</div>

<div style="background:#f8fafc; text-align:center; padding:12px; font-size:12px; color:#6b7280;">
  © ${new Date().getFullYear()} Locker Management System. All rights reserved.
</div>

  </div>
</div>

  `;
}

function appointmentEmail(data) {
  return `
    <div style="font-family:Arial;max-width:600px;margin:auto">
      <h2 style="color:#1d4ed8">📅 Locker Visit Scheduled</h2>
  
      <p>Hello <b>${data.name}</b>,</p>
  
      <ul>
        <li><b>Organization:</b> ${data.org}</li>
        <li><b>Branch:</b> ${data.branch}</li>
        <li><b>Cabinet:</b> ${data.cabinet}</li>
        <li><b>Locker:</b> ${data.locker}</li>
        <li><b>Visit Time:</b> ${data.time}</li>
        <li><b>Visit Key:</b> ${data.key}</li>
      </ul>
  
      <p>Please carry this visit key during your visit.</p>
    </div>`;
}

class CustomerService {
  /* ===============================
           GET ALL BRANCHES
        ================================*/
  static async getBranches(req) {
    const zcql = req.catalystApp.zcql();
    const orgId = req.query.orgId;

    if (!orgId) throw new Error("orgId is required");

    const query = `
          SELECT *
          FROM branches
          WHERE org_id = '${orgId}'
        `;

    const rows = await zcql.executeZCQLQuery(query);

    return rows.map((r) => ({
      ROWID: r.branches.ROWID,
      branch_code: r.branches.branch_code,
      name: r.branches.name,
      address: r.branches.address,
      status: r.branches.status,
    }));
  }

  /* ===============================
           GET BRANCH DETAILS
        ================================*/
  static async getBranchDetails(req) {
    try {
      const zcql = req.catalystApp.zcql();
      const { orgId } = req.query;
      const { branchId } = req.params;

      if (!orgId || !branchId) {
        throw new Error("orgId and branchId are required");
      }

      /* ---------- Branch ---------- */
      const branchQuery = `
            SELECT *
            FROM branches
            WHERE ROWID = '${branchId}'
              AND org_id = '${orgId}'
              AND status = 'ACTIVE'
          `;
      const branchRows = await zcql.executeZCQLQuery(branchQuery);
      if (!branchRows.length) throw new Error("Branch not found");

      const b = branchRows[0].branches;

      const branch = {
        id: b.ROWID,
        name: b.name,
        status: b.status,
        cabinets: [],
        summary: { cabinets: 0, lockers: 0, available: 0, booked: 0 },
      };

      /* ---------- Cabinets ---------- */
      const cabinetRows = await zcql.executeZCQLQuery(`
            SELECT *
            FROM cabinets
            WHERE branch_id = '${branchId}'
              AND status = 'ACTIVE'
          `);

      if (!cabinetRows.length) return branch;

      const cabinetMap = new Map();
      const cabinetIds = [];

      for (const row of cabinetRows) {
        const c = row.cabinets;
        cabinetMap.set(c.ROWID, {
          id: c.ROWID,
          name: c.name,
          width: c.width,
          height: c.height,
          depth: c.depth,
          status: c.status,
          lockers: [],
          summary: { total: 0, available: 0, booked: 0 },
        });
        cabinetIds.push(c.ROWID);
      }

      branch.summary.cabinets = cabinetMap.size;

      /* ---------- Lockers ---------- */
      const lockerRows = await zcql.executeZCQLQuery(`
            SELECT *
            FROM lockers
            WHERE cabinet_id IN (${cabinetIds.map((id) => `'${id}'`).join(",")})
          `);

      for (const row of lockerRows) {
        const l = row.lockers;
        const cabinet = cabinetMap.get(l.cabinet_id);
        if (!cabinet) continue;

        cabinet.lockers.push({
          id: l.ROWID,
          label: l.label,
          width: l.width,
          height: l.height,
          rowNo: l.rowNo,
          position: l.position,
          status: l.status,
          book_id: l.book_id || "",
          price: l.price,
        });

        cabinet.summary.total++;
        branch.summary.lockers++;

        if (l.status === "available") {
          cabinet.summary.available++;
          branch.summary.available++;
        } else if (l.status === "booked") {
          cabinet.summary.booked++;
          branch.summary.booked++;
        }
      }

      branch.cabinets = Array.from(cabinetMap.values());
      return branch;
    } catch (err) {
      console.error("getBranchDetails error:", err);
      throw err;
    }
  }

  /* ===============================
           BOOK LOCKER WITH EMAIL ✅ + AUDIT
        ================================*/
  static async bookLocker(req) {
    try {
      const zcql = req.catalystApp.zcql();
      const datastore = req.catalystApp.datastore();
      const user = await req.catalystApp.userManagement().getCurrentUser();

      let {
        org_id,
        branch_id,
        cabinet_id,
        locker_id,
        start_time,
        end_time,
        months,
        payment_id,
        customer_id,
      } = req.body;

      if (
        !org_id ||
        !branch_id ||
        !cabinet_id ||
        !locker_id ||
        !start_time ||
        !end_time
      ) {
        throw new Error("Missing required fields");
      }

      if (
        !isValidDateTimeFormat(start_time) ||
        !isValidDateTimeFormat(end_time)
      ) {
        throw new Error("Invalid datetime format (YYYY-MM-DD HH:mm:ss)");
      }

      const nowIST = getCurrentISTDateTimeString();
      if (start_time < nowIST) start_time = nowIST;
      if (start_time >= end_time) {
        throw new Error("Invalid date range");
      }

      // ✅ BEFORE snapshot of locker (for audit)
      const lockerBefore = await datastore.table("lockers").getRow(String(locker_id));

      const lockerCheck = await zcql.executeZCQLQuery(`
        SELECT * FROM lockers
        WHERE ROWID='${locker_id}' AND status='available'
      `);

      if (!lockerCheck.length) {
        return {
          success: false,
          availableFlag: false,
          message: "Locker is not available",
        };
      }

      const overlap = await zcql.executeZCQLQuery(`
        SELECT * FROM bookings
        WHERE locker_id='${locker_id}'
          AND status='ACTIVE'
          AND start_date < '${end_time}'
          AND end_date > '${start_time}'
      `);

      if (overlap.length) {
        return {
          success: false,
          book: true,
          message: "Locker already booked",
        };
      }

      const rowData = {
        org_id,
        branch_id,
        locker_id,
        customer_id,
        start_date: start_time,
        end_date: end_time,
        months,
        payment_id,
        status: "ACTIVE",
        auth_user_id: user.user_id,
      };

      const booking = await datastore.table("bookings").insertRow(rowData);

      await datastore.table("lockers").updateRow({
        ROWID: locker_id,
        status: "booked",
        book_id: booking.ROWID,
      });

      // ✅ AFTER snapshot of locker (for audit)
      const lockerAfter = await datastore.table("lockers").getRow(String(locker_id));

      const [orgRes, branchRes, cabinetRes, lockerRes] = await Promise.all([
        zcql.executeZCQLQuery(
          `SELECT * FROM organizations WHERE orgId='${org_id}'`
        ),
        zcql.executeZCQLQuery(
          `SELECT * FROM branches WHERE ROWID='${branch_id}'`
        ),
        zcql.executeZCQLQuery(
          `SELECT * FROM cabinets WHERE ROWID='${cabinet_id}'`
        ),
        zcql.executeZCQLQuery(
          `SELECT * FROM lockers WHERE ROWID='${locker_id}'`
        ),
      ]);

      const organizations = orgRes?.[0]?.organizations;
      const branches = branchRes?.[0]?.branches;
      const cabinets = cabinetRes?.[0]?.cabinets;
      const lockers = lockerRes?.[0]?.lockers;

      await sendMail(req.catalystApp, {
        to: user.email_id,
        subject: "Locker Booking Confirmation",
        html: lockerBookingEmail({
          name: `${user.first_name} ${user.last_name}`,
          org: organizations?.name,
          branch: branches?.name,
          cabinet: cabinets?.name,
          locker: lockers?.label,
          start: start_time,
          end: end_time,
          months,
        }),
      });

      // ✅ AUDIT #1: Booking created
      await writeAuditLog(req, {
        org_id,
        action: "CREATE",
        entity: "booking",
        entity_id: booking.ROWID,
        after: booking,
        extra: {
          locker_id,
          branch_id,
          cabinet_id,
          start_time,
          end_time,
          months,
          payment_id,
          customer_id,
        },
      });

      // ✅ AUDIT #2: Locker status changed to booked
      await writeAuditLog(req, {
        org_id,
        action: "BOOK",
        entity: "locker",
        entity_id: locker_id,
        before: lockerBefore,
        after: lockerAfter,
        extra: { booking_id: booking.ROWID },
      });

      return {
        success: true,
        booking_id: booking.ROWID,
      };
    } catch (error) {
      console.error("CustomerService.bookLocker error:", error);
      throw error;
    }
  }

  /* ===============================
     BOOK VISIT APPOINTMENT ✅ + AUDIT
  ================================ */
  static async bookAppointment(req) {
    try {
      const zcql = req.catalystApp.zcql();
      const datastore = req.catalystApp.datastore();
      const user = await req.catalystApp.userManagement().getCurrentUser();

      const { locker_id, visit_time } = req.body;
      if (!locker_id || !visit_time) throw new Error("Missing fields");
      if (!isValidDateTimeFormat(visit_time))
        throw new Error("Invalid datetime");

      const visitKey = Math.random().toString(36).substring(2, 8).toUpperCase();

      // ✅ Resolve org_id properly (from locker -> cabinet -> branch -> org)
      const lockerRow = await datastore.table("lockers").getRow(String(locker_id));
      if (!lockerRow) throw new Error("Locker not found");

      const cabinetRow = await datastore.table("cabinets").getRow(String(lockerRow.cabinet_id));
      if (!cabinetRow) throw new Error("Cabinet not found");
      const branchRow = await datastore.table("branches").getRow(String(cabinetRow.branch_id));
      if (!branchRow) throw new Error("Branch not found");
      const org_id = branchRow.org_id;

      const rowData = {
        org_id,
        locker_id,
        auth_user_id: user.user_id,
        visit_time,
        visit_key: visitKey,
        status: "CONFIRMED",
      };

      const appointment = await datastore.table("appointments").insertRow(rowData);

      const [{ lockers }, { cabinets }, { branches }, { organizations }] = [
        ...(await zcql.executeZCQLQuery(
          `SELECT * FROM lockers WHERE ROWID='${locker_id}'`
        )),
        ...(await zcql.executeZCQLQuery(
          `SELECT * FROM cabinets WHERE ROWID='${lockers.cabinet_id}'`
        )),
        ...(await zcql.executeZCQLQuery(
          `SELECT * FROM branches WHERE ROWID='${cabinets.branch_id}'`
        )),
        ...(await zcql.executeZCQLQuery(
          `SELECT * FROM organizations WHERE ROWID='${branches.org_id}'`
        )),
      ];

      await sendMail(req.catalystApp, {
        to: user.email_id,
        subject: "Locker Visit Appointment Scheduled",
        html: appointmentEmail({
          name: user.first_name,
          org: organizations.name,
          branch: branches.name,
          cabinet: cabinets.name,
          locker: lockers.label,
          time: visit_time,
          key: visitKey,
        }),
      });

      // ✅ AUDIT: Appointment created
      await writeAuditLog(req, {
        org_id,
        action: "CREATE",
        entity: "appointment",
        entity_id: appointment.ROWID,
        after: appointment,
        extra: { locker_id, visit_time, visit_key: visitKey },
      });

      return {
        success: true,
        appointment_id: appointment.ROWID,
        visit_key: visitKey,
      };
    } catch (error) {
      console.error("CustomerService.bookAppointment error:", error);
      throw error;
    }
  }

  /* ===============================
   GET MY BOOKINGS (ONLY BOOKINGS)
================================ */
  static async getMyBookings(req) {
    try {
      const zcql = req.catalystApp.zcql();
      const user = await req.catalystApp.userManagement().getCurrentUser();

      if (!user?.user_id) {
        throw new Error("Unauthorized");
      }

      const query = `
        SELECT *
        FROM bookings
        WHERE auth_user_id = '${user.user_id}'
        ORDER BY CREATEDTIME DESC
      `;

      const rows = await zcql.executeZCQLQuery(query);

      return rows.map((r) => {
        const b = r.bookings;
        return {
          booking_id: b.ROWID,
          org_id: b.org_id,
          branch_id: b.branch_id,
          locker_id: b.locker_id,
          customer_id: b.customer_id,
          start_date: b.start_date,
          end_date: b.end_date,
          months: b.months,
          payment_id: b.payment_id,
          status: b.status,
        };
      });
    } catch (err) {
      console.error("getMyBookings error:", err);
      throw err;
    }
  }

  /* ===============================
   GET MY LOCKERS (VIA BOOKINGS)
================================ */
  static async getMyLockers(req, res) {
    try {
      const zcql = req.catalystApp.zcql();
      const user = await req.catalystApp.userManagement().getCurrentUser();

      if (!user?.user_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const bookingRows = await zcql.executeZCQLQuery(`
        SELECT locker_id
        FROM bookings
        WHERE auth_user_id = '${user.user_id}'
          AND status = 'ACTIVE'
      `);

      if (!bookingRows.length) {
        return res.status(200).json({
          success: true,
          lockers: [],
        });
      }

      const lockerIds = bookingRows.map((r) => `'${r.bookings.locker_id}'`);

      const lockerRows = await zcql.executeZCQLQuery(`
        SELECT *
        FROM lockers
        WHERE ROWID IN (${lockerIds.join(",")})
      `);

      const lockers = lockerRows.map((r) => {
        const l = r.lockers;
        return {
          locker_id: l.ROWID,
          label: l.label,
          cabinet_id: l.cabinet_id,
          width: l.width,
          height: l.height,
          rowNo: l.rowNo,
          position: l.position,
          status: l.status,
          book_id: l.book_id,
        };
      });

      return res.status(200).json({
        success: true,
        lockers,
      });
    } catch (error) {
      console.error("getMyLockers error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch lockers",
      });
    }
  }

  /* ===============================
   GET MY APPOINTMENTS
================================ */
  static async getMyAppointments(req, res) {
    try {
      const zcql = req.catalystApp.zcql();
      const user = await req.catalystApp.userManagement().getCurrentUser();

      if (!user?.user_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const query = `
        SELECT *
        FROM appointments
        WHERE auth_user_id = '${user.user_id}'
        ORDER BY visit_time DESC
      `;

      const rows = await zcql.executeZCQLQuery(query);

      const appointments = rows.map((r) => {
        const a = r.appointments;
        return {
          appointment_id: a.ROWID,
          org_id: a.org_id,
          locker_id: a.locker_id,
          visit_time: a.visit_time,
          visit_key: a.visit_key,
          status: a.status,
          created_time: a.CREATEDTIME,
        };
      });

      return res.status(200).json({
        success: true,
        appointments,
      });
    } catch (error) {
      console.error("getMyAppointments error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch appointments",
      });
    }
  }

  //Get Booking by Id
  static async getBookingById(req) {
    const zcql = req.catalystApp.zcql();
    const { bookingId } = req.params;

    const rows = await zcql.executeZCQLQuery(`
      SELECT *
      FROM bookings
      WHERE ROWID='${bookingId}'
    `);

    if (!rows.length) throw new Error("Booking not found");

    return rows[0].bookings;
  }

  //Update Booking ✅ + AUDIT
  static async updateBooking(req) {
    const datastore = req.catalystApp.datastore();
    const zcql = req.catalystApp.zcql();
    const { bookingId } = req.params;
    const { start_date, end_date, months } = req.body;

    // before
    const beforeRows = await zcql.executeZCQLQuery(
      `SELECT * FROM bookings WHERE ROWID='${bookingId}'`
    );
    if (!beforeRows.length) throw new Error("Booking not found");
    const before = beforeRows[0].bookings;

    const updateRes = await datastore.table("bookings").updateRow({
      ROWID: bookingId,
      start_date,
      end_date,
      months,
    });

    // after
    const afterRows = await zcql.executeZCQLQuery(
      `SELECT * FROM bookings WHERE ROWID='${bookingId}'`
    );
    const after = afterRows?.[0]?.bookings || null;

    await writeAuditLog(req, {
      org_id: before.org_id,
      action: "UPDATE",
      entity: "booking",
      entity_id: bookingId,
      before,
      after,
      extra: { start_date, end_date, months },
    });

    return { updated: true, data: updateRes };
  }

  //Cancel Booking ✅ + AUDIT
  static async cancelBooking(req) {
    const datastore = req.catalystApp.datastore();
    const zcql = req.catalystApp.zcql();
    const { bookingId } = req.params;

    const bookingRes = await zcql.executeZCQLQuery(`
      SELECT * FROM bookings WHERE ROWID='${bookingId}'
    `);

    if (!bookingRes.length) throw new Error("Booking not found");

    const bookingBefore = bookingRes[0].bookings;
    const lockerId = bookingBefore.locker_id;

    const lockerBefore = await datastore.table("lockers").getRow(String(lockerId));

    await datastore.table("bookings").updateRow({
      ROWID: bookingId,
      status: "CANCELLED",
    });

    await datastore.table("lockers").updateRow({
      ROWID: lockerId,
      status: "available",
      book_id: "",
    });

    const bookingAfterRes = await zcql.executeZCQLQuery(`
      SELECT * FROM bookings WHERE ROWID='${bookingId}'
    `);
    const bookingAfter = bookingAfterRes?.[0]?.bookings || null;

    const lockerAfter = await datastore.table("lockers").getRow(String(lockerId));

    // ✅ AUDIT #1: booking cancelled
    await writeAuditLog(req, {
      org_id: bookingBefore.org_id,
      action: "CANCEL",
      entity: "booking",
      entity_id: bookingId,
      before: bookingBefore,
      after: bookingAfter,
      extra: { locker_id: lockerId },
    });

    // ✅ AUDIT #2: locker released
    await writeAuditLog(req, {
      org_id: bookingBefore.org_id,
      action: "RELEASE",
      entity: "locker",
      entity_id: lockerId,
      before: lockerBefore,
      after: lockerAfter,
      extra: { booking_id: bookingId },
    });

    return { cancelled: true };
  }

  //Appointment get by id
  static async getAppointmentById(req) {
    const zcql = req.catalystApp.zcql();
    const user = await req.catalystApp.userManagement().getCurrentUser();
    const { appointmentId } = req.params;

    const rows = await zcql.executeZCQLQuery(`
      SELECT *
      FROM appointments
      WHERE ROWID='${appointmentId}'
        AND auth_user_id='${user.user_id}'
    `);

    if (!rows.length) throw new Error("Appointment not found");

    return rows[0].appointments;
  }

  //Reschedule the appointment ✅ + AUDIT
  static async updateAppointment(req) {
    const datastore = req.catalystApp.datastore();
    const zcql = req.catalystApp.zcql();
    const { appointmentId } = req.params;
    const { visit_time } = req.body;

    const beforeRows = await zcql.executeZCQLQuery(
      `SELECT * FROM appointments WHERE ROWID='${appointmentId}'`
    );
    if (!beforeRows.length) throw new Error("Appointment not found");
    const before = beforeRows[0].appointments;

    await datastore.table("appointments").updateRow({
      ROWID: appointmentId,
      visit_time,
    });

    const afterRows = await zcql.executeZCQLQuery(
      `SELECT * FROM appointments WHERE ROWID='${appointmentId}'`
    );
    const after = afterRows?.[0]?.appointments || null;

    await writeAuditLog(req, {
      org_id: before.org_id,
      action: "UPDATE",
      entity: "appointment",
      entity_id: appointmentId,
      before,
      after,
      extra: { visit_time },
    });

    return { rescheduled: true };
  }

  // Cancel Appointment ✅ + AUDIT
  static async cancelAppointment(req) {
    const datastore = req.catalystApp.datastore();
    const zcql = req.catalystApp.zcql();
    const { appointmentId } = req.params;

    const beforeRows = await zcql.executeZCQLQuery(
      `SELECT * FROM appointments WHERE ROWID='${appointmentId}'`
    );
    if (!beforeRows.length) throw new Error("Appointment not found");
    const before = beforeRows[0].appointments;

    await datastore.table("appointments").updateRow({
      ROWID: appointmentId,
      status: "CANCELLED",
    });

    const afterRows = await zcql.executeZCQLQuery(
      `SELECT * FROM appointments WHERE ROWID='${appointmentId}'`
    );
    const after = afterRows?.[0]?.appointments || null;

    await writeAuditLog(req, {
      org_id: before.org_id,
      action: "CANCEL",
      entity: "appointment",
      entity_id: appointmentId,
      before,
      after,
    });

    return { cancelled: true };
  }

  /* ===============================
   CUSTOMER ANALYTICS DASHBOARD
================================ */
  static async getMyAnalytics(req) {
    try {
      const zcql = req.catalystApp.zcql();
      const user = await req.catalystApp.userManagement().getCurrentUser();

      if (!user?.user_id) {
        throw new Error("Unauthorized");
      }

      const nowIST = getCurrentISTDateTimeString();

      const bookingRows = await zcql.executeZCQLQuery(`
      SELECT *
      FROM bookings
      WHERE auth_user_id='${user.user_id}'
    `);

      let totalBookings = bookingRows.length;
      let activeBookings = 0;
      let cancelledBookings = 0;
      let expiredBookings = 0;

      let firstBookingDate = null;
      let lastBookingDate = null;

      const branchUsageMap = {};

      for (const row of bookingRows) {
        const b = row.bookings;

        if (!firstBookingDate || b.CREATEDTIME < firstBookingDate) {
          firstBookingDate = b.CREATEDTIME;
        }
        if (!lastBookingDate || b.CREATEDTIME > lastBookingDate) {
          lastBookingDate = b.CREATEDTIME;
        }

        if (b.status === "ACTIVE") {
          if (b.end_date < nowIST) {
            expiredBookings++;
          } else {
            activeBookings++;
          }
        }

        if (b.status === "CANCELLED") {
          cancelledBookings++;
        }

        if (b.branch_id) {
          branchUsageMap[b.branch_id] = (branchUsageMap[b.branch_id] || 0) + 1;
        }
      }

      const appointmentRows = await zcql.executeZCQLQuery(`
      SELECT *
      FROM appointments
      WHERE auth_user_id='${user.user_id}'
    `);

      let totalAppointments = appointmentRows.length;
      let upcomingAppointments = 0;
      let completedAppointments = 0;
      let cancelledAppointments = 0;

      for (const row of appointmentRows) {
        const a = row.appointments;

        if (a.status === "CANCELLED") {
          cancelledAppointments++;
        } else if (a.visit_time > nowIST) {
          upcomingAppointments++;
        } else {
          completedAppointments++;
        }
      }

      let favoriteBranchId = null;
      let maxVisits = 0;

      for (const branchId in branchUsageMap) {
        if (branchUsageMap[branchId] > maxVisits) {
          maxVisits = branchUsageMap[branchId];
          favoriteBranchId = branchId;
        }
      }

      let favoriteBranch = null;
      if (favoriteBranchId) {
        const branchRes = await zcql.executeZCQLQuery(`
        SELECT * FROM branches WHERE ROWID='${favoriteBranchId}'
      `);
        if (branchRes.length) {
          favoriteBranch = {
            branch_id: branchRes[0].branches.ROWID,
            name: branchRes[0].branches.name,
          };
        }
      }

      return {
        bookings: {
          total: totalBookings,
          active: activeBookings,
          cancelled: cancelledBookings,
          expired: expiredBookings,
          first_booking_date: firstBookingDate,
          last_booking_date: lastBookingDate,
        },
        appointments: {
          total: totalAppointments,
          upcoming: upcomingAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
        },
        insights: {
          favorite_branch: favoriteBranch,
        },
      };
    } catch (error) {
      console.error("getMyAnalytics error:", error);
      throw error;
    }
  }
}

module.exports = CustomerService;
