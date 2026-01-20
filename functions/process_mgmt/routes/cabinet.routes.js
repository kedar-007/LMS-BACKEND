const router = require("express").Router();
const controller = require("../controllers/cabinet.controller");

/*
  POST   /v1/cabinets
  Create cabinet with lockers
*/
router.post("/", controller.createCabinetWithLockers);

/*
  GET    /v1/cabinets?org_id=&branch_id=
  Get all cabinets in a branch
*/
router.get("/", controller.getCabinetsByBranch);

/*
  GET    /v1/cabinets/:id?org_id=
  Get cabinet with lockers
*/
router.get("/:cabinet_id", controller.getCabinetById);

/*
  PUT    /v1/cabinets/:id
  Update cabinet
*/
router.put("/:id", controller.updateCabinet);

/*
  DELETE /v1/cabinets/:id
  Soft delete cabinet
*/
router.delete("/:id", controller.deleteCabinet);

module.exports = router;
