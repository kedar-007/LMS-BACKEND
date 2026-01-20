const express = require("express");
const authorize = require("../middlewares/authorize");
const LockerController = require("../controllers/LockerController");

const router = express.Router();

router.post(
  "/",
  authorize("LMS.LOCKER.CREATE"),
  (req, res) => new LockerController(req).create(req, res)
);

router.patch(
  "/:lockerId/status",
  authorize("LMS.LOCKER.STATUS"),
  (req, res) => new LockerController(req).changeStatus(req, res)
);

router.get(
  "/available",
  authorize("LMS.LOCKER.READ"),
  (req, res) => new LockerController(req).available(req, res)
);

module.exports = router;
