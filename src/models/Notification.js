const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["order_status", "promotion", "new_product", "review", "system"],
      default: "system"
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
    relatedTo: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      kind: { type: String, default: "" }
    },
    link: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
