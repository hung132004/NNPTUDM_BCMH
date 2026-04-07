const Notification = require("../models/Notification");
const User = require("../models/User");
const { getIo } = require("./socket");

async function createNotification(userId, payload) {
  const notification = await Notification.create({
    user: userId,
    type: payload.type || "system",
    title: String(payload.title || "").trim(),
    message: String(payload.message || "").trim(),
    link: String(payload.link || "").trim(),
    relatedTo: payload.relatedTo || { id: null, kind: "" }
  });

  try {
    const io = getIo();
    io.to(String(userId)).emit("notification:new", notification);
  } catch (_error) {
    // Socket may not be initialized during tests or seed operations
  }

  return notification;
}

async function createNotificationForAdmins(payload) {
  const admins = await User.find({ role: "admin" }).select("_id");

  if (!admins.length) {
    return [];
  }

  return Promise.all(admins.map((admin) => createNotification(admin._id, payload)));
}

module.exports = { createNotification, createNotificationForAdmins };
