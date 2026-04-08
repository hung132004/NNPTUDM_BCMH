const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Vehicle = require("../models/Vehicle");
const Accessory = require("../models/Accessory");
const Promotion = require("../models/Promotion");
const Invoice = require("../models/Invoice");
const Warranty = require("../models/Warranty");
const Service = require("../models/Service");
const { createNotification, createNotificationForAdmins } = require("../utils/notificationHelper");

const router = express.Router();

const STORE_ADDRESS = "1 DN11, Khu Pho 4, Dong Hung Thuan, Ho Chi Minh";
const STORE_COORDS = { lat: 10.85124, lon: 106.62669 };
const SHIPPING_RATE_PER_KM = 20000;
const USER_AGENT = "XeDoStudio/1.0 shipping-estimator";
const QR_BANK_BIN = process.env.QR_BANK_BIN || "970407";
const QR_ACCOUNT_NO = process.env.QR_ACCOUNT_NO || "7777368888";
const QR_ACCOUNT_NAME = process.env.QR_ACCOUNT_NAME || "NGUYEN VAN THANH HUNG";
const QR_BANK_NAME = process.env.QR_BANK_NAME || "Techcombank";
const QR_TEMPLATE = process.env.QR_TEMPLATE || "compact2";

async function populateCart(cartId) {
  return Cart.findById(cartId)
    .populate("items.vehicle")
    .populate("items.accessory");
}

function getCartItemResource(item) {
  return item.itemType === "accessory" ? item.accessory : item.vehicle;
}

function getCartItemId(item) {
  const resource = getCartItemResource(item);
  return resource?._id?.toString() || "";
}

function buildCartSummary(cart, promotion = null, fulfillmentMethod = "pickup", distanceKm = 0) {
  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountPercent = promotion?.discountPercent || 0;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const normalizedDistanceKm = Math.max(Number(distanceKm || 0), 0);
  const shippingFee = fulfillmentMethod === "delivery" ? normalizedDistanceKm * SHIPPING_RATE_PER_KM : 0;
  const total = Math.max(subtotal - discountAmount, 0) + shippingFee;

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
    shippingFee,
    fulfillmentMethod,
    distanceKm: normalizedDistanceKm,
    shippingRatePerKm: SHIPPING_RATE_PER_KM,
    storeAddress: STORE_ADDRESS,
    total
  };
}

function getQrPaymentConfig(amount = 0, transferNote = "THANH TOAN XE DO") {
  if (!QR_BANK_BIN || !QR_ACCOUNT_NO || !QR_ACCOUNT_NAME) {
    return {
      supported: false
    };
  }

  const normalizedAmount = Math.max(Math.round(Number(amount || 0)), 0);
  const encodedNote = encodeURIComponent(String(transferNote || "THANH TOAN XE DO"));
  const encodedAccountName = encodeURIComponent(QR_ACCOUNT_NAME);

  return {
    supported: true,
    bankName: QR_BANK_NAME,
    bankBin: QR_BANK_BIN,
    accountNumber: QR_ACCOUNT_NO,
    accountName: QR_ACCOUNT_NAME,
    template: QR_TEMPLATE,
    transferNote,
    staticImageUrl: "/qr-payment.png",
    qrImageUrl: `https://img.vietqr.io/image/${QR_BANK_BIN}-${QR_ACCOUNT_NO}-${QR_TEMPLATE}.png?amount=${normalizedAmount}&addInfo=${encodedNote}&accountName=${encodedAccountName}`
  };
}

function createInvoiceNumber(orderId) {
  const suffix = String(orderId).slice(-6).toUpperCase();
  return `INV-${new Date().getFullYear()}-${suffix}-${Date.now().toString().slice(-5)}`;
}

function buildInvoiceItems(items) {
  return items.map((item) => {
    const description =
      item.itemType === "accessory"
        ? item.accessory?.name || "Phu kien"
        : item.vehicle?.name || "Xe do";

    return {
      itemType: item.itemType,
      description,
      vehicle: item.vehicle?._id || null,
      accessory: item.accessory?._id || null,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    };
  });
}

