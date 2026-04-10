const Cart = require("../models/Cart");
const Vehicle = require("../models/Vehicle");
const Accessory = require("../models/Accessory");
const Promotion = require("../models/Promotion");
const {
  STORE_ADDRESS,
  SHIPPING_RATE_PER_KM,
  populateCart,
  getCartItemId,
  buildCartSummary,
  getQrPaymentConfig,
  estimateDeliveryDistanceKm,
  estimateDeliveryDistanceFromCoords
} = require("./userShared");

async function getCart(req, res, next) {
  try {
    const promotionCode = req.query.promotionCode?.trim().toUpperCase();
    const fulfillmentMethod = req.query.fulfillmentMethod === "delivery" ? "delivery" : "pickup";
    const shippingAddress = String(req.query.shippingAddress || "").trim();
    let distanceKm = Number(req.query.distanceKm || 0);
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.vehicle")
      .populate("items.accessory");
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

    if (fulfillmentMethod === "delivery" && shippingAddress) {
      const estimate = await estimateDeliveryDistanceKm(shippingAddress);
      distanceKm = estimate.distanceKm;
    }

    res.json({
      cart,
      summary: buildCartSummary(cart, promotion, fulfillmentMethod, distanceKm),
      storeAddress: STORE_ADDRESS,
      shippingRatePerKm: SHIPPING_RATE_PER_KM,
      qrPayment: getQrPaymentConfig()
    });
  } catch (error) {
    next(error);
  }
}

async function estimateShipping(req, res, next) {
  try {
    const shippingAddress = String(req.body.shippingAddress || "").trim();

    if (!shippingAddress) {
      return res.status(400).json({ message: "Vui long nhap dia chi giao hang" });
    }

    const estimate = await estimateDeliveryDistanceKm(shippingAddress);

    res.json({
      shippingAddress: estimate.normalizedAddress,
      distanceKm: estimate.distanceKm,
      shippingFee: estimate.distanceKm * SHIPPING_RATE_PER_KM,
      shippingRatePerKm: SHIPPING_RATE_PER_KM,
      storeAddress: STORE_ADDRESS
    });
  } catch (error) {
    next(error);
  }
}

async function estimateShippingByPoint(req, res, next) {
  try {
    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: "Toa do giao hang khong hop le" });
    }

    const estimate = await estimateDeliveryDistanceFromCoords(lat, lon);

    res.json({
      shippingAddress: estimate.normalizedAddress,
      distanceKm: estimate.distanceKm,
      shippingFee: estimate.distanceKm * SHIPPING_RATE_PER_KM,
      shippingRatePerKm: SHIPPING_RATE_PER_KM,
      storeAddress: STORE_ADDRESS,
      point: { lat, lon }
    });
  } catch (error) {
    next(error);
  }
}

async function addToCart(req, res, next) {
  try {
    const { vehicleId, accessoryId, quantity } = req.body;
    const itemType = accessoryId ? "accessory" : "vehicle";
    const resourceId = String(accessoryId || vehicleId || "").trim();
    const resource = accessoryId ? await Accessory.findById(accessoryId) : await Vehicle.findById(vehicleId);

    if (!resource) {
      return res.status(404).json({ message: itemType === "accessory" ? "Phu kien khong ton tai" : "Xe khong ton tai" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => {
      const currentId =
        item.itemType === "accessory" ? item.accessory?.toString() : item.vehicle?.toString();
      return item.itemType === itemType && currentId === resourceId;
    });

    if (itemIndex >= 0) {
      cart.items[itemIndex].quantity += Number(quantity || 1);
    } else {
      cart.items.push({
        itemType,
        vehicle: itemType === "vehicle" ? resource._id : null,
        accessory: itemType === "accessory" ? resource._id : null,
        quantity: Number(quantity || 1),
        price: resource.salePrice || resource.price
      });
    }

    await cart.save();
    const populatedCart = await populateCart(cart._id);
    res.status(201).json({
      message: "Da them vao gio hang",
      cart: populatedCart,
      summary: buildCartSummary(populatedCart)
    });
  } catch (error) {
    next(error);
  }
}

async function updateCartItem(req, res, next) {
  try {
    const quantity = Number(req.body.quantity);
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.vehicle")
      .populate("items.accessory");

    if (!cart) {
      return res.status(404).json({ message: "Gio hang chua ton tai" });
    }

    const item = cart.items.find((entry) => getCartItemId(entry) === req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Khong tim thay san pham trong gio" });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((entry) => getCartItemId(entry) !== req.params.itemId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    const populatedCart = await populateCart(cart._id);
    res.json({
      message: "Cap nhat gio hang thanh cong",
      cart: populatedCart,
      summary: buildCartSummary(populatedCart)
    });
  } catch (error) {
    next(error);
  }
}

async function removeCartItem(req, res, next) {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.vehicle")
      .populate("items.accessory");

    if (!cart) {
      return res.status(404).json({ message: "Gio hang chua ton tai" });
    }

    cart.items = cart.items.filter((entry) => getCartItemId(entry) !== req.params.itemId);
    await cart.save();

    const populatedCart = await populateCart(cart._id);
    res.json({
      message: "Da xoa san pham khoi gio",
      cart: populatedCart,
      summary: buildCartSummary(populatedCart)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCart,
  estimateShipping,
  estimateShippingByPoint,
  addToCart,
  updateCartItem,
  removeCartItem
};
