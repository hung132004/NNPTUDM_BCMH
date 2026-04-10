const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/google/config", authController.getGoogleConfig);
router.post("/google", authController.googleLogin);
router.get("/me", protect, authController.getCurrentUser);

module.exports = router;