async function geocodeAddress(address) {
  const candidates = [
    address,
    address.replace("Khu Pho", "Khu phố"),
    address.replace("DN11", "ĐN11"),
    `${address}, Ho Chi Minh City, Vietnam`,
    `${address}, Ho Chi Minh, Vietnam`,
    `${address}, Vietnam`
  ];

  for (const candidate of candidates) {
    const params = new URLSearchParams({
      q: candidate,
      format: "jsonv2",
      limit: "1"
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Khong the tim toa do cho dia chi nay");
    }

    const results = await response.json();
    if (Array.isArray(results) && results.length) {
      return {
        lat: Number(results[0].lat),
        lon: Number(results[0].lon),
        displayName: results[0].display_name
      };
    }
  }

  throw new Error("Khong tim thay dia chi giao hang");
}

async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2"
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return `Vi tri da chon (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
  }

  const payload = await response.json();
  return payload?.display_name || `Vi tri da chon (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
}

function haversineDistanceKm(origin, destination) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lon - origin.lon);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

async function calculateRouteDistanceKm(origin, destination) {
  const routeUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;
  const response = await fetch(routeUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json"
    }
  });

  if (response.ok) {
    const payload = await response.json();
    const distanceMeters = payload?.routes?.[0]?.distance;

    if (distanceMeters) {
      return Math.round((distanceMeters / 1000) * 10) / 10;
    }
  }

  // Fallback to an approximate road distance when routing service is unavailable.
  const straightLineKm = haversineDistanceKm(origin, destination);
  return Math.max(Math.round(straightLineKm * 1.2 * 10) / 10, 0.5);
}

async function estimateDeliveryDistanceKm(destinationAddress) {
  const destination = await geocodeAddress(destinationAddress);
  const origin = STORE_COORDS;

  return {
    distanceKm: await calculateRouteDistanceKm(origin, destination),
    normalizedAddress: destination.displayName
  };
}

async function estimateDeliveryDistanceFromCoords(lat, lon) {
  const origin = STORE_COORDS;
  const destination = { lat, lon };

  return {
    distanceKm: await calculateRouteDistanceKm(origin, destination),
    normalizedAddress: await reverseGeocode(lat, lon)
  };
}

router.use(protect, authorize("user", "admin"));

router.get("/dashboard", async (req, res, next) => {
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
});

router.get("/cart", async (req, res, next) => {
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
});

router.post("/shipping/estimate", async (req, res, next) => {
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
});

router.post("/shipping/estimate-point", async (req, res, next) => {
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
});

router.post("/cart", async (req, res, next) => {
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
});

router.patch("/cart/:itemId", async (req, res, next) => {
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
});

router.delete("/cart/:itemId", async (req, res, next) => {
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
});

