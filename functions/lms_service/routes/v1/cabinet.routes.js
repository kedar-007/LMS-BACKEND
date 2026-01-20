const express = require("express");
const authorize = require("../middlewares/authorize");
const CabinetController = require("../controllers/CabinetController");

const router = express.Router();

router.post(
  "/",
  authorize("LMS.CABINET.CREATE"),
  (req, res) => new CabinetController(req).create(req, res)
);

router.get(
  "/",
  authorize("LMS.CABINET.READ"),
  (req, res) => new CabinetController(req).getByBranch(req, res)
);

module.exports = router;
