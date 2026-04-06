const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [
      {
        itemType: { type: String, enum: ["vehicle", "accessory"], required: true, default: "vehicle" },
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
        accessory: { type: mongoose.Schema.Types.ObjectId, ref: "Accessory", default: null },
        quantity: { type: Number, default: 1, min: 1 },
        price: { type: Number, required: true }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
