const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Promotion = require("../models/Promotion");
const Invoice = require("../models/Invoice");
const { createNotification, createNotificationForAdmins } = require("../utils/notificationHelper");
const {
  STORE_ADDRESS,
  buildCartSummary,
  getQrPaymentConfig,
  createInvoiceNumber,
  buildInvoiceItems,
  estimateDeliveryDistanceKm
} = require("./userShared");

async function createOrder(req, res, next) {
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
      title: "ÄÆ¡n hÃ ng Ä‘Ã£ Ä‘Æ°á»£c Ä‘áº·t",
      message: `ÄÆ¡n hÃ ng ${order._id} Ä‘Ã£ Ä‘Æ°á»£c táº¡o thÃ nh cÃ´ng. Tá»•ng ${summary.total} VND.`,
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
}

async function getInvoices(req, res, next) {
  try {
    const invoices = await Invoice.find({ user: req.user._id }).populate("order").sort({ createdAt: -1 });
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
}

async function getInvoiceById(req, res, next) {
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
}

async function payInvoice(req, res, next) {
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
      title: "Thanh toÃ¡n hÃ³a Ä‘Æ¡n thÃ nh cÃ´ng",
      message: `HÃ³a Ä‘Æ¡n ${invoice.invoiceNumber} Ä‘Ã£ Ä‘Æ°á»£c thanh toÃ¡n.`,
      link: `/invoices/${invoice._id}`
    });

    res.json({ message: "Thanh toan hoa don thanh cong", invoice });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getInvoices,
  getInvoiceById,
  payInvoice
};
