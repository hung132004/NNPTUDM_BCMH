const Order = require("../models/Order");
const Warranty = require("../models/Warranty");
const Service = require("../models/Service");
const { createNotificationForAdmins } = require("../utils/notificationHelper");

async function createWarranty(req, res, next) {
  try {
    const { orderId, serviceId, itemType, accessoryId, vehicleId, warrantyType, issueDescription } = req.body;
    const normalizedItemType = String(itemType || "").toLowerCase();

    if (!["accessory", "vehicle", "service"].includes(normalizedItemType)) {
      return res.status(400).json({ message: "Loai bao hanh khong hop le" });
    }

    const warrantyData = {
      user: req.user._id,
      itemType: normalizedItemType,
      warrantyType: warrantyType || "standard",
      issueDescription: String(issueDescription || "").trim()
    };

    if (normalizedItemType === "service") {
      const service = await Service.findOne({ _id: serviceId, user: req.user._id });
      if (!service) {
        return res.status(404).json({ message: "Khong tim thay dich vu de bao hanh" });
      }
      warrantyData.service = service._id;
    } else {
      if (!orderId) {
        return res.status(400).json({ message: "Vui long cung cap ma don hang" });
      }

      const order = await Order.findOne({ _id: orderId, user: req.user._id }).populate("items.vehicle items.accessory");
      if (!order) {
        return res.status(404).json({ message: "Khong tim thay don hang" });
      }

      const item = order.items.find((entry) => {
        if (normalizedItemType === "accessory") {
          return entry.itemType === "accessory" && String(entry.accessory?._id || entry.accessory) === String(accessoryId);
        }
        return entry.itemType === "vehicle" && String(entry.vehicle?._id || entry.vehicle) === String(vehicleId);
      });

      if (!item) {
        return res.status(404).json({ message: "Khong tim thay san pham trong don hang" });
      }

      warrantyData.order = order._id;
      warrantyData.accessory = normalizedItemType === "accessory" ? item.accessory?._id || item.accessory : null;
      warrantyData.vehicle = normalizedItemType === "vehicle" ? item.vehicle?._id || item.vehicle : null;
    }

    const warranty = await Warranty.create(warrantyData);
    const populatedWarranty = await Warranty.findById(warranty._id).populate("order service vehicle accessory");

    if (req.user.role !== "admin") {
      await createNotificationForAdmins({
        type: "system",
        title: "Yeu cau bao hanh moi",
        message: `${req.user.fullName} vua gui yeu cau bao hanh.`,
        link: "/admin.html"
      });
    }

    res.status(201).json({ message: "Da tao yeu cau bao hanh", warranty: populatedWarranty });
  } catch (error) {
    next(error);
  }
}

async function getWarranties(req, res, next) {
  try {
    const warranties = await Warranty.find({ user: req.user._id })
      .populate("order service vehicle accessory")
      .sort({ createdAt: -1 });
    res.json({ warranties });
  } catch (error) {
    next(error);
  }
}

async function getWarrantyById(req, res, next) {
  try {
    const warranty = await Warranty.findOne({ _id: req.params.id, user: req.user._id }).populate(
      "order service vehicle accessory"
    );

    if (!warranty) {
      return res.status(404).json({ message: "Khong tim thay yeu cau bao hanh" });
    }

    res.json({ warranty });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createWarranty,
  getWarranties,
  getWarrantyById
};
