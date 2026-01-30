const express = require("express");
const router = express.Router();
const OrgAdminController = require("../controllers/orgAdmin.controller");

/**
 * ORG ADMIN ROUTES
 * Base Path: /org-admin
 * Access: Organization Admin only
 */

/* ================================
   ORGANIZATION MANAGEMENT
================================ */

// Create Organization
router.post("/create-org", (req, res) => {
  return new OrgAdminController(req).createOrg(req, res);
});

// Update Organization
router.post("/update-org", (req, res) => {
  return new OrgAdminController(req).updateOrg(req, res);
});

// Get Organization Details
router.get("/org-details", (req, res) => {
  return new OrgAdminController(req).getOrgdetails(req, res);
});


/* ================================
   USER MANAGEMENT
================================ */

// Invite user to organization (Doctor / Staff / Manager)
router.post("/:orgId/invite-user", (req, res) => {
  return new OrgAdminController(req).inviteUserOrg(req, res);
});

// Get all users of organization
router.get("/:orgId/users", (req, res) => {
  return new OrgAdminController(req).getOrgUsers(req, res);
});

// Disable organization user
router.patch("/users/:userId/disable", (req, res) => {
  return new OrgAdminController(req).disableOrgUser(req, res);
});

// Enable organization user
router.patch("/users/:userId/enable", (req, res) => {
  return new OrgAdminController(req).enableOrgUser(req, res);
});

/* ================================
   CUSTOMER MANAGEMENT
================================ */

// Invite customer to organization
router.post("/:orgId/invite-customer", (req, res) => {
  return new OrgAdminController(req).inviteCustomerOrg(req, res);
});

/* ================================
   ORGANIZATION OVERVIEW & ANALYTICS
================================ */

// Organization overview (counts + graph data)
router.get("/:orgId/overview", (req, res) => {
  return new OrgAdminController(req).getOrgOverview(req, res);
});

// Booking analytics (graph data)
router.get("/:orgId/analytics-lockers", (req, res) => {
  return new OrgAdminController(req).getOrgOverviewGraphs(req, res);
});

/* ================================ 
    Get Bookings of the organization
===================================*/
router.get("/:orgId/bookings",(req,res) =>{
  return new OrgAdminController(req).getOrgBookings(req,res)
})
/* ================================
   SUBSCRIPTION MANAGEMENT
================================ */

// Buy / Upgrade subscription plan
router.post("/:orgId/subscription", (req, res) => {
  return new OrgAdminController(req).subscribeToPlan(req, res);
});

// Get active subscription
router.get("/:orgId/subscription", (req, res) => {
  return new OrgAdminController(req).getSubscription(req, res);
});

/* 
============================
ORGANIZATION CONFIRMATION
============================
*/

router.post("/:orgId/stripe-config",(req,res) =>{
  return new OrgAdminController(req).addStripeConfig(req,res);
})
router.get("/:orgId/stripe-config",(req,res) =>{
  return new OrgAdminController(req).getStripeConfig(req,res);
})
router.put("/:orgId/stripe-config",(req,res) =>{
  return new OrgAdminController(req).updateStripeConfig(req,res);
})


/* 
=============================
Organization Payment analytics
=============================
*/

router.get("/:orgId/payment-analytics",(req,res) =>{
  return new OrgAdminController(req).getPaymentAnalytics(req,res);
})

//get recent payments in the organizations

router.get("/:orgId/payments/recent",(req,res) =>{
  return new OrgAdminController(req).getRecentOrgPayments(req,res);
})

module.exports = router;
