// index.js
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
// const cors = require('cors');
const lmsLeadRoutes = require('./routes/leadRoutes');

const app = express();


// Parse JSON body
app.use(express.json());
// Enable CORS
// app.use(cors());


// Initialize Catalyst for each request (optional but fine)
app.use((req, res, next) => {
  try {
    req.catalystApp = catalyst.initialize(req);
  } catch (err) {
    console.error('Catalyst initialization error:', err);
  }
  next();
});

// Apply limiter to all LMS leads routes
app.use('/lms-leads',lmsLeadRoutes);

// Health check (you can optionally *not* rate limit this)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LMS Leads API is running.',
  });
});

module.exports = app;
