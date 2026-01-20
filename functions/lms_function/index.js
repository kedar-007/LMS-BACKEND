const express = require("express");
const app = express();
//const bodyParser = require("body-parser");
const catalyst = require("zcatalyst-sdk-node");
app.use(express.json());
const cors = require("cors");
app.use(cors());

app.use(
  cors({
    origin: "*", // Allows all origins, this is the default setting.
    methods: ["GET", "POST"], // Specify allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
  })
);

//Get Leads
app.get("/leads", async (req, res) => {
  try {
    const capp = catalyst.initialize(req);
    const zcql = capp.zcql();

    const query = `SELECT * FROM lms_leads`;
    const queryResp = await zcql.executeZCQLQuery(query);

    // ZCQL returns rows like: [{ lms_leads: {...} }, { lms_leads: {...} }]
    const leads = Array.isArray(queryResp)
      ? queryResp.map((row) => row.lms_leads).filter(Boolean)
      : [];

    return res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
      message: leads.length ? "Leads fetched successfully" : "No leads found",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
});

// Create Customer while Inviting via email
app.post("/create/customer", async (req, res) => {
  try {
    const capp = catalyst.initialize(req);
    const { name, email, phone, org_id, senders_mail } = req.body || {};

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, email",
      });
    }

    if (!org_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: org_id",
      });
    }

    const role_id = "17682000000523745";

    const trimmedName = String(name).trim();
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    const first_name = parts[0] || trimmedName;
    const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";

    const signupConfig = {
      platform_type: "web",
      template_details: {
        senders_mail: senders_mail || "dogogetu@tutuapp.bid",
        subject: "Welcome to Locker Management System",
        message:
          "<p>Hello " +
          trimmedName +
          ",</p>" +
          "<p>You have been invited to join <b>Locker Management System</b>.</p>" +
          "<p>Click the link below to set up your account:</p>" +
          "<p><a href='%LINK%' target='_blank' rel='noopener noreferrer'>Accept Invitation</a></p>" +
          "<p style='color:#64748b; font-size:12px'>If you did not ask to join, you can ignore this email.</p>" +
          "<p>Thanks,<br/>Locker Management System Team</p>",
      },
      redirect_url: "https://lms-60040289923.development.catalystserverless.in",
    };

    const userConfig = {
      first_name,
      last_name,
      email_id: email,
      role_id,
      org_id: org_id,
    };

    const userManagement = capp.userManagement();
    const userDetails = await userManagement.registerUser(signupConfig, userConfig);

    const zcql = capp.zcql();
    const datastore = capp.datastore();

    // 1) Ensure organizations row exists for this org_id
    // NOTE: This assumes organizations table has a TEXT column also called "org_id"
    // which stores the Catalyst org id string. If your column is different, change it here.
    const safeOrg = String(org_id).replace(/'/g, "''");
    const orgCheckQuery = `SELECT ROWID FROM organizations WHERE org_id = '${safeOrg}' LIMIT 1`;
    const orgCheckResp = await zcql.executeZCQLQuery(orgCheckQuery);

    let organizationRowId =
      Array.isArray(orgCheckResp) && orgCheckResp.length > 0
        ? orgCheckResp[0]?.organizations?.ROWID || orgCheckResp[0]?.ROWID
        : null;

    if (!organizationRowId) {
      const orgTable = datastore.table("organizations");

      const orgInsertPayload = {
        org_id: org_id,                 // Catalyst org_id string (TEXT column)
        name: trimmedName,              // as requested
        plan: "Free",                   // you can change default
        status: "Active",               // you can change default
      };

      const insertedOrg = await orgTable.insertRow(orgInsertPayload);

      organizationRowId = insertedOrg?.ROWID || insertedOrg?.rowid || null;

      if (!organizationRowId) {
        // fallback: re-query if insert response doesn't contain ROWID in your runtime
        const orgRecheckResp = await zcql.executeZCQLQuery(orgCheckQuery);
        organizationRowId =
          Array.isArray(orgRecheckResp) && orgRecheckResp.length > 0
            ? orgRecheckResp[0]?.organizations?.ROWID || orgRecheckResp[0]?.ROWID
            : null;
      }

      if (!organizationRowId) {
        return res.status(500).json({
          success: false,
          message: "Organization record could not be created.",
        });
      }
    }

    // 2) Upsert into customers using organizations ROWID (FK expects ROWID)
    const safeEmail = String(email).replace(/'/g, "''");
    const custCheckQuery = `SELECT ROWID FROM customers WHERE email = '${safeEmail}' LIMIT 1`;
    const custCheckResp = await zcql.executeZCQLQuery(custCheckQuery);

    const existingCustomerRowId =
      Array.isArray(custCheckResp) && custCheckResp.length > 0
        ? custCheckResp[0]?.customers?.ROWID || custCheckResp[0]?.ROWID
        : null;

    const customerTable = datastore.table("customers");

    const customerPayload = {
      name: trimmedName,
      email: email,
      org_id: organizationRowId,     // FK wants organizations.ROWID
      phone: phone || null,
      kyc_status: "Pending",
      status: "Invited",
    };

    let savedCustomer;
    if (existingCustomerRowId) {
      savedCustomer = await customerTable.updateRow({
        ROWID: existingCustomerRowId,
        ...customerPayload,
      });
    } else {
      savedCustomer = await customerTable.insertRow(customerPayload);
    }

    return res.status(200).json({
      success: true,
      message: "Invitation sent and customer saved successfully.",
      invite: userDetails,
      organization_rowid: organizationRowId,
      customer: savedCustomer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Server error",
    });
  }
});


module.exports = app;
