const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    country: { type: String, default: "" },
    logo: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Brand", brandSchema);
