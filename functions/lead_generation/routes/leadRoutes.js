// lms_leadRoutes.js
const express = require('express');
const router = express.Router();

const {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
} = require('../controllers/leadController');

// Base path: /lms-leads

router.post('/add', createLead);
router.get('/all', getAllLeads);
router.get('/:id', getLeadById);  
router.put('/:id', updateLead);   
router.delete('/:id', deleteLead);

module.exports = router;
