const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");
const User = require("../models/User");

const router = express.Router();

router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

router.get("/count/unread", async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Khong tim thay thong bao" });
    }

    if (!notification.user.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Ban khong co quyen truy cap thong bao nay" });
    }

    res.json({ notification });
  } catch (error) {
    next(error);
  }
});

router.post("/", authorize("admin"), async (req, res, next) => {
  try {
    const { userId, type, title, message, link, relatedTo } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ message: "Thieu thong tin thong bao" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Nguoi dung khong ton tai" });
    }

    const notification = await Notification.create({
      user: user._id,
      type: type || "system",
      title: title.trim(),
      message: String(message || "").trim(),
      link: String(link || "").trim(),
      relatedTo: relatedTo || { id: null, kind: "" }
    });

    res.status(201).json({ message: "Da tao thong bao", notification });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Khong tim thay thong bao" });
    }

    if (!notification.user.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Ban khong co quyen cap nhat thong bao nay" });
    }

    notification.isRead = req.body.isRead === false || req.body.isRead === "false" ? false : true;
    await notification.save();

    res.json({ message: "Da cap nhat trang thai thong bao", notification });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Khong tim thay thong bao" });
    }

    if (!notification.user.equals(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Ban khong co quyen xoa thong bao nay" });
    }

    await notification.deleteOne();
    res.json({ message: "Da xoa thong bao" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
