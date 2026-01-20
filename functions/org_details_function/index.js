// index.js
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const orgdetailsRoutes = require('./routes/orgdetailsRoutes');

const app = express();


// Parse JSON body
app.use(express.json());



// Initialize Catalyst for each request (optional but fine)
app.use((req, res, next) => {
  try {
    req.catalystApp = catalyst.initialize(req);
  } catch (err) {
    console.error('Catalyst initialization error:', err);
  }
  next();
});

// Apply limiter to all org details routes
app.use('/org-details', orgdetailsRoutes);

// Health check (you can optionally *not* rate limit this)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'org details API is running.',
  });
});

module.exports = app;
