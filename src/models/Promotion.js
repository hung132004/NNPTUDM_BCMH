const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Promotion", promotionSchema);