router.post("/orders", async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, promotionCode, fulfillmentMethod, distanceKm } = req.body;
    const normalizedFulfillmentMethod = fulfillmentMethod === "delivery" ? "delivery" : "pickup";
    const normalizedPaymentMethod = paymentMethod === "bank_transfer" ? "bank_transfer" : "store_payment";
    let normalizedDistanceKm = Math.max(Number(distanceKm || 0), 0);
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.vehicle")
      .populate("items.accessory");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Gio hang dang trong" });
    }

    if (normalizedFulfillmentMethod === "delivery" && !String(shippingAddress || "").trim()) {
      return res.status(400).json({ message: "Vui long nhap dia chi giao hang" });
    }

    if (normalizedFulfillmentMethod === "delivery") {
      const estimate = await estimateDeliveryDistanceKm(String(shippingAddress || "").trim());
      normalizedDistanceKm = estimate.distanceKm;
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

    const summary = buildCartSummary(cart, promotion, normalizedFulfillmentMethod, normalizedDistanceKm);
    const resolvedShippingAddress =
      normalizedFulfillmentMethod === "pickup" ? STORE_ADDRESS : String(shippingAddress || "").trim();

    const invoiceItems = buildInvoiceItems(cart.items);

    const order = await Order.create({
      user: req.user._id,
      items: cart.items.map((item) => ({
        itemType: item.itemType,
        vehicle: item.vehicle?._id || null,
        accessory: item.accessory?._id || null,
        quantity: item.quantity,
        price: item.price
      })),
      subtotalAmount: summary.subtotal,
      discountAmount: summary.discountAmount,
      shippingFee: summary.shippingFee,
      totalAmount: summary.total,
      paymentMethod: normalizedPaymentMethod,
      fulfillmentMethod: normalizedFulfillmentMethod,
      shippingAddress: resolvedShippingAddress,
      distanceKm: normalizedFulfillmentMethod === "delivery" ? normalizedDistanceKm : 0,
      storeAddress: STORE_ADDRESS
    });

    const invoice = await Invoice.create({
      order: order._id,
      user: req.user._id,
      invoiceNumber: createInvoiceNumber(order._id),
      items: invoiceItems,
      subtotalAmount: summary.subtotal,
      discountAmount: summary.discountAmount,
      shippingFee: summary.shippingFee,
      totalAmount: summary.total,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: "pending",
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      shippingAddress: resolvedShippingAddress,
      storeAddress: STORE_ADDRESS
    });

    await createNotification(req.user._id, {
      type: "order_status",
      title: "Đơn hàng đã được đặt",
      message: `Đơn hàng ${order._id} đã được tạo thành công. Tổng ${summary.total} VND.`,
      link: `/orders/${order._id}`
    });

    if (req.user.role !== "admin") {
      await createNotificationForAdmins({
        type: "system",
        title: "Don hang moi",
        message: `${req.user.fullName} vua tao don hang ${order._id}.`,
        link: "/admin.html"
      });
    }

    cart.items = [];
    await cart.save();

    const populatedOrder = await Order.findById(order._id).populate("items.vehicle items.accessory");

    const populatedInvoice = await Invoice.findById(invoice._id).populate("order").populate("items.vehicle items.accessory");
    
    res.status(201).json({
      message: "Dat hang thanh cong",
      order: populatedOrder,
      invoice: populatedInvoice,
      summary,
      qrPayment: getQrPaymentConfig(summary.total, invoice.invoiceNumber)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ user: req.user._id }).populate("order").sort({ createdAt: -1 });
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

router.get("/invoices/:id", async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user._id })
      .populate("order")
      .populate("items.vehicle items.accessory");

    if (!invoice) {
      return res.status(404).json({ message: "Khong tim thay hoa don" });
    }

    res.json({ invoice });
  } catch (error) {
    next(error);
  }
});

router.post("/invoices/:id/pay", async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, user: req.user._id });
    if (!invoice) {
      return res.status(404).json({ message: "Khong tim thay hoa don" });
    }

    if (invoice.paymentStatus === "paid") {
      return res.status(400).json({ message: "Hoa don da duoc thanh toan" });
    }

    invoice.paymentStatus = "paid";
    invoice.paidAt = new Date();
    await invoice.save();
    await Order.findByIdAndUpdate(invoice.order, { paymentStatus: "paid" });

    await createNotification(req.user._id, {
      type: "order_status",
      title: "Thanh toán hóa đơn thành công",
      message: `Hóa đơn ${invoice.invoiceNumber} đã được thanh toán.`,
      link: `/invoices/${invoice._id}`
    });

    res.json({ message: "Thanh toan hoa don thanh cong", invoice });
  } catch (error) {
    next(error);
  }
});

router.post("/warranties", async (req, res, next) => {
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
});

router.get("/warranties", async (req, res, next) => {
  try {
    const warranties = await Warranty.find({ user: req.user._id })
      .populate("order service vehicle accessory")
      .sort({ createdAt: -1 });
    res.json({ warranties });
  } catch (error) {
    next(error);
  }
});

router.get("/warranties/:id", async (req, res, next) => {
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
});

module.exports = router;
