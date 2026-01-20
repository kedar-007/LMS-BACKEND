const express = require("express");
const SuperAdminController = require("../controllers/superAdmin.controller");

const router = express.Router();

/**
 * ===============================
 * ORGANIZATION MANAGEMENT
 * ===============================
 */

// Add organization admin (creates org + admin or admin only)
router.post(
  "/orgs/add-admin",
  (req, res) => new SuperAdminController(req).addOrgUser(req, res)
);

// Get all organizations
router.get(
  "/orgs",
  (req, res) => new SuperAdminController(req).getOrgs(req, res)
);

// Disable an organization
router.patch(
  "/orgs/:orgId/disable",
  (req, res) => new SuperAdminController(req).disableOrganization(req, res)
);

// Enable an organization
router.patch(
  "/orgs/:orgId/enable",
  (req, res) => new SuperAdminController(req).enableOrganization(req, res)
);

/**
 * ===============================
 * ADMIN / USER MANAGEMENT
 * ===============================
 */

// Get all org admins
router.get(
  "/admins",
  (req, res) => new SuperAdminController(req).getAdmins(req, res)
);

// Disable an org admin
router.patch(
  "/admins/:userId/disable",
  (req, res) => new SuperAdminController(req).disableAdminUser(req, res)
);

// Enable an org admin
router.patch(
  "/admins/:userId/enable",
  (req, res) => new SuperAdminController(req).enableAdminUser(req, res)
);

/**
 * ===============================
 * PLATFORM ANALYTICS
 * ===============================
 */

// High-level dashboard analytics
router.get(
  "/analytics/overview",     
  (req, res) => new SuperAdminController(req).getPlatformOverview(req, res)
);

// // Detailed entity counts
// router.get(
//   "/analytics/counts",
//   (req, res) => new SuperAdminController(req).getEntityCounts(req, res)
// );

module.exports = router;
