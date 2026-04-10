const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/dashboard", adminController.getDashboard);
router.post("/brands", adminController.createBrand);
router.post("/categories", adminController.createCategory);
router.post("/vehicles", upload.single("thumbnailFile"), adminController.createVehicle);
router.put("/vehicles/:id", upload.single("thumbnailFile"), adminController.updateVehicle);
router.delete("/vehicles/:id", adminController.deleteVehicle);
router.patch("/orders/:id/status", adminController.updateOrderStatus);
router.get("/invoices", adminController.getInvoices);
router.get("/invoices/:id", adminController.getInvoiceById);
router.patch("/invoices/:id/status", adminController.updateInvoiceStatus);
router.get("/warranties", adminController.getWarranties);
router.get("/warranties/:id", adminController.getWarrantyById);
router.patch("/warranties/:id/status", adminController.updateWarrantyStatus);
router.post("/promotions", adminController.createPromotion);

module.exports = router;
