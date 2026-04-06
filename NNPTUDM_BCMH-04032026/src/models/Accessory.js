const mongoose = require("mongoose");

const accessorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    category: { type: String, default: "Phu kien" },
    compatibleVehicles: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    price: { type: Number, required: true },
    salePrice: { type: Number, default: 0 },
    thumbnail: { type: String, default: "" },
    description: { type: String, default: "" },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Accessory", accessorySchema);
