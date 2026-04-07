const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const User = require("../models/User");
const Brand = require("../models/Brand");
const Category = require("../models/Category");
const Vehicle = require("../models/Vehicle");
const Accessory = require("../models/Accessory");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Promotion = require("../models/Promotion");
const Invoice = require("../models/Invoice");
const Warranty = require("../models/Warranty");
const { createNotification } = require("../utils/notificationHelper");

const router = express.Router();

function normalizeVehiclePayload(body, file, currentVehicle = null) {
  const thumbnail = file ? `/uploads/${file.filename}` : body.currentThumbnail || currentVehicle?.thumbnail || "";

  return {
    name: body.name,
    slug: body.slug,
    brand: body.brand,
    category: body.category,
    engine: body.engine || "",
    stock: Number(body.stock || 0),
    price: Number(body.price || 0),
    salePrice: Number(body.salePrice || 0),
    thumbnail,
    gallery: thumbnail ? [thumbnail] : [],
    specs: currentVehicle?.specs || [],
    description: body.description || "",
    featured: body.featured === "true" || body.featured === true || body.featured === "on"
  };
}

router.use(protect, authorize("admin"));

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [
      users,
      vehicles,
      accessories,
      orders,
      invoices,
      warranties,
      promotions,
      reviews,
      brands,
      categories
    ] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }),
      Vehicle.find().populate("brand category").sort({ createdAt: -1 }),
      Accessory.find().sort({ createdAt: -1 }),
      Order.find().populate("user", "fullName email").populate("items.vehicle items.accessory").sort({ createdAt: -1 }),
      Invoice.find().populate("user", "fullName email").populate("order").sort({ createdAt: -1 }),
      Warranty.find().populate("user", "fullName email").populate("order service vehicle accessory").sort({ createdAt: -1 }),
      Promotion.find().sort({ createdAt: -1 }),
      Review.find().populate("user", "fullName email").populate("vehicle", "name slug").sort({ createdAt: -1 }),
      Brand.find().sort({ name: 1 }),
      Category.find().sort({ name: 1 })
    ]);

    res.json({
      stats: {
        totalUsers: users.length,
        totalVehicles: vehicles.length,
        totalAccessories: accessories.length,
        totalOrders: orders.length,
        totalInvoices: invoices.length,
        totalWarranties: warranties.length,
        totalReviews: reviews.length,
        revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
      },
      users,
      vehicles,
      accessories,
      orders,
      invoices,
      warranties,
      promotions,
      reviews,
      brands,
      categories
    });
  } catch (error) {
    next(error);
  }
});

router.post("/brands", async (req, res, next) => {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json({ message: "Da tao brand", brand });
  } catch (error) {
    next(error);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ message: "Da tao category", category });
  } catch (error) {
    next(error);
  }
});

router.post("/vehicles", upload.single("thumbnailFile"), async (req, res, next) => {
  try {
    const vehicle = await Vehicle.create(normalizeVehiclePayload(req.body, req.file));
    const populatedVehicle = await Vehicle.findById(vehicle._id).populate("brand category");
    res.status(201).json({ message: "Da them xe moi", vehicle: populatedVehicle });
  } catch (error) {
    next(error);
  }
});

router.put("/vehicles/:id", upload.single("thumbnailFile"), async (req, res, next) => {
  try {
    const existingVehicle = await Vehicle.findById(req.params.id);
    if (!existingVehicle) {
      return res.status(404).json({ message: "Khong tim thay san pham" });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, normalizeVehiclePayload(req.body, req.file, existingVehicle), {
      new: true,
      runValidators: true
    }).populate("brand category");

    res.json({ message: "Da cap nhat san pham", vehicle });
  } catch (error) {
    next(error);
  }
});

router.delete("/vehicles/:id", async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Khong tim thay san pham" });
    }

    await vehicle.deleteOne();
    res.json({ message: "Da xoa san pham" });
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate("user", "fullName email");

    if (!order) {
      return res.status(404).json({ message: "Khong tim thay don hang" });
    }

    await createNotification(order.user._id || order.user, {
      type: "order_status",
      title: "Đơn hàng cập nhật trạng thái",
      message: `Đơn hàng ${order._id} đã được chuyển sang trạng thái ${order.status}.`,
      link: `/orders/${order._id}`
    });

    res.json({ message: "Cap nhat trang thai thanh cong", order });
  } catch (error) {
    next(error);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const invoices = await Invoice.find().populate("user", "fullName email").populate("order").sort({ createdAt: -1 });
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

router.get("/invoices/:id", async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("user", "fullName email").populate("order");
    if (!invoice) {
      return res.status(404).json({ message: "Khong tim thay hoa don" });
    }
    res.json({ invoice });
  } catch (error) {
    next(error);
  }
});

router.patch("/invoices/:id/status", async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Khong tim thay hoa don" });
    }

    invoice.paymentStatus = req.body.paymentStatus || invoice.paymentStatus;
    invoice.paidAt = invoice.paymentStatus === "paid" ? new Date() : invoice.paidAt;
    invoice.notes = req.body.notes || invoice.notes;
    await invoice.save();

    if (invoice.paymentStatus === "paid") {
      await Order.findByIdAndUpdate(invoice.order, { paymentStatus: "paid" });
    }

    res.json({ message: "Cap nhat trang thai hoa don thanh cong", invoice });
  } catch (error) {
    next(error);
  }
});

router.get("/warranties", async (req, res, next) => {
  try {
    const warranties = await Warranty.find().populate("user", "fullName email").populate("order service vehicle accessory").sort({ createdAt: -1 });
    res.json({ warranties });
  } catch (error) {
    next(error);
  }
});

router.get("/warranties/:id", async (req, res, next) => {
  try {
    const warranty = await Warranty.findById(req.params.id).populate("user", "fullName email").populate("order service vehicle accessory");
    if (!warranty) {
      return res.status(404).json({ message: "Khong tim thay yeu cau bao hanh" });
    }
    res.json({ warranty });
  } catch (error) {
    next(error);
  }
});

router.patch("/warranties/:id/status", async (req, res, next) => {
  try {
    const warranty = await Warranty.findById(req.params.id);
    if (!warranty) {
      return res.status(404).json({ message: "Khong tim thay yeu cau bao hanh" });
    }

    warranty.status = req.body.status || warranty.status;
    if (req.body.resolutionNotes) {
      warranty.resolutionNotes = req.body.resolutionNotes;
    }
    if (warranty.status === "claimed") {
      warranty.claimDate = new Date();
    }
    await warranty.save();

    await createNotification(warranty.user, {
      type: "system",
      title: "Bao hanh duoc cap nhat",
      message: `Yeu cau bao hanh cua ban da duoc chuyen sang trang thai ${warranty.status}.`,
      link: "/user.html"
    });

    res.json({ message: "Cap nhat trang thai bao hanh thanh cong", warranty });
  } catch (error) {
    next(error);
  }
});

router.post("/promotions", async (req, res, next) => {
  try {
    const promotion = await Promotion.create(req.body);
    res.status(201).json({ message: "Da tao khuyen mai", promotion });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
