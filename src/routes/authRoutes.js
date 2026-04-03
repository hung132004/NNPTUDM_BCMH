const express = require("express");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { fullName, username, email, password, phone, address } = req.body;
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!String(fullName || "").trim()) {
      return res.status(400).json({ message: "Vui long nhap ho ten" });
    }

    if (!normalizedUsername) {
      return res.status(400).json({ message: "Vui long nhap ten dang nhap" });
    }

    if (String(password || "").length < 6) {
      return res.status(400).json({ message: "Mat khau phai co it nhat 6 ky tu" });
    }

    const existingUser = await User.findOne({ username: normalizedUsername });

    if (existingUser) {
      return res.status(400).json({ message: "Ten dang nhap da ton tai" });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      phone,
      address
    });

    res.status(201).json({
      message: "Dang ky thanh cong",
      token: generateToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const normalizedUsername = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!normalizedUsername) {
      return res.status(400).json({ message: "Vui long nhap ten dang nhap" });
    }

    if (!password) {
      return res.status(400).json({ message: "Vui long nhap mat khau" });
    }

    const user = await User.findOne({ username: normalizedUsername });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Sai ten dang nhap hoac mat khau" });
    }

    res.json({
      message: "Dang nhap thanh cong",
      token: generateToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
