const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Vehicle = require("../models/Vehicle");
const Promotion = require("../models/Promotion");

const router = express.Router();

function buildCartSummary(cart, promotion = null) {
  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountPercent = promotion?.discountPercent || 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const total = Math.max(subtotal - discountAmount, 0);

  return {
    items,
    subtotal,
    promotion: promotion
      ? {
          code: promotion.code,
          title: promotion.title,
          discountPercent: promotion.discountPercent
        }
      : null,
    discountAmount,
    total
  };
}

router.use(protect, authorize("user", "admin"));

router.get("/dashboard", async (req, res, next) => {
  try {
    const [cart, orders, reviews] = await Promise.all([
      Cart.findOne({ user: req.user._id }).populate("items.vehicle"),
      Order.find({ user: req.user._id }).populate("items.vehicle").sort({ createdAt: -1 }),
      Review.find({ user: req.user._id }).populate("vehicle").sort({ createdAt: -1 })
    ]);

    res.json({
      profile: req.user,
      cart,
      cartSummary: buildCartSummary(cart),
      orders,
      reviews
    });
  } catch (error) {
    next(error);
  }
});

router.get("/cart", async (req, res, next) => {
  try {
    const promotionCode = req.query.promotionCode?.trim().toUpperCase();
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.vehicle");
    let promotion = null;

    if (promotionCode) {
      promotion = await Promotion.findOne({
        code: promotionCode,
        active: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }]
      });

      if (!promotion) {
        return res.status(404).json({ message: "Ma giam gia khong hop le hoac da het han" });
      }
    }

    res.json({
      cart,
      summary: buildCartSummary(cart, promotion)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/cart", async (req, res, next) => {
  try {
    const { vehicleId, quantity } = req.body;
    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({ message: "Xe khong ton tai" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => item.vehicle.toString() === vehicleId);
    if (itemIndex >= 0) {
      cart.items[itemIndex].quantity += Number(quantity || 1);
    } else {
      cart.items.push({
        vehicle: vehicle._id,
        quantity: Number(quantity || 1),
        price: vehicle.salePrice || vehicle.price
      });
    }

    await cart.save();
    const populatedCart = await Cart.findById(cart._id).populate("items.vehicle");
    res.status(201).json({
      message: "Da them vao gio hang",
      cart: populatedCart,
      summary: buildCartSummary(populatedCart)
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/cart/:vehicleId", async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Gio hang chua ton tai" });
    }

    const item = cart.items.find((entry) => entry.vehicle.toString() === req.params.vehicleId);
    if (!item) {
      return res.status(404).json({ message: "Khong tim thay san pham trong gio" });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((entry) => entry.vehicle.toString() !== req.params.vehicleId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    const populatedCart = await Cart.findById(cart._id).populate("items.vehicle");
    res.json({
      message: "Cap nhat gio hang thanh cong",
      cart: populatedCart,
      summary: buildCartSummary(populatedCart)
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/cart/:vehicleId", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Gio hang chua ton tai" });
    }

    cart.items = cart.items.filter((entry) => entry.vehicle.toString() !== req.params.vehicleId);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate("items.vehicle");
    res.json({
      message: "Da xoa san pham khoi gio",
      cart: populatedCart,
      summary: buildCartSummary(populatedCart)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/orders", async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, promotionCode } = req.body;
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.vehicle");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Gio hang dang trong" });
    }

    let promotion = null;
    if (promotionCode) {
      promotion = await Promotion.findOne({
        code: promotionCode.trim().toUpperCase(),
        active: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }]
      });

      if (!promotion) {
        return res.status(404).json({ message: "Ma giam gia khong hop le hoac da het han" });
      }
    }

    const summary = buildCartSummary(cart, promotion);

    const order = await Order.create({
      user: req.user._id,
      items: cart.items.map((item) => ({
        vehicle: item.vehicle._id,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: summary.total,
      paymentMethod: paymentMethod || "COD",
      shippingAddress
    });

    cart.items = [];
    await cart.save();

    const populatedOrder = await Order.findById(order._id).populate("items.vehicle");
    res.status(201).json({
      message: "Dat hang thanh cong",
      order: populatedOrder,
      summary
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reviews", async (req, res, next) => {
  try {
    const { vehicleId, rating, comment } = req.body;
    const review = await Review.create({
      user: req.user._id,
      vehicle: vehicleId,
      rating,
      comment
    });

    const populatedReview = await Review.findById(review._id)
      .populate("vehicle")
      .populate("user", "fullName");

    res.status(201).json({ message: "Da gui danh gia", review: populatedReview });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
