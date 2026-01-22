// routes/lockers.js
const router = require("express").Router();
const controller = require("../controllers/locker.controller");

/*
  INDUSTRY LOCKERS
*/

// create
router.post("/industry-lockers", controller.createIndustryLocker);

// step-1: list all names (dropdown)
router.get("/industry-lockers", controller.listIndustryLockers);

// step-2: selected industry locker -> list cabinets created
router.get(
  "/industry-lockers/:rowId/cabinets",
  controller.listIndustryLockerCabinets
);

// ✅ step-3: cabinet details by cabinetId (NOT modelName)
router.get(
  "/industry-lockers/:rowId/cabinets/:cabinetId",
  controller.getIndustryLockerCabinetDetails
);

/*
  NORMAL LOCKERS
*/
router.post("/", controller.createLocker);
router.get("/", controller.getLockers);
router.get("/:id", controller.getLockerById);
router.put("/:id", controller.updateLocker);
router.delete("/:id", controller.deleteLocker);

module.exports = router;
