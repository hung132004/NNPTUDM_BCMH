const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const userDashboardController = require("../controllers/userDashboardController");
const userCartController = require("../controllers/userCartController");
const userOrderController = require("../controllers/userOrderController");
const userWarrantyController = require("../controllers/userWarrantyController");

const router = express.Router();

router.use(protect, authorize("user", "admin"));

router.get("/dashboard", userDashboardController.getDashboard);
router.get("/cart", userCartController.getCart);
router.post("/shipping/estimate", userCartController.estimateShipping);
router.post("/shipping/estimate-point", userCartController.estimateShippingByPoint);
router.post("/cart", userCartController.addToCart);
router.patch("/cart/:itemId", userCartController.updateCartItem);
router.delete("/cart/:itemId", userCartController.removeCartItem);
router.post("/orders", userOrderController.createOrder);
router.get("/invoices", userOrderController.getInvoices);
router.get("/invoices/:id", userOrderController.getInvoiceById);
router.post("/invoices/:id/pay", userOrderController.payInvoice);
router.post("/warranties", userWarrantyController.createWarranty);
router.get("/warranties", userWarrantyController.getWarranties);
router.get("/warranties/:id", userWarrantyController.getWarrantyById);
router.post("/reviews", userDashboardController.createReview);

module.exports = router;
