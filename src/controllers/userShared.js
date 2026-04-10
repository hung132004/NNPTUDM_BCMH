const Cart = require("../models/Cart");

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
    return { supported: false };
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
    address.replace("Khu Pho", "Khu phá»‘"),
    address.replace("DN11", "ÄN11"),
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
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" }
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
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" }
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
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" }
  });

  if (response.ok) {
    const payload = await response.json();
    const distanceMeters = payload?.routes?.[0]?.distance;

    if (distanceMeters) {
      return Math.round((distanceMeters / 1000) * 10) / 10;
    }
  }

  const straightLineKm = haversineDistanceKm(origin, destination);
  return Math.max(Math.round(straightLineKm * 1.2 * 10) / 10, 0.5);
}

async function estimateDeliveryDistanceKm(destinationAddress) {
  const destination = await geocodeAddress(destinationAddress);
  return {
    distanceKm: await calculateRouteDistanceKm(STORE_COORDS, destination),
    normalizedAddress: destination.displayName
  };
}

async function estimateDeliveryDistanceFromCoords(lat, lon) {
  return {
    distanceKm: await calculateRouteDistanceKm(STORE_COORDS, { lat, lon }),
    normalizedAddress: await reverseGeocode(lat, lon)
  };
}

module.exports = {
  STORE_ADDRESS,
  SHIPPING_RATE_PER_KM,
  populateCart,
  getCartItemId,
  buildCartSummary,
  getQrPaymentConfig,
  createInvoiceNumber,
  buildInvoiceItems,
  estimateDeliveryDistanceKm,
  estimateDeliveryDistanceFromCoords
};
