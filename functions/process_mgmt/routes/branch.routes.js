const express = require("express");
const controller = require("../controllers/branch.controller");
const router = express.Router();

router.post("/", controller.createBranch);
router.get("/", controller.getBranches);
router.get("/:id", controller.getBranchById);
router.get("/:id/summary", controller.getBranchSummary);
router.put("/:id", controller.updateBranch);
router.delete("/:id", controller.deleteBranch);

module.exports = router;
