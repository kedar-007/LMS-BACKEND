const express = require("express");
const router = express.Router();

router.use("/branches", require("./branch.routes"));
router.use("/cabinets", require("./cabinet.routes"));
router.use("/lockers", require("./locker.routes"));

module.exports = router;
