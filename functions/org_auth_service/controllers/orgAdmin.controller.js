class OrgAdminController {
  constructor(req) {
    this.req = req;
    this.catalystApp = req.catalystApp;
    this.auth = this.catalystApp.userManagement();
    this.datastore = this.catalystApp.datastore();
    this.zcql = this.catalystApp.zcql();
  }

  async getCurrentUser(req, res) {
    return await this.auth.getCurrentUser();
  }

  async createOrg(req, res) {
    try {
      // ✅ Your actual bucket base URL
      const BUCKET_BASE_URL = "https://org-logos-development.zohostratus.in";
      console.log("📥 Create Org API called");
      console.log("➡️ Raw req.body:", req.body);
      console.log("➡️ Raw req.files:", req.files);

      const { name, plan, orgId } = req.body;
      const logoFile = req.files?.logo;

      if (!name || !orgId) {
        return res.status(400).json({
          success: false,
          message: "Org details missing",
        });
      }

      let logoUrl = null;

      /**
       * 1️⃣ Upload logo
       */
      if (logoFile) {
        const stratus = this.catalystApp.stratus();
        const bucket = stratus.bucket("org-logos");

        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${orgId}_${Date.now()}.${fileExt}`;

        const uploadResult = await bucket.putObject(fileName, logoFile.data, {
          contentType: logoFile.mimetype,
        });

        // ✅ putObject returns TRUE
        if (uploadResult === true) {
          logoUrl = `${BUCKET_BASE_URL}/${fileName}`;
          console.log("✅ Logo uploaded:", logoUrl);
        } else {
          console.warn("❌ Logo upload failed");
        }
      }

      /**
       * 2️⃣ Save org
       */
      const rowData = {
        name,
        plan: plan || "FREE",
        status: "Active",
        orgId,
        logo: logoUrl,
      };

      const orgResponse = await this.datastore
        .table("organizations")
        .insertRow(rowData);

      return res.status(201).json({
        success: true,
        message: "Organization created",
        data: {
          orgId,
          ROWID: orgResponse.ROWID,
          logo: logoUrl,
        },
      });
    } catch (error) {
      console.error("❌ Create Org Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error?.message,
      });
    }
  }

  async getOrgdetails(req, res) {
    try {
      const currUser = await this.getCurrentUser(req, res);
      console.log("Current User", currUser);
      const orgId = currUser.org_id;
      if (!orgId) {
        return res.status(404).json({
          message: "Orgnization is missing of the current logged in user",
        });
      }

      // construct the Zcql querry to get the org details of the current user

      let query = `SELECT * FROM organizations WHERE orgId = ${orgId}`;
      const org = await this.zcql.executeZCQLQuery(query);
      console.log("Organization Retrieved", org?.length);

      if (!org || org.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization details have not been created yet.",
        });
      }

      return res.status(200).json({
        success: true,
        data: org,
      });
    } catch (error) {}
  }

  async inviteUserOrg(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: "Invalid request payload",
        });
      }

      const { orgId } = req.params;
      const { firstName, lastName, email, role } = req.body;

      if (!orgId || !email || !role || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: "orgId, name, email and role are mandatory",
        });
      }

      /** Signup Email Config */
      const signupConfig = {
        platform_type: "web",
        template_details: {
          senders_mail: "pavan@dsvcorp.com.au",
          subject: "You’re invited to join the Locker Management System",
          message: `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;
                        background:#ffffff;border-radius:8px;overflow:hidden;
                        box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      
              <!-- Header -->
              <div style="background:#1d4ed8;padding:20px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;">
                  Locker Management System
                </h1>
                <p style="color:#e0e7ff;margin:6px 0 0;font-size:14px;">
                  Organization Invitation
                </p>
              </div>
      
              <!-- Body -->
              <div style="padding:24px;color:#333333;font-size:14px;line-height:1.6;">
                
                <p style="margin-top:0;">
                  Hello <strong>${firstName} ${lastName}</strong>,
                </p>
      
                <p>
                  You have been invited to join the
                  <strong>Locker Management System</strong>.
                </p>
      
                <p>
                  <strong>Organization ID:</strong>
                  <span style="background:#f1f5f9;padding:4px 8px;
                               border-radius:4px;font-family:monospace;">
                    ${orgId}
                  </span>
                </p>
      
                <p>
                  By accepting this invitation, you will gain access to:
                </p>
      
                <ul style="padding-left:18px;">
                  <li>Organization & branch management</li>
                  <li>User roles and access control</li>
                  <li>Cabinet and locker configuration</li>
                  <li>Booking and usage tracking</li>
                </ul>
      
                <p style="margin:24px 0;text-align:center;">
                  <a href="%LINK%"
                     style="background:#1d4ed8;color:#ffffff;
                            padding:12px 24px;
                            text-decoration:none;
                            border-radius:6px;
                            font-weight:bold;
                            display:inline-block;">
                    Accept Invitation
                  </a>
                </p>
      
                <p style="font-size:13px;color:#555555;">
                  If the button above does not work, copy and paste the link below into
                  your browser:
                </p>
      
                <p style="word-break:break-all;">
                  <a href="%LINK%" style="color:#1d4ed8;">%LINK%</a>
                </p>
      
                <p style="font-size:13px;color:#777777;margin-top:24px;">
                  If you were not expecting this invitation, you can safely ignore this email.
                </p>
              </div>
      
              <!-- Footer -->
              <div style="background:#f8fafc;padding:16px;text-align:center;
                          font-size:12px;color:#6b7280;">
                <p style="margin:0;">
                  © ${new Date().getFullYear()} DSV Corp — Locker Management System
                </p>
                <p style="margin:4px 0 0;">
                  This is an automated email. Please do not reply.
                </p>
              </div>
            </div>
          `,
        },
        redirect_url:
          "https://lms-60040289923.development.catalystserverless.in/app/",
      };

      /** User Config – ONLY CHANGE REQUIRED */
      const userConfig = {
        first_name: firstName,
        last_name: lastName,
        email_id: email,
        role_id: role,
        org_id: orgId,
      };

      /** Invite user via Catalyst */
      const registeredUser = await this.auth.registerUser(
        signupConfig,
        userConfig
      );

      /** Save user in org users table */
      const rowData = {
        email: registeredUser.user_details.email_id,
        name: `${firstName} ${lastName}`,
        role: role,
        status: "INVITED",
        org_id: orgId,
        auth_user_id: registeredUser.user_details.user_id,
      };

      await this.datastore.table("users").insertRow(rowData);

      return res.status(201).json({
        success: true,
        message: "User invited to organization successfully",
        data: registeredUser,
      });
    } catch (error) {
      console.error("Invite User Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to invite user",
      });
    }
  }

  async inviteCustomerOrg(req, res) {
    try {
      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: "Invalid request payload",
        });
      }

      const { orgId } = req.params;
      const { firstName, lastName, email } = req.body;

      /** CUSTOMER ROLE (FIXED) */
      const CUSTOMER_ROLE_ID = "17682000000591821"; // org_customer

      if (!orgId || !email || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: "orgId, firstName, lastName and email are mandatory",
        });
      }

      /* ===============================
         FETCH ORGANIZATION DETAILS
      ================================*/
      const zcql = this.catalystApp.zcql();

      const orgQuery = `
        SELECT *
        FROM organizations
        WHERE orgId = '${orgId}'
        LIMIT 1
      `;

      const orgRows = await zcql.executeZCQLQuery(orgQuery);

      if (!orgRows || orgRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const org = orgRows[0].organizations;
      const orgName = org.name;

      /* ===============================
         EMAIL INVITATION TEMPLATE
      ================================*/
      const signupConfig = {
        platform_type: "web",
        template_details: {
          senders_mail: "pavan@dsvcorp.com.au",
          subject: `You’re invited to join ${orgName} on Locker Management System`,
          message: `
            <div style="max-width:620px;margin:0 auto;
                        font-family:Inter,Arial,sans-serif;
                        background:#ffffff;border-radius:10px;
                        overflow:hidden;border:1px solid #e5e7eb;">
              
              <!-- Header -->
              <div style="background:linear-gradient(135deg,#2563eb,#1e40af);
                          padding:28px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;">
                  Locker Management System
                </h1>
                <p style="color:#dbeafe;margin-top:8px;font-size:14px;">
                  Customer Invitation
                </p>
              </div>
  
              <!-- Body -->
              <div style="padding:28px;color:#374151;">
                
                <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
  
                <p>
                  You have been invited to join
                  <strong>${orgName}</strong> as a
                  <strong>Customer</strong> on the Locker Management System.
                </p>
  
                <div style="background:#f9fafb;border-left:4px solid #2563eb;
                            padding:16px;margin:20px 0;border-radius:6px;">
                  <p style="margin:0;font-size:14px;">
                    As a customer, you can:
                  </p>
                  <ul style="margin:10px 0 0 18px;font-size:14px;">
                    <li>Browse available branches, cabinets & lockers</li>
                    <li>Book and rent lockers securely</li>
                    <li>Schedule visits to access lockers</li>
                    <li>Manage your locker usage & bookings</li>
                  </ul>
                </div>
  
                <p style="text-align:center;margin:30px 0;">
                  <a href="%LINK%"
                     style="background:#2563eb;color:#ffffff;
                            padding:14px 28px;
                            text-decoration:none;
                            border-radius:8px;
                            font-size:15px;
                            font-weight:600;
                            display:inline-block;">
                    Accept Invitation
                  </a>
                </p>
  
                <p style="font-size:13px;color:#6b7280;">
                  If the button doesn’t work, copy and paste this link:
                </p>
  
                <p style="word-break:break-all;">
                  <a href="%LINK%" style="color:#2563eb;">%LINK%</a>
                </p>
  
                <p style="font-size:13px;color:#6b7280;margin-top:24px;">
                  If you were not expecting this invitation, you can safely ignore this email.
                </p>
              </div>
  
              <!-- Footer -->
              <div style="background:#f8fafc;padding:18px;text-align:center;
                          font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} ${orgName} — Locker Management System
              </div>
            </div>
          `,
        },
        redirect_url:
          "https://lms-60040289923.development.catalystserverless.in/app/",
      };

      /* ===============================
         USER REGISTRATION CONFIG
      ================================*/
      const userConfig = {
        first_name: firstName,
        last_name: lastName,
        email_id: email,
        role_id: CUSTOMER_ROLE_ID,
        org_id: orgId,
      };

      /* ===============================
         INVITE CUSTOMER
      ================================*/
      const registeredUser = await this.auth.registerUser(
        signupConfig,
        userConfig
      );

      /* ===============================
         SAVE CUSTOMER RECORD
      ================================*/
      const rowData = {
        email: registeredUser.user_details.email_id,
        name: `${firstName} ${lastName}`,
        role: "CUSTOMER",
        status: "INVITED",
        org_id: orgId,
        auth_user_id: registeredUser.user_details.user_id,
      };

      await this.datastore.table("users").insertRow(rowData);

      return res.status(201).json({
        success: true,
        message: "Customer invited successfully",
        data: {
          user_id: registeredUser.user_details.user_id,
          email,
          org_id: orgId,
          org_name: orgName,
          role: "CUSTOMER",
        },
      });
    } catch (error) {
      console.error("Invite Customer Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to invite customer",
      });
    }
  }

  //Get all the users
  async getOrgUsers(req, res) {
    try {
      const { orgId } = req.params;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      // Role ID → Role Name mapping
      const ROLE_MAP = {
        "17682000000591821": "CUSTOMER",
        "17682000000568151": "ORG-USER",
        "17682000000568001": "ADMIN",
      };

      const query = `SELECT * FROM users WHERE org_id = ${orgId}`;
      const usersRes = await this.zcql.executeZCQLQuery(query);

      const formattedUsers = usersRes
        .map((row) => {
          const user = row.users;
          const resolvedRole = ROLE_MAP[user.role] || user.role;

          return {
            ...user,
            role: resolvedRole,
          };
        })
        .filter((user) => user.role !== "ADMIN"); // 🚫 remove admins

      return res.status(200).json({
        success: true,
        message: "Organization users fetched successfully",
        count: formattedUsers.length,
        data: formattedUsers,
      });
    } catch (error) {
      console.error("Get Org Users Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch organization users",
      });
    }
  }

  //Update code v2
  /* =====================================================
     ENABLE / DISABLE ORGANIZATION USERS
  ======================================================*/

  async disableOrgUser(req, res) {
    try {
      const { userId } = req.params;

      // 1. Fetch auth_user_id using ZCQL
      const userResult = await this.zcql.executeZCQLQuery(`
        SELECT ROWID, auth_user_id
        FROM users
        WHERE auth_user_id = '${userId}'
      `);

      if (!userResult || userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userResult[0].users;

      // 2. Disable user in DataStore
      await this.datastore.table("users").updateRow({
        ROWID: user.ROWID,
        status: "DISABLED",
      });

      // 3. Disable user in Catalyst Authentication
      if (user.auth_user_id) {
        const userManagement = this.catalystApp.userManagement();
        await userManagement.updateUserStatus(user.auth_user_id, "disable");
      }

      return res.status(200).json({
        success: true,
        message: "User disabled successfully",
      });
    } catch (error) {
      console.error("Disable User Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to disable user",
      });
    }
  }

  async enableOrgUser(req, res) {
    try {
      const { userId } = req.params;

      // 1. Fetch auth_user_id using ZCQL
      const userResult = await this.zcql.executeZCQLQuery(`
        SELECT ROWID, auth_user_id
        FROM users
        WHERE auth_user_id = '${userId}'
      `);

      if (!userResult || userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userResult[0].users;

      // 2. Disable user in DataStore
      await this.datastore.table("users").updateRow({
        ROWID: user.ROWID,
        status: "ACTIVE",
      });

      // 3. Disable user in Catalyst Authentication
      if (user.auth_user_id) {
        const userManagement = this.catalystApp.userManagement();
        await userManagement.updateUserStatus(user.auth_user_id, "enable");
      }

      return res.status(200).json({
        success: true,
        message: "User Enabled successfully",
      });
    } catch (error) {
      console.error("Disable User Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to Enabled user",
      });
    }
  }

  /* =====================================================
     ORGANIZATION OVERVIEW (DASHBOARD COUNTS)
  ======================================================*/
  async getOrgOverview(req, res) {
    try {
      const { orgId } = req.params;
      const zcql = this.zcql;

      /* ---------------------------------------------------
         BASIC COUNTS
      --------------------------------------------------- */
      const [
        branchesCount,
        cabinetsCount,
        lockersCount,
        customersCount,
        bookingsCount,
      ] = await Promise.all([
        zcql.executeZCQLQuery(
          `SELECT COUNT(ROWID) FROM branches WHERE org_id = ${orgId}`
        ),
        zcql.executeZCQLQuery(
          `SELECT COUNT(ROWID) FROM cabinets WHERE org_id = ${orgId}`
        ),
        zcql.executeZCQLQuery(`SELECT COUNT(ROWID) FROM lockers`),
        zcql.executeZCQLQuery(
          `SELECT COUNT(ROWID) FROM users 
           WHERE org_id = ${orgId} 
           AND role = '17682000000591821'`
        ),
        zcql.executeZCQLQuery(
          `SELECT COUNT(ROWID) FROM bookings WHERE org_id = ${orgId}`
        ),
      ]);

      /* ---------------------------------------------------
         FETCH RAW DATA
      --------------------------------------------------- */
      const [branches, cabinets, lockers, bookings, customers] =
        await Promise.all([
          zcql.executeZCQLQuery(
            `SELECT ROWID, name, CREATEDTIME 
             FROM branches 
             WHERE org_id = ${orgId}
             ORDER BY CREATEDTIME DESC`
          ),
          zcql.executeZCQLQuery(
            `SELECT ROWID, branch_id 
             FROM cabinets 
             WHERE org_id = ${orgId}`
          ),
          zcql.executeZCQLQuery(`SELECT ROWID, cabinet_id FROM lockers`),
          zcql.executeZCQLQuery(
            `SELECT CREATEDTIME 
             FROM bookings 
             WHERE org_id = ${orgId}`
          ),
          zcql.executeZCQLQuery(
            `SELECT CREATEDTIME 
             FROM users 
             WHERE org_id = ${orgId}
             AND role = '17682000000591821'`
          ),
        ]);

      /* ---------------------------------------------------
         BRANCH → CABINET → LOCKER MAPPING
      --------------------------------------------------- */

      // cabinet_id → branch_id
      const cabinetToBranchMap = {};
      cabinets.forEach((row) => {
        cabinetToBranchMap[row.cabinets.ROWID] = row.cabinets.branch_id;
      });

      // branch_id → { name, lockers }
      const branchMap = {};
      branches.forEach((row) => {
        branchMap[row.branches.ROWID] = {
          branch_id: row.branches.ROWID,
          branch_name: row.branches.name,
          lockers: 0,
        };
      });

      // count lockers per branch
      lockers.forEach((row) => {
        const cabinetId = row.lockers.cabinet_id;
        const branchId = cabinetToBranchMap[cabinetId];

        if (branchId && branchMap[branchId]) {
          branchMap[branchId].lockers++;
        }
      });

      const branchWiseLockers = Object.values(branchMap);

      /* ---------------------------------------------------
         BOOKINGS PER MONTH
      --------------------------------------------------- */
      const bookingsPerMonthMap = {};

      bookings.forEach((row) => {
        const date = new Date(row.bookings.CREATEDTIME);
        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        bookingsPerMonthMap[key] = (bookingsPerMonthMap[key] || 0) + 1;
      });

      const bookingsPerMonth = Object.entries(bookingsPerMonthMap).map(
        ([month, count]) => ({ month, count })
      );

      /* ---------------------------------------------------
         CUSTOMERS PER MONTH
      --------------------------------------------------- */
      const customersPerMonthMap = {};

      customers.forEach((row) => {
        const date = new Date(row.users.CREATEDTIME);
        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        customersPerMonthMap[key] = (customersPerMonthMap[key] || 0) + 1;
      });

      const customersPerMonth = Object.entries(customersPerMonthMap).map(
        ([month, count]) => ({ month, count })
      );

      /* ---------------------------------------------------
         RECENT BRANCHES (LAST 5)
      --------------------------------------------------- */
      const recentBranches = branches.slice(0, 5).map((row) => ({
        branch_id: row.branches.ROWID,
        name: row.branches.name,
        created_at: row.branches.CREATEDTIME,
      }));

      /* ---------------------------------------------------
         RESPONSE
      --------------------------------------------------- */
      return res.status(200).json({
        success: true,
        data: {
          total_branches: Number(
            branchesCount[0]?.branches["COUNT(ROWID)"] || 0
          ),
          total_cabinets: Number(
            cabinetsCount[0]?.cabinets["COUNT(ROWID)"] || 0
          ),
          total_lockers: Number(lockersCount[0]?.lockers["COUNT(ROWID)"] || 0),
          total_customers: Number(
            customersCount[0]?.users["COUNT(ROWID)"] || 0
          ),
          total_bookings: Number(
            bookingsCount[0]?.bookings["COUNT(ROWID)"] || 0
          ),

          branch_wise_lockers: branchWiseLockers,
          recent_branches: recentBranches,
          bookings_per_month: bookingsPerMonth,
          customers_per_month: customersPerMonth,
        },
      });
    } catch (error) {
      console.error("Org Overview Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch organization overview",
      });
    }
  }

  /* =====================================================
     ORGANIZATION GRAPH DATA
  ======================================================*/

  async getOrgOverviewGraphs(req, res) {
    try {
      const { orgId } = req.params;

      const lockersPerBranchQuery = `
        SELECT 
          branches.ROWID ,
          name AS name,
          COUNT(lockers.ROWID) AS locker_count
        FROM lockers
        INNER JOIN cabinets
          ON lockers.cabinet_id = cabinets.ROWID
        INNER JOIN branches
          ON cabinets.branch_id = branches.ROWID
        WHERE cabinets.org_id = ${orgId}
        GROUP BY branches.ROWID, branches.name
      `;

      const bookingsQuery = `
        SELECT CREATEDTIME
        FROM bookings
        WHERE org_id = ${orgId}
        ORDER BY CREATEDTIME
      `;

      const [lockersResult, bookingsResult] = await Promise.all([
        this.zcql.executeZCQLQuery(lockersPerBranchQuery),
        this.zcql.executeZCQLQuery(bookingsQuery),
      ]);

      // Raw logs
      console.log("Raw Lockers ZCQL:", JSON.stringify(lockersResult, null, 2));
      console.log(
        "Raw Bookings ZCQL:",
        JSON.stringify(bookingsResult, null, 2)
      );

      // Lockers per branch (parsed)
      const lockersPerBranch = lockersResult.map((row) => ({
        branch_id: row.branches.branch_id,
        branch_name: row.branches.branch_name,
        count: Number(row.branches.locker_count || 0),
      }));

      // Bookings per month (JS aggregation)
      const bookingsPerMonthMap = {};

      bookingsResult.forEach((row) => {
        const createdTime = row.bookings.CREATEDTIME;
        const date = new Date(createdTime);

        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        bookingsPerMonthMap[monthKey] =
          (bookingsPerMonthMap[monthKey] || 0) + 1;
      });

      const bookingsPerMonth = Object.entries(bookingsPerMonthMap).map(
        ([month, count]) => ({
          month,
          count,
        })
      );

      // Parsed logs
      console.log("Parsed Lockers Per Branch:", lockersPerBranch);
      console.log("Parsed Bookings Per Month:", bookingsPerMonth);

      return res.status(200).json({
        success: true,
        data: {
          lockers_per_branch: lockersPerBranch,
          bookings_per_month: bookingsPerMonth,
        },
      });
    } catch (error) {
      console.error("Graph Data Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch graph data",
      });
    }
  }

  /* =====================================================
     BOOKINGS
  ======================================================*/

  async getOrgBookings(req, res) {
    try {
      const { orgId } = req.params;

      const query = `
        SELECT *
        FROM bookings
        WHERE org_id = ${orgId}
        ORDER BY CREATEDTIME DESC
      `;

      const bookings = await this.zcql.executeZCQLQuery(query);

      return res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      console.error("Get Bookings Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch bookings",
      });
    }
  }

  /* =====================================================
     SUBSCRIPTION MANAGEMENT
  ======================================================*/

  async subscribeToPlan(req, res) {
    try {
      const { orgId } = req.params;
      const { plan_id } = req.body;

      const currentUser = await this.auth.getCurrentUser();
      const authUserId = currentUser.user_id;

      // 1️⃣ Fetch plan details
      const planResult = await this.zcql.executeZCQLQuery(`
        SELECT ROWID, price, billing_cycle, duration_days, is_active
        FROM plans
        WHERE ROWID = '${plan_id}'
        LIMIT 1
      `);

      if (!planResult.length || !planResult[0].plans.is_active) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive plan",
        });
      }

      const plan = planResult[0].plans;

      // 2️⃣ Expire current active subscription
      await this.zcql.executeZCQLQuery(`
        UPDATE subscriptions
        SET subscription_status = 'EXPIRED'
        WHERE org_id = '${orgId}'
          AND subscription_status = 'ACTIVE'
      `);

      // 3️⃣ Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      // 4️⃣ Insert new subscription
      const subscriptionData = {
        org_id: orgId,
        auth_user_id: authUserId,
        plan_id: plan.ROWID,
        subscription_status: "ACTIVE",
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        auto_renew: true,
        billing_cycle: plan.billing_cycle,
        price_at_purchase: Number(plan.price),
        currency: "INR",
      };

      await this.datastore.table("subscriptions").insertRow(subscriptionData);

      return res.status(201).json({
        success: true,
        message: "Subscription updated successfully",
        data: subscriptionData,
      });
    } catch (error) {
      console.error("Subscription Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update subscription",
      });
    }
  }

  async getSubscription(req, res) {
    try {
      const { orgId } = req.params;

      const query = `
        SELECT *
        FROM subscriptions
        WHERE org_id = ${orgId}
        ORDER BY CREATEDTIME DESC
        LIMIT 1
      `;

      const subscription = await this.zcql.executeZCQLQuery(query);

      return res.status(200).json({
        success: true,
        data: subscription.length ? subscription[0] : null,
      });
    } catch (error) {
      console.error("Get Subscription Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch subscription",
      });
    }
  }

  /*
  ===========================
  ORGANIZATION CONFIGURATION
  ===========================
  */
  async addStripeConfig(req, res) {
    try {
      const org_id = req.params.orgId;

      //Extract payload
      const { stripe_secret_key, webhook_secret, currency } = req.body;

      if (!stripe_secret_key || !webhook_secret) {
        return res.status(400).json({
          message: "Enter Required details Stripe Secreat & Webhook Secreat",
        });
      }

      const querry = `SELECT *FROM stripe_configurations WHERE org_id = '${org_id}'`;
      const isTrue = await this.zcql.executeZCQLQuery(querry);
      // console.log("Already Present",isTrue);

      if (isTrue.length > 0) {
        return res.status(409).json({
          message: "Already Exists",
          data: isTrue,
        });
      }
      const payload = {
        stripe_secret_key,
        webhook_secret,
        currency,
        org_id,
      };

      //Insert in the db

      const response = await this.datastore
        .table("stripe_configurations")
        .insertRow(payload);

      return res.status(201).json({
        success: true,
        message: "Configurations added successfully",
        data: response,
      });
    } catch (error) {
      console.error("ERROR", error);
      return res.status(500).json({
        message: "Ineternal server error",
        error: error?.message,
      });
    }
  }
  async getStripeConfig(req, res) {
    try {
      const org_id = req.params.orgId;

      if (!org_id) {
        return res.status(400).json({
          message: "Organization ID (orgId) is required",
        });
      }

      const query = `
        SELECT * 
        FROM stripe_configurations 
        WHERE org_id = '${org_id}'
      `;

      const configs = await this.zcql.executeZCQLQuery(query);

      if (configs.length === 0) {
        return res.status(404).json({
          message: "Configurations not present",
        });
      }

      const data = configs.map((c) => c.stripe_configurations);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("ERROR in getStripeConfig:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error?.message,
      });
    }
  }
  async updateStripeConfig(req, res) {
    try {
      const org_id = req.params.orgId;
      const { stripe_secret_key, webhook_secret, currency } = req.body;

      // Validate orgId
      if (!org_id) {
        return res.status(400).json({
          message: "Organization ID (orgId) is required",
        });
      }

      // Ensure at least one field is sent
      if (!stripe_secret_key && !webhook_secret && !currency) {
        return res.status(400).json({
          message: "Provide at least one field to update",
        });
      }

      //Check existing config
      const query = `
        SELECT ROWID
        FROM stripe_configurations
        WHERE org_id = '${org_id}'
      `;
      const result = await this.zcql.executeZCQLQuery(query);
      console.log("Result", result);

      if (result.length === 0) {
        return res.status(404).json({
          message: "Configurations not present",
        });
      }

      const rowId = result[0].stripe_configurations.ROWID;

      // Build partial update payload
      const updatePayload = {};

      if (stripe_secret_key)
        updatePayload.stripe_secret_key = stripe_secret_key;
      if (webhook_secret) updatePayload.webhook_secret = webhook_secret;
      if (currency) updatePayload.currency = currency;
      updatePayload.ROWID = rowId;

      // Update only provided fields
      const response = await this.datastore
        .table("stripe_configurations")
        .updateRow(updatePayload);

      return res.status(200).json({
        success: true,
        message: "Stripe configuration updated successfully",
        data: response,
      });
    } catch (error) {
      console.error("ERROR in updateStripeConfig:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error?.message,
      });
    }
  }

  //{Payment analytics}
  async getPaymentAnalytics(req, res) {
    try {
      const org_id = req.params.orgId;

      if (!org_id) {
        return res.status(400).json({
          message: "org_id is required",
        });
      }

      /**
       * 1️⃣ Fetch all payments for the org
       * (Catalyst safe query)
       */
      const query = `
      SELECT amount, CREATEDTIME, status
      FROM payments
      WHERE org_id = '${org_id}'
    `;

      const result = await this.zcql.executeZCQLQuery(query);

      let totalCollected = 0;

      let successCount = 0;
      let failedCount = 0;
      let pendingCount = 0;

      let failedAmount = 0;
      let pendingAmount = 0;

      const monthlyMap = {};

      /**
       * 2️⃣ Filter + calculate in Node.js
       */
      result.forEach((row) => {
        const payment = row.payments;

        const amount = Number(payment.amount || 0);
        const status = payment.status;
        const createdTime = new Date(payment.CREATEDTIME);

        switch (status) {
          case "SUCCESS":
            successCount++;
            totalCollected += amount;

            const year = createdTime.getFullYear();
            const month = String(createdTime.getMonth() + 1).padStart(2, "0");
            const key = `${year}-${month}`;

            monthlyMap[key] = (monthlyMap[key] || 0) + amount;
            break;

          case "FAILED":
            failedCount++;
            failedAmount += amount;
            break;

          case "PENDING":
            pendingCount++;
            pendingAmount += amount;
            break;

          default:
            // ignore or log unknown statuses
            break;
        }
      });

      /**
       * 3️⃣ Convert monthly map to sorted array
       */
      const monthlyCollections = Object.keys(monthlyMap)
        .sort()
        .map((key) => {
          const [year, month] = key.split("-");
          return {
            year: Number(year),
            month: Number(month),
            amount: monthlyMap[key],
          };
        });

      /**
       * 4️⃣ Final Response
       */
      return res.status(200).json({
        success: true,
        org_id,
        analytics: {
          totalCollectedTillDate: totalCollected,

          counts: {
            success: successCount,
            failed: failedCount,
            pending: pendingCount,
            total: successCount + failedCount + pendingCount,
          },

          amounts: {
            success: totalCollected,
            failed: failedAmount,
            pending: pendingAmount,
          },

          monthlyCollections,
        },
      });
    } catch (error) {
      console.error("ERROR", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error?.message,
      });
    }
  }

  async getRecentOrgPayments(req, res) {
    try {
      const { orgId } = req.params;
      const { limit = 10 } = req.query;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const query = `
      SELECT * FROM payments
      WHERE org_id = ${orgId}
      ORDER BY CREATEDTIME DESC
      LIMIT ${Number(limit)}
    `;

      const paymentsRes = await this.zcql.executeZCQLQuery(query);

      const payments = paymentsRes.map((row) => row.payments);

      return res.status(200).json({
        success: true,
        message: "Recent payments fetched successfully",
        count: payments.length,
        data: payments,
      });
    } catch (error) {
      console.error("Get Recent Payments Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch recent payments",
      });
    }
  }
}

module.exports = OrgAdminController;
