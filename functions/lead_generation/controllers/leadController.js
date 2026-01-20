// lms_leadController.js
const catalyst = require('zcatalyst-sdk-node');

const TABLE_NAME = 'lms_leads';

// Admin email to receive notifications
const ADMIN_EMAIL = 'rohan@fristinetech.com';

// Helper to get table reference
const getLeadsTable = (req) => {
  const catalystApp = catalyst.initialize(req);
  const datastore = catalystApp.datastore();
  return datastore.table(TABLE_NAME);
};

// ✅ CREATE Lead + send email to admin (light, white-theme email template)
exports.createLead = async (req, res) => {
  try {
    const table = getLeadsTable(req);
    const { name, email, contact_number } = req.body;

    if (!name || !email || !contact_number) {
      return res.status(400).json({
        success: false,
        message: 'name, email, and contact_number are required.',
      });
    }

    const rowData = { name, email, contact_number };

    // 1) Insert row in lms_leads table
    const rowCreated = await table.insertRow(rowData);

    // 2) Send notification email to admin via Catalyst Mail
    try {
      const catalystApp = catalyst.initialize(req);
      const emailComp = catalystApp.email();

      const mailConfig = {
        from_email: 'rohan@fristinetech.com', // must be configured in Catalyst Mail
        to_email: [ADMIN_EMAIL],
        subject: 'New Lead Received – LMS Portal',
        html_mode: true,
        content: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>New Lead Notification</title>
          </head>
          <body style="margin:0; padding:0; background-color:#f3f4f6;">
            <!-- Full-width background -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0; padding:0; background-color:#f3f4f6;">
              <tr>
                <td align="center" style="padding:24px 12px;">
                  <!-- Main container (centered, responsive) -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:720px; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb; box-shadow:0 4px 16px rgba(15,23,42,0.08);">
                    <!-- Header -->
                    <tr>
                      <td style="padding:18px 24px; background:linear-gradient(135deg,#3b82f6,#2563eb);">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:18px; font-weight:600; color:#ffffff;">
                              LMS – New Lead Notification
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top:4px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; color:#e5efff;">
                              A new lead has been captured in your LMS application.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Sub-header -->
                    <tr>
                      <td style="padding:14px 24px 0; background-color:#ffffff;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td align="left">
                              <span style="display:inline-block; padding:5px 12px; border-radius:9999px; border:1px solid #d1d5db; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:500; color:#4b5563; text-transform:uppercase; letter-spacing:0.08em; background-color:#f9fafb;">
                                New Lead · LMS Portal
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding:16px 24px 8px; background-color:#ffffff;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:16px; font-weight:600; color:#111827; padding-bottom:6px;">
                              Lead Details
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; color:#6b7280; padding-bottom:16px;">
                              You’re receiving this email because a new lead was submitted via the LMS Leads module.
                            </td>
                          </tr>
                        </table>

                        <!-- Lead details table -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; background-color:#ffffff;">
                          <tr style="background-color:#f9fafb;">
                            <td style="padding:10px 12px; width:35%; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:600; color:#374151; border-bottom:1px solid #e5e7eb;">
                              Name
                            </td>
                            <td style="padding:10px 12px; width:65%; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; color:#111827; border-bottom:1px solid #e5e7eb;">
                              ${name}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:600; color:#374151; background-color:#f9fafb; border-bottom:1px solid #e5e7eb;">
                              Email
                            </td>
                            <td style="padding:10px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; color:#111827; border-bottom:1px solid #e5e7eb;">
                              <a href="mailto:${email}" style="color:#2563eb; text-decoration:none;">${email}</a>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:600; color:#374151; background-color:#f9fafb;">
                              Contact Number
                            </td>
                            <td style="padding:10px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; color:#111827;">
                              ${contact_number}
                            </td>
                          </tr>
                        </table>

                        <!-- CTA + meta -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;">
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; color:#4b5563; padding-bottom:6px;">
                              You can review and manage this lead from your LMS admin panel.
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-bottom:10px;">
                              <!-- CTA button: replace href with your real LMS admin URL -->
                              <a href="https://your-lms-admin-url.com/leads"
                                 style="display:inline-block; padding:9px 18px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:500; color:#ffffff; background-color:#2563eb; border-radius:9999px; text-decoration:none; box-shadow:0 6px 12px rgba(37,99,235,0.35);">
                                Open LMS Leads
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:11px; color:#9ca3af;">
                              If you did not expect this email, you can safely ignore it.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color:#f9fafb; border-top:1px solid #e5e7eb; padding:12px 24px 14px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:11px; color:#6b7280; text-align:center;">
                              &copy; ${new Date().getFullYear()} LMS Application. All rights reserved.
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; font-size:11px; color:#9ca3af; text-align:center; padding-top:3px;">
                              This is an automated notification from the LMS Leads system. Please do not reply.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <!-- End main container -->
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      await emailComp.sendMail(mailConfig);
    } catch (mailErr) {
      console.error('Error sending notification email:', mailErr);
      // Do not fail the API if email fails; just log it
    }

    return res.status(201).json({
      success: true,
      data: rowCreated,
      message: 'Lead created successfully and notification email triggered.',
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating lead.',
      error: err.message,
    });
  }
};

// ✅ GET All Leads (using getPagedRows)
exports.getAllLeads = async (req, res) => {
  try {
    const table = getLeadsTable(req);

    let allRows = [];
    let hasNext = true;
    let nextToken = undefined;

    while (hasNext) {
      const pageResponse = await table.getPagedRows({
        nextToken,
        maxRows: 200,
      });

      const { data, next_token, more_records } = pageResponse;

      if (Array.isArray(data) && data.length > 0) {
        allRows = allRows.concat(data);
      }

      hasNext = !!more_records;
      nextToken = next_token;
    }

    return res.status(200).json({
      success: true,
      data: allRows,
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching leads.',
      error: err.message,
    });
  }
};

// ✅ GET Single Lead by ROWID
exports.getLeadById = async (req, res) => {
  try {
    const table = getLeadsTable(req);
    const { id } = req.params;

    const row = await table.getRow(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: row,
    });
  } catch (err) {
    console.error('Error fetching lead by id:', err);
    if (err.code === 'NO_SUCH_ROW') {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching lead.',
      error: err.message,
    });
  }
};

// ✅ UPDATE Lead by ROWID
exports.updateLead = async (req, res) => {
  try {
    const table = getLeadsTable(req);
    const { id } = req.params;
    const { name, email, contact_number } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (contact_number !== undefined) updateData.contact_number = contact_number;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one of name, email, or contact_number must be provided to update.',
      });
    }

    updateData.ROWID = id;

    const updatedRow = await table.updateRow(updateData);

    return res.status(200).json({
      success: true,
      data: updatedRow,
    });
  } catch (err) {
    console.error('Error updating lead:', err);
    if (err.code === 'NO_SUCH_ROW') {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating lead.',
      error: err.message,
    });
  }
};

// ✅ DELETE Lead by ROWID
exports.deleteLead = async (req, res) => {
  try {
    const table = getLeadsTable(req);
    const { id } = req.params;

    await table.deleteRow(id);

    return res.status(200).json({
      success: true,
      message: 'Lead deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting lead:', err);
    if (err.code === 'NO_SUCH_ROW') {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting lead.',
      error: err.message,
    });
  }
};
