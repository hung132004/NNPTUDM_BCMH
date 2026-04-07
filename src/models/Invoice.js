const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ["vehicle", "accessory"], required: true },
    description: { type: String, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    accessory: { type: mongoose.Schema.Types.ObjectId, ref: "Accessory", default: null },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    items: [invoiceItemSchema],
    subtotalAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["bank_transfer", "store_payment"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },
    issuedAt: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    shippingAddress: { type: String, required: true },
    storeAddress: { type: String, required: true },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
