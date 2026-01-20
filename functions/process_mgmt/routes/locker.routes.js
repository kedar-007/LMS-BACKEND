const router = require("express").Router();
const controller = require("../controllers/locker.controller");

/*
  INDUSTRY LOCKERS (KEEP THIS ABOVE /:id ROUTE)
*/

// create
router.post("/industry-lockers", controller.createIndustryLocker);

// step-1: list all names (dropdown)
router.get("/industry-lockers", controller.listIndustryLockers);

// step-2: for selected company (rowId) -> list cabinet sizes/models
router.get(
  "/industry-lockers/:rowId/cabinets",
  controller.listIndustryLockerCabinets
);

// step-3: for selected size/model -> full model detail
router.get(
  "/industry-lockers/:rowId/cabinets/:modelName",
  controller.getIndustryLockerCabinetDetails
);

// Optional by name (enable only if you implement service/controller)
// router.get(
//   "/industry-lockers/by-name/:name/cabinets",
//   controller.listIndustryLockerCabinetsByName
// );

/*
  NORMAL LOCKERS
*/

// create locker
router.post("/", controller.createLocker);

// list lockers (by cabinet_id query param)
router.get("/", controller.getLockers);

// booking (optional) - keep it before "/:id" if you add it
// router.post("/:lockerId/book", controller.bookLocker);

// locker by id
router.get("/:id", controller.getLockerById);
router.put("/:id", controller.updateLocker);
router.delete("/:id", controller.deleteLocker);

module.exports = router;
