const express = require("express");
const catalogController = require("../controllers/catalogController");

const router = express.Router();

router.get("/home", catalogController.getHomeData);
router.get("/vehicles", catalogController.getVehicles);
router.get("/accessories", catalogController.getAccessories);
router.get("/vehicles/:slug", catalogController.getVehicleBySlug);

module.exports = router;
