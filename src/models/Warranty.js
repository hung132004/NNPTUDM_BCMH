const mongoose = require("mongoose");

const warrantySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemType: { type: String, enum: ["accessory", "vehicle", "service"], required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    accessory: { type: mongoose.Schema.Types.ObjectId, ref: "Accessory", default: null },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    warrantyType: { type: String, default: "standard" },
    status: {
      type: String,
      enum: ["active", "claimed", "resolved", "rejected", "expired"],
      default: "active"
    },
    issueDescription: { type: String, default: "" },
    resolutionNotes: { type: String, default: "" },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    claimDate: { type: Date, default: null }
  },
  { timestamps: true }
);

warrantySchema.pre("validate", function (next) {
  if (!this.endDate) {
    const start = this.startDate || new Date();
    const periodDays = this.itemType === "service" ? 180 : 365;
    this.endDate = new Date(start.getTime() + periodDays * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("Warranty", warrantySchema);
