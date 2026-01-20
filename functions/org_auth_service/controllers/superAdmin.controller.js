class SuperAdminController {
  constructor(req) {
    this.req = req;
    this.catalystApp = req.catalystApp;
    this.auth = this.catalystApp.userManagement();
    this.datastore = this.catalystApp.datastore();
    this.zcql = this.catalystApp.zcql();
    this.emailService = this.catalystApp.email();
  }

  /* ===============================
     HELPER: SEND ORG STATUS EMAIL
     =============================== */
  async sendOrgStatusEmail(orgId, subject, htmlContent) {
    const admins = await this.zcql.executeZCQLQuery(`
        SELECT email, name 
        FROM users
        WHERE org_id = '${orgId}'
          AND role = '17682000000568001'
      `);

    if (!admins.length) return;

    // Send all emails in parallel
    await Promise.all(
      admins.map((admin) =>
        this.emailService.sendMail({
          from_email: "catalystadmin@dsv360.ai",
          to_email: [admin.users.email],
          subject,
          html_mode: true,
          content: htmlContent,
        })
      )
    );
  }

  /* ===============================
     ADD ORGANIZATION ADMIN
     =============================== */
  async addOrgUser(req, res) {
    try {
      const { email, role, firstName, lastName, rowId } = req.body;

      if (!email || !role || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: "Required Mandatory Details - name,email,role",
        });
      }

      const signupConfig = {
        platform_type: "web",
        template_details: {
          senders_mail: "pavan@dsvcorp.com.au",
          subject:
            "You’re invited as Organization Administrator – Locker Management System",
          message: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>%APP_NAME% – Admin Invitation</title>
</head>

<body style="margin:0; padding:0; background-color:#eef2f7; font-family:Arial, Helvetica, sans-serif;">

  <!-- Background Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 0;">
    <tr>
      <td align="center">

        <!-- Email Card -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="width:100%; max-width:600px; background-color:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 12px 32px rgba(15,23,42,0.18);">

          <!-- Header -->
          <tr>
            <td style="background-color:rgba(15,23,42,0.9); padding:28px 32px;">
              <h1 style="margin:0; font-size:24px; color:#ffffff;">
                %APP_NAME%
              </h1>
              <p style="margin:6px 0 0; font-size:14px; color:#cbd5e1;">
                Enterprise Locker Management Platform
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 32px; color:#0f172a; font-size:15px; line-height:1.7;">

              <p style="margin-top:0;">Hello,</p>

              <p>
                You have been invited to join <strong>%APP_NAME%</strong> as an
                <strong>Organization Administrator</strong>.
              </p>

              <p>
                %APP_NAME% is a centralized SaaS platform designed to help organizations
                manage lockers, users, and access securely across multiple locations.
              </p>

              <!-- Admin Capabilities -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:#f8fafc; border-radius:10px; padding:22px;">

                    <p style="margin:0 0 14px; font-size:16px; font-weight:bold;">
                      What You Can Do as an Admin
                    </p>

                    <p style="margin:0 0 12px; font-size:14px; color:#334155;">
                      Set up and manage your organization in minutes using a powerful,
                      centralized admin console.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0; font-size:14px;">
                          <strong>Organization Setup</strong><br />
                          <span style="color:#475569;">
                            Configure locations, locker groups, and organizational policies.
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; font-size:14px;">
                          <strong>User & Role Management</strong><br />
                          <span style="color:#475569;">
                            Add admins, staff, and members with role-based access.
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; font-size:14px;">
                          <strong>Customer Management</strong><br />
                          <span style="color:#475569;">
                            Manage external users, tenants, or customers assigned to lockers.
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; font-size:14px;">
                          <strong>Real-Time Activity Tracking</strong><br />
                          <span style="color:#475569;">
                            Monitor locker usage, access events, and live system activity.
                          </span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

      

              <!-- CTA -->
              <table align="center" cellpadding="0" cellspacing="0" style="margin:38px auto;">
                <tr>
                  <td>
                    <a href="%LINK%"
                      style="
                        background-color:rgba(15,23,42,0.9);
                        color:#ffffff;
                        text-decoration:none;
                        padding:16px 44px;
                        border-radius:8px;
                        font-size:15px;
                        font-weight:bold;
                        display:inline-block;
                      ">
                      Accept Admin Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px; color:#64748b;">
                Or copy and paste this link into your browser:
              </p>

              <p style="word-break:break-all; font-size:13px; color:#0f172a;">
                %LINK%
              </p>

              <p style="font-size:13px; color:#64748b; margin-top:28px;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>

              <p style="margin-top:32px;">
                Regards,<br />
                <strong>DSV Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:16px 32px; font-size:12px; color:#94a3b8;">
              Secure • Scalable • Enterprise-Ready
            </td>
          </tr>

        </table>
        <!-- End Card -->

      </td>
    </tr>
  </table>

</body>
</html>
`,
        },
        redirect_url:
          "https://lms-60040289923.development.catalystserverless.in/app/",
      };

      const userConfig = {
        first_name: firstName,
        last_name: lastName,
        email_id: email,
        role_id: role,
      };

      const registeredUser = await this.auth.registerUser(
        signupConfig,
        userConfig
      );

      await this.datastore.table("users").insertRow({
        email: registeredUser.user_details.email_id,
        name: `${firstName} ${lastName}`,
        role,
        status: "ACTIVE",
        org_id: registeredUser.org_id,
        auth_user_id: registeredUser.user_details.user_id,
      });

      await this.datastore.table("lms_leads").updateRow({
        ROWID: rowId,
        converted: true,
      });

      return res.status(201).json({
        success: true,
        message: "Organization Admin invited successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /* ===============================
     GET ADMINS
     =============================== */
  async getAdmins(req, res) {
    try {
      const admins = await this.zcql.executeZCQLQuery(`
        SELECT * FROM users 
        WHERE role = '17682000000568001'
      `);

      return res.status(200).json({
        success: true,
        data: admins,
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch admin users",
      });
    }
  }

  /* ===============================
     GET ORGANIZATIONS
     =============================== */
  async getOrgs(req, res) {
    try {
      const orgs = await this.zcql.executeZCQLQuery(
        "SELECT * FROM organizations"
      );

      return res.status(200).json({
        success: true,
        data: orgs,
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch organizations",
      });
    }
  }

  /* ===============================
     DISABLE ORGANIZATION
     =============================== */
  async disableOrganization(req, res) {
    try {
      const { orgId } = req.params;

      // 1. Fetch organization details using ZCQL
      const orgResult = await this.zcql.executeZCQLQuery(
        `SELECT * FROM organizations WHERE orgId='${orgId}'`
      );

      console.log("Organization Result", orgResult);
      if (!orgResult || orgResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const orgData = orgResult[0].organizations; // ZCQL result structure

      // 2. Disable the organization
      await this.datastore.table("organizations").updateRow({
        ROWID: orgData.ROWID,
        status: "DISABLED",
      });

      // 3. Fetch all users of this organization using ZCQL
      const usersResult = await this.zcql.executeZCQLQuery(
        `SELECT ROWID FROM users WHERE org_id='${orgId}'`
      );
      console.log("Core the users results", usersResult);
      const users = usersResult?.map((u) => u.users.ROWID) || [];
      console.log("Filtered Users", users);

      // 4. Disable all users of this organization
      for (const userId of users) {
        await this.datastore.table("users").updateRow({
          ROWID: userId,
          status: "DISABLED",
        });
      }

      // 5. Prepare the email HTML content
      const htmlContent = `
    <div style="text-align: center; margin: 0 0 40px 0;">
      <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.2);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      </div>
      <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 12px 0;">Organization Disabled</h2>
    </div>
    
    <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border: 2px solid #e5e7eb; border-radius: 16px; padding: 32px; margin: 0 0 36px 0; text-align: center;">
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 8px 0;">
        <strong style="color: #1a1a1a; font-size: 18px;">${orgData.name}</strong>
      </p>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.7; margin: 0;">
        has been disabled by the system administrator.
      </p>
    </div>
    
    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px; margin: 0 0 36px 0; border-left: 4px solid #0284c7;">
      <p style="margin: 0; color: #0c4a6e; font-size: 15px; line-height: 1.7; text-align: center;">
        Please contact your administrator for further assistance and information.
      </p>
    </div>
    
    <div style="text-align: center; margin: 0;">
      <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);">
        Contact Administrator
      </a>
    </div>
    `;

      // 6. Send email to organization admins
      await this.sendOrgStatusEmail(
        orgId,
        "Action Required: Organization Disabled",
        htmlContent
      );

      return res.status(200).json({
        success: true,
        message: "Organization disabled and users notified via email",
      });
    } catch (error) {
      console.error("Error disabling organization:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to disable organization",
      });
    }
  }

  /* ===============================
     ENABLE ORGANIZATION
     =============================== */
  async enableOrganization(req, res) {
    try {
      const { orgId } = req.params;

      // 1. Fetch organization details using ZCQL
      const orgResult = await this.zcql.executeZCQLQuery(
        `SELECT * FROM organizations WHERE orgid='${orgId}'`
      );

      if (!orgResult || orgResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }

      const orgData = orgResult[0].organizations; // ZCQL result structure

      // 2. Enable the organization
      await this.datastore.table("organizations").updateRow({
        ROWID: orgData.ROWID,
        status: "ACTIVE",
      });

      // 3. Fetch all users of this organization using ZCQL
      const usersResult = await this.zcql.executeZCQLQuery(
        `SELECT ROWID FROM users WHERE org_id='${orgId}'`
      );

      const users = usersResult?.map((u) => u.users.ROWID) || [];

      // 4. Enable all users of this organization
      for (const userId of users) {
        await this.datastore.table("users").updateRow({
          ROWID: userId,
          status: "ACTIVE",
        });
      }

      // 5. Prepare email HTML content
      const htmlContent = `
    <div style="text-align: center; margin: 0 0 40px 0;">
      <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(34, 197, 94, 0.2);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="9 12 12 15 17 10"></polyline>
        </svg>
      </div>
      <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 700; margin: 0 0 12px 0;">Organization Enabled</h2>
    </div>
    
    <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border: 2px solid #e5e7eb; border-radius: 16px; padding: 32px; margin: 0 0 36px 0; text-align: center;">
      <p style="color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 8px 0;">
        <strong style="color: #1a1a1a; font-size: 18px;">${orgData.name}</strong>
      </p>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.7; margin: 0;">
        is now active. You may log in and resume using the system.
      </p>
    </div>
    
    <div style="text-align: center; margin: 0;">
      <a href="#" style="display: inline-block; background: linear-gradient(135deg, #34d399 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 10px 30px rgba(52, 211, 153, 0.4);">
        Contact Administrator
      </a>
    </div>
    `;

      // 6. Send email to organization admins
      await this.sendOrgStatusEmail(
        orgId,
        "Action Required: Organization Enabled",
        htmlContent
      );

      return res.status(200).json({
        success: true,
        message: "Organization enabled and users notified via email",
      });
    } catch (error) {
      console.error("Error enabling organization:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to enable organization",
      });
    }
  }

  /* ===============================
     DISABLE ADMIN
     =============================== */
  async disableAdminUser(req, res) {
    try {
      const { userId } = req.params;

      // 1. Fetch auth_user_id from users table using ZCQL
      const userResult = await this.zcql.executeZCQLQuery(`
          SELECT ROWID, auth_user_id
          FROM users
          WHERE auth_user_id = '${userId}'
        `);

      console.log("User Result", userResult);
      if (!userResult || userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Admin user not found",
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
        message: "Admin disabled successfully",
      });
    } catch (error) {
      console.error("Disable admin error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to disable admin",
      });
    }
  }

  /* ===============================
     ENABLE ADMIN
     =============================== */
  async enableAdminUser(req, res) {
    try {
      const { userId } = req.params;

      // 1. Fetch auth_user_id from users table using ZCQL
      const userResult = await this.zcql.executeZCQLQuery(`
          SELECT ROWID, auth_user_id
          FROM users
          WHERE auth_user_id = '${userId}'
        `);

      if (!userResult || userResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Admin user not found",
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
        message: "Admin enable successfully",
      });
    } catch (error) {
      console.error("Disable admin error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to disable admin",
      });
    }
  }

  /* ===============================
     PLATFORM ANALYTICS
     =============================== */
  async getPlatformOverview(req, res) {
    try {
      const [orgs, users, lockers, leads] = await Promise.all([
        this.zcql.executeZCQLQuery("SELECT status FROM organizations"),
        this.zcql.executeZCQLQuery("SELECT status FROM users"),
        this.zcql.executeZCQLQuery("SELECT ROWID FROM lockers"),
        this.zcql.executeZCQLQuery(`
            SELECT CREATEDTIME, converted
            FROM lms_leads
            ORDER BY CREATEDTIME
          `),
      ]);

      // 🔹 Lead aggregation (month-wise)
      const leadsPerMonthMap = {};

      leads.forEach((row) => {
        const createdTime = row.lms_leads.CREATEDTIME;
        const isConverted = row.lms_leads.converted === true;

        const date = new Date(createdTime);
        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!leadsPerMonthMap[monthKey]) {
          leadsPerMonthMap[monthKey] = {
            total: 0,
            converted: 0,
          };
        }

        leadsPerMonthMap[monthKey].total += 1;
        if (isConverted) {
          leadsPerMonthMap[monthKey].converted += 1;
        }
      });

      const leadsPerMonth = Object.entries(leadsPerMonthMap).map(
        ([month, data]) => ({
          month,
          total_leads: data.total,
          converted_leads: data.converted,
        })
      );

      // Logs (helpful during dev)
      console.log("Leads Per Month:", leadsPerMonth);

      return res.status(200).json({
        success: true,
        data: {
          // Existing stats
          totalOrganizations: orgs.length,
          activeOrganizations: orgs.filter(
            (o) => o.organizations.status === "ACTIVE"
          ).length,

          totalUsers: users.length,
          activeUsers: users.filter((u) => u.users.status === "ACTIVE").length,

          totalLockers: lockers.length,

          // NEW lead analytics
          totalLeads: leads.length,
          totalConvertedLeads: leads.filter(
            (l) => l.lms_leads.converted === true
          ).length,
          leadsPerMonth,
        },
      });
    } catch (error) {
      console.error("Platform Overview Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch analytics",
      });
    }
  }
}

module.exports = SuperAdminController;
