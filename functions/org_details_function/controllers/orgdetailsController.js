// orgdetailsController.js
const catalyst = require('zcatalyst-sdk-node');
const { Readable } = require('stream');

const TABLE_NAME = 'org_details';

// Stratus bucket URL + bucket name
const STRATUS_BUCKET_URL = 'https://orgdocuments-development.zohostratus.in';
const STRATUS_BUCKET_NAME = 'orgdocuments';

const getTable = (req) => {
  const app = catalyst.initialize(req);
  return app.datastore().table(TABLE_NAME);
};

const encodeKeyForUrl = (key) =>
  key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');

const getFirstUploadedFile = (req) => {
  // When using multer.any(), files are available as an array on req.files
  if (Array.isArray(req.files) && req.files.length > 0) return req.files[0];

  // In case you later switch back to upload.single(...)
  if (req.file) return req.file;

  return null;
};

const uploadToStratus = async (req, { tenantId, file }) => {
  const app = catalyst.initialize(req);
  const bucket = app.stratus().bucket(STRATUS_BUCKET_NAME);

  // multer file props: originalname, mimetype, buffer
  const safeName = (file.originalname || 'document')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  const key = `org_details/${tenantId || 'unknown'}/${Date.now()}_${safeName}`;

  const stream = Readable.from(file.buffer);

  await bucket.putObject(key, stream, {
    overwrite: true,
    contentType: file.mimetype || 'application/octet-stream',
  });

  return `${STRATUS_BUCKET_URL}/${encodeKeyForUrl(key)}`;
};

// CREATE
exports.createOrgDetails = async (req, res) => {
  try {
    const table = getTable(req);
    console.log("body",req.body);

    const {
      tenant_id,
      org_name,
      org_email,
      org_contact_number,
      number_of_users,
      number_of_branches,
    } = req.body.data ? JSON.parse(req.body.data) : req.body;

    if (!tenant_id || !org_name || !org_email || !org_contact_number) {
      return res.status(400).json({
        success: false,
        message:
          'tenant_id, org_name, org_email, org_contact_number are required.',
      });
    }

    let document_file_url = null;

    console.log("files",req.files);

    const uploadedFile = getFirstUploadedFile(req);


    if (uploadedFile) {
      document_file_url = await uploadToStratus(req, {
        tenantId: tenant_id,
        file: uploadedFile,
      });
    }

    const rowCreated = await table.insertRow({
      tenant_id,
      org_name,
      org_email,
      org_contact_number,
      number_of_users:
        number_of_users !== undefined && number_of_users !== null && number_of_users !== ''
          ? String(number_of_users)
          : null,
      number_of_branches:
        number_of_branches !== undefined && number_of_branches !== null && number_of_branches !== ''
          ? String(number_of_branches)
          : null,
      document_file_url,
    });

    return res.status(201).json({ success: true, data: rowCreated });
  } catch (err) {
    console.error('createOrgDetails error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating org details.',
      error: err.message,
    });
  }
};

// ✅ READ ALL (paged)
exports.getAllOrgDetails = async (req, res) => {
  try {
    const table = getTable(req);

    let allRows = [];
    let hasNext = true;
    let nextToken;

    while (hasNext) {
      const page = await table.getPagedRows({
        nextToken,
        maxRows: 200,
      });

      const { data, next_token, more_records } = page;

      if (Array.isArray(data) && data.length) allRows = allRows.concat(data);

      hasNext = !!more_records;
      nextToken = next_token;
    }

    return res.status(200).json({ success: true, data: allRows });
  } catch (err) {
    console.error('getAllOrgDetails error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching org details.',
      error: err.message,
    });
  }
};

// ✅ READ ONE by ROWID
exports.getOrgDetailsById = async (req, res) => {
  try {
    const table = getTable(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ROWID is required in URL.',
      });
    }

    const row = await table.getRow(id);

    return res.status(200).json({ success: true, data: row });
  } catch (err) {
    console.error('getOrgDetailsById error:', err);
    if (err.code === 'NO_SUCH_ROW') {
      return res
        .status(404)
        .json({ success: false, message: 'Record not found.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching org detail.',
      error: err.message,
    });
  }
};

// ✅ UPDATE (supports new file upload)
exports.updateOrgDetails = async (req, res) => {
  try {
    const table = getTable(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ROWID is required in URL.',
      });
    }

    const {
      tenant_id,
      org_name,
      org_email,
      org_contact_number,
      number_of_users,
      number_of_branches,
    } = req.body;

    const updateData = { ROWID: id };

    if (tenant_id !== undefined) updateData.tenant_id = tenant_id;
    if (org_name !== undefined) updateData.org_name = org_name;
    if (org_email !== undefined) updateData.org_email = org_email;
    if (org_contact_number !== undefined)
      updateData.org_contact_number = org_contact_number;

    if (number_of_users !== undefined)
      updateData.number_of_users =
        number_of_users !== null && number_of_users !== ''
          ? String(number_of_users)
          : null;

    if (number_of_branches !== undefined)
      updateData.number_of_branches =
        number_of_branches !== null && number_of_branches !== ''
          ? String(number_of_branches)
          : null;

    // ✅ Works with multer.any() OR multer.single()
    const uploadedFile = getFirstUploadedFile(req);
    if (uploadedFile) {
      const tenantForKey = tenant_id || 'unknown';
      updateData.document_file_url = await uploadToStratus(req, {
        tenantId: tenantForKey,
        file: uploadedFile,
      });
    }

    // Must update at least one field besides ROWID
    if (Object.keys(updateData).length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update.',
      });
    }

    const updatedRow = await table.updateRow(updateData);

    return res.status(200).json({ success: true, data: updatedRow });
  } catch (err) {
    console.error('updateOrgDetails error:', err);
    if (err.code === 'NO_SUCH_ROW') {
      return res
        .status(404)
        .json({ success: false, message: 'Record not found.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating org details.',
      error: err.message,
    });
  }
};

// ✅ DELETE
exports.deleteOrgDetails = async (req, res) => {
  try {
    const table = getTable(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ROWID is required in URL.',
      });
    }

    await table.deleteRow(id);

    return res
      .status(200)
      .json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    console.error('deleteOrgDetails error:', err);
    if (err.code === 'NO_SUCH_ROW') {
      return res
        .status(404)
        .json({ success: false, message: 'Record not found.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting org details.',
      error: err.message,
    });
  }
};
