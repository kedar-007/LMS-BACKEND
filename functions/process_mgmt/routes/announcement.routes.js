const express = require("express");
const router = express.Router();

const controller = require("../controllers/announcement.controller");
console.log("CALLED");

// CREATE
router.post("/:orgId/create", controller.createAnnouncement);

// READ (ALL – ORG)
router.get("/:orgId", controller.getAnnouncements);

// READ (ACTIVE – ORG)
router.get("/:orgId/active", controller.getActiveAnnouncements);

// READ (SINGLE)
router.get("/:orgId/:announcementId", controller.getAnnouncementById);

// UPDATE
router.put("/:orgId/:announcementId", controller.updateAnnouncement);

// DELETE (SOFT)
router.delete("/:orgId/:announcementId", controller.deleteAnnouncement);

module.exports = router;
