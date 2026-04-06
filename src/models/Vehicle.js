const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    engine: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    price: { type: Number, required: true },
    salePrice: { type: Number, default: 0 },
    thumbnail: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    specs: { type: [String], default: [] },
    description: { type: String, default: "" },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
