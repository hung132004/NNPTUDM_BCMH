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
    const [users, vehicles, accessories, orders, promotions, reviews, brands, categories] = await Promise.all([
      User.find().select("-password").sort({ createdAt: -1 }),
      Vehicle.find().populate("brand category").sort({ createdAt: -1 }),
      Accessory.find().sort({ createdAt: -1 }),
      Order.find().populate("user", "fullName email").populate("items.vehicle items.accessory").sort({ createdAt: -1 }),
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
        totalReviews: reviews.length,
        revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
      },
      users,
      vehicles,
      accessories,
      orders,
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

    res.json({ message: "Cap nhat trang thai thanh cong", order });
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
