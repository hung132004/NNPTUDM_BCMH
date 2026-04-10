const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const serviceController = require("../controllers/serviceController");

const router = express.Router();

router.get("/my-services", protect, authorize("user", "admin"), serviceController.getMyServices);
router.get("/vehicle/:vehicleId", protect, serviceController.getVehicleServices);
router.post("/", protect, authorize("user", "admin"), serviceController.createService);
router.get("/", protect, authorize("admin"), serviceController.getAllServices);
router.patch("/:id", protect, authorize("admin"), serviceController.updateServiceStatus);
router.delete("/:id", protect, authorize("admin"), serviceController.deleteService);

module.exports = router;
