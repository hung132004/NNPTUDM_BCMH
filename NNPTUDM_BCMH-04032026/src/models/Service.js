const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    serviceType: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
