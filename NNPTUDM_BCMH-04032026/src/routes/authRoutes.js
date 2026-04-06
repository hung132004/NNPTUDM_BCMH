const express = require("express");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function buildAuthResponse(user, message) {
  return {
    message,
    token: generateToken(user._id),
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      authProvider: user.authProvider
    }
  };
}

async function generateUniqueUsername(baseValue) {
  const baseUsername = String(baseValue || "google-user")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "google-user";

  let username = baseUsername;
  let suffix = 1;

  while (await User.findOne({ username })) {
    username = `${baseUsername.slice(0, 20)}-${suffix}`;
    suffix += 1;
  }

  return username;
}

async function verifyGoogleIdToken(idToken) {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Khong xac thuc duoc tai khoan Google");
  }

  const payload = await response.json();
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("He thong chua cau hinh GOOGLE_CLIENT_ID");
  }

  if (payload.aud !== clientId) {
    throw new Error("Google token khong dung voi ung dung nay");
  }

  if (payload.email_verified !== "true") {
    throw new Error("Email Google chua duoc xac minh");
  }

  return payload;
}

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

    res.status(201).json(buildAuthResponse(user, "Dang ky thanh cong"));
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

    res.json(buildAuthResponse(user, "Dang nhap thanh cong"));
  } catch (error) {
    next(error);
  }
});

router.get("/google/config", (_req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || ""
  });
});

router.post("/google", async (req, res, next) => {
  try {
    const idToken = String(req.body.idToken || "").trim();

    if (!idToken) {
      return res.status(400).json({ message: "Thieu Google token" });
    }

    const payload = await verifyGoogleIdToken(idToken);
    const email = String(payload.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Tai khoan Google khong co email hop le" });
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email }]
    });

    if (!user) {
      const username = await generateUniqueUsername(email.split("@")[0] || payload.name);
      user = await User.create({
        fullName: payload.name || username,
        username,
        email,
        password: `${payload.sub}-${Date.now()}-google`,
        googleId: payload.sub,
        authProvider: "google",
        avatar: payload.picture || ""
      });
      return res.status(201).json(buildAuthResponse(user, "Dang nhap Google thanh cong"));
    }

    if (!user.googleId) {
      user.googleId = payload.sub;
    }

    user.fullName = payload.name || user.fullName;
    user.email = email;
    user.avatar = payload.picture || user.avatar;
    user.authProvider = "google";
    await user.save();

    res.json(buildAuthResponse(user, "Dang nhap Google thanh cong"));
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
