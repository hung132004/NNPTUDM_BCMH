const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        itemType: { type: String, enum: ["vehicle", "accessory"], required: true, default: "vehicle" },
        vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
        accessory: { type: mongoose.Schema.Types.ObjectId, ref: "Accessory", default: null },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
      }
    ],
    subtotalAmount: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    shippingFee: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipping", "completed", "cancelled"],
      default: "pending"
    },
    paymentMethod: { type: String, enum: ["bank_transfer", "store_payment"], default: "store_payment" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    fulfillmentMethod: { type: String, enum: ["pickup", "delivery"], default: "pickup" },
    shippingAddress: { type: String, required: true },
    distanceKm: { type: Number, default: 0 },
    storeAddress: {
      type: String,
      default: "1 DN11, Khu Pho 4, Dong Hung Thuan, Ho Chi Minh"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
