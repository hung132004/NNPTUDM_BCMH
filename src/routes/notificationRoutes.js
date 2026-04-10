const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(protect);

router.get("/", notificationController.getNotifications);
router.get("/count/unread", notificationController.getUnreadCount);
router.get("/:id", notificationController.getNotificationById);
router.post("/", authorize("admin"), notificationController.createNotification);
router.patch("/:id/read", notificationController.markNotificationRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
