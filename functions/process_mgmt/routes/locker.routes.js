const router = require("express").Router();
const controller = require("../controllers/locker.controller");

router.post("/", controller.createLocker);
router.get("/", controller.getLockers);
router.get("/:id", controller.getLockerById);
router.put("/:id", controller.updateLocker);
// router.patch("/:id/status", controller.updateLockerStatus);
router.delete("/:id", controller.deleteLocker);

module.exports = router;
