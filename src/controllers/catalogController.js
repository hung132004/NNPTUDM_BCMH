const Brand = require("../models/Brand");
const Category = require("../models/Category");
const Vehicle = require("../models/Vehicle");
const Accessory = require("../models/Accessory");
const Review = require("../models/Review");
const Promotion = require("../models/Promotion");

async function getHomeData(_req, res, next) {
  try {
    const [brands, categories, featuredVehicles, featuredAccessories, promotions] = await Promise.all([
      Brand.find().sort({ createdAt: -1 }).limit(10),
      Category.find().sort({ name: 1 }),
      Vehicle.find({ featured: true }).populate("brand category").limit(6),
      Accessory.find({ featured: true }).sort({ createdAt: -1 }).limit(6),
      Promotion.find({ active: true }).sort({ createdAt: -1 }).limit(4)
    ]);

    res.json({ brands, categories, featuredVehicles, featuredAccessories, promotions });
  } catch (error) {
    next(error);
  }
}

async function getVehicles(req, res, next) {
  try {
    const { keyword, brand, category } = req.query;
    const query = {};

    if (keyword) {
      query.name = { $regex: keyword, $options: "i" };
    }
    if (brand) {
      query.brand = brand;
    }
    if (category) {
      query.category = category;
    }

    const vehicles = await Vehicle.find(query).populate("brand category").sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
}

async function getAccessories(req, res, next) {
  try {
    const { keyword } = req.query;
    const query = {};

    if (keyword) {
      query.name = { $regex: keyword, $options: "i" };
    }

    const accessories = await Accessory.find(query).sort({ createdAt: -1 });
    res.json(accessories);
  } catch (error) {
    next(error);
  }
}

async function getVehicleBySlug(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ slug: req.params.slug }).populate("brand category");

    if (!vehicle) {
      return res.status(404).json({ message: "Khong tim thay xe" });
    }

    const reviews = await Review.find({ vehicle: vehicle._id })
      .populate("user", "fullName")
      .sort({ createdAt: -1 });

    res.json({ vehicle, reviews });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHomeData,
  getVehicles,
  getAccessories,
  getVehicleBySlug
};
