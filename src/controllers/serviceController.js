const Service = require("../models/Service");
const Vehicle = require("../models/Vehicle");
const { createNotification, createNotificationForAdmins } = require("../utils/notificationHelper");

async function getMyServices(req, res, next) {
  try {
    const services = await Service.find({ user: req.user._id })
      .populate("vehicle", "name slug thumbnail")
      .sort({ date: -1 });

    res.json(services);
  } catch (error) {
    next(error);
  }
}

async function getVehicleServices(req, res, next) {
  try {
    const services = await Service.find({ vehicle: req.params.vehicleId })
      .populate("user", "fullName")
      .sort({ date: -1 });

    res.json(services);
  } catch (error) {
    next(error);
  }
}

async function createService(req, res, next) {
  try {
    const { vehicleId, serviceType, cost, date, notes } = req.body;

    if (!vehicleId || !serviceType || !cost || !date) {
      return res.status(400).json({ message: "Vui long nhap day du thong tin" });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Khong tim thay xe" });
    }

    const service = await Service.create({
      vehicle: vehicleId,
      user: req.user._id,
      serviceType,
      cost: Number(cost),
      date: new Date(date),
      notes: notes || "",
      status: "pending"
    });

    const populatedService = await Service.findById(service._id)
      .populate("vehicle", "name slug thumbnail")
      .populate("user", "fullName");

    if (req.user.role !== "admin") {
      await createNotificationForAdmins({
        type: "system",
        title: "Lich dich vu moi",
        message: `${req.user.fullName} vua dat lich ${service.serviceType}.`,
        link: "/admin.html"
      });
    }

    res.status(201).json({
      message: "Da them lich bao duong",
      service: populatedService
    });
  } catch (error) {
    next(error);
  }
}

async function getAllServices(_req, res, next) {
  try {
    const services = await Service.find()
      .populate("user", "fullName email")
      .populate("vehicle", "name slug thumbnail")
      .sort({ date: -1 });

    res.json({
      total: services.length,
      services
    });
  } catch (error) {
    next(error);
  }
}

async function updateServiceStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Trang thai khong hop le" });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("vehicle", "name slug thumbnail")
      .populate("user", "fullName email");

    if (!service) {
      return res.status(404).json({ message: "Khong tim thay lich bao duong" });
    }

    await createNotification(service.user, {
      type: "system",
      title: "Cáº­p nháº­t dá»‹ch vá»¥",
      message: `Lá»‹ch dá»‹ch vá»¥ ${service.serviceType} Ä‘Ã£ chuyá»ƒn sang tráº¡ng thÃ¡i ${service.status}.`,
      link: `/services/${service._id}`
    });

    res.json({
      message: "Da cap nhat trang thai",
      service
    });
  } catch (error) {
    next(error);
  }
}

async function deleteService(req, res, next) {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Khong tim thay lich bao duong" });
    }

    res.json({ message: "Da xoa lich bao duong" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyServices,
  getVehicleServices,
  createService,
  getAllServices,
  updateServiceStatus,
  deleteService
};
