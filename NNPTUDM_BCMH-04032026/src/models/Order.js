const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
      }
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipping", "completed", "cancelled"],
      default: "pending"
    },
    paymentMethod: { type: String, default: "COD" },
    shippingAddress: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
