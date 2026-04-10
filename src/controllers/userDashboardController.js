const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Review = require("../models/Review");
const { createNotificationForAdmins } = require("../utils/notificationHelper");
const { STORE_ADDRESS, SHIPPING_RATE_PER_KM, buildCartSummary, getQrPaymentConfig } = require("./userShared");

async function getDashboard(req, res, next) {
  try {
    const [cart, orders, reviews] = await Promise.all([
      Cart.findOne({ user: req.user._id }).populate("items.vehicle").populate("items.accessory"),
      Order.find({ user: req.user._id }).populate("items.vehicle items.accessory").sort({ createdAt: -1 }),
      Review.find({ user: req.user._id }).populate("vehicle").sort({ createdAt: -1 })
    ]);

    res.json({
      profile: req.user,
      cart,
      cartSummary: buildCartSummary(cart),
      orders,
      reviews,
      storeAddress: STORE_ADDRESS,
      shippingRatePerKm: SHIPPING_RATE_PER_KM,
      qrPayment: getQrPaymentConfig()
    });
  } catch (error) {
    next(error);
  }
}

async function createReview(req, res, next) {
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

    if (req.user.role !== "admin") {
      await createNotificationForAdmins({
        type: "review",
        title: "Danh gia moi",
        message: `${req.user.fullName} vua gui danh gia cho ${populatedReview.vehicle?.name || "san pham"}.`,
        link: "/admin.html"
      });
    }

    res.status(201).json({ message: "Da gui danh gia", review: populatedReview });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  createReview
};
