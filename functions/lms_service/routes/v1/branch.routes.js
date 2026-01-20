const express = require("express");
const authorize = require("../middlewares/authorize");
const BranchController = require("../controllers/BranchController");

const router = express.Router();

router.post(
  "/",
  authorize("LMS.BRANCH.CREATE"),
  (req, res) => new BranchController(req).create(req, res)
);

router.get(
  "/",
  authorize("LMS.BRANCH.READ"),
  (req, res) => new BranchController(req).getAll(req, res)
);

router.put(
  "/:branchId",
  authorize("LMS.BRANCH.UPDATE"),
  (req, res) => new BranchController(req).update(req, res)
);

router.delete(
  "/:branchId",
  authorize("LMS.BRANCH.DELETE"),
  (req, res) => new BranchController(req).remove(req, res)
);

module.exports = router;
