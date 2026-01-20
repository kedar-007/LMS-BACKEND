// orgdetailsRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();

const {
  createOrgDetails,
  getAllOrgDetails,
  getOrgDetailsById,
  updateOrgDetails,
  deleteOrgDetails,
} = require('../controllers/orgdetailsController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// ✅ Accept file with ANY field name (prevents "Unexpected field")
router.post('/add', upload.any(), createOrgDetails);
router.get('/all', getAllOrgDetails);
router.get('/:id', getOrgDetailsById);
router.put('/:id', upload.any(), updateOrgDetails);
router.delete('/:id', deleteOrgDetails);

module.exports = router;
