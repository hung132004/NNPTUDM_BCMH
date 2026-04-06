const dotenv = require("dotenv");
const connectDatabase = require("./config/db");
const User = require("./models/User");
const Brand = require("./models/Brand");
const Category = require("./models/Category");
const Vehicle = require("./models/Vehicle");
const Accessory = require("./models/Accessory");
const Cart = require("./models/Cart");
const Order = require("./models/Order");
const Review = require("./models/Review");
const Promotion = require("./models/Promotion");
const Service = require("./models/Service");

dotenv.config();

async function seed() {
  await connectDatabase();

  await Promise.all([
    User.deleteMany(),
    Brand.deleteMany(),
    Category.deleteMany(),
    Vehicle.deleteMany(),
    Accessory.deleteMany(),
    Cart.deleteMany(),
    Order.deleteMany(),
    Review.deleteMany(),
    Promotion.deleteMany(),
    Service.deleteMany()
  ]);

  const admin = await User.create({
    fullName: "Admin Xe Do",
    username: "admin",
    email: "admin",
    password: "123456",
    role: "admin",
    phone: "0900000000",
    address: "TP.HCM"
  });

  const user = await User.create({
    fullName: "user1",
    username: "user1",
    email: "user1",
    password: "123456",
    role: "user",
    phone: "0911111111",
    address: "Ha Noi"
  });

  const [honda, yamaha, sport, naked] = await Promise.all([
    Brand.create({ name: "Honda", country: "Japan" }),
    Brand.create({ name: "Yamaha", country: "Japan" }),
    Category.create({ name: "Sport", description: "Dong xe the thao do kieng" }),
    Category.create({ name: "Naked Bike", description: "Dong xe street do hien dai" })
  ]);

  const vehicles = await Vehicle.insertMany([
    {
      name: "Honda Winner X Do Full Carbon",
      slug: "honda-winner-x-do-full-carbon",
      brand: honda._id,
      category: sport._id,
      engine: "150cc",
      stock: 5,
      price: 72000000,
      salePrice: 68500000,
      thumbnail: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      gallery: ["https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80"],
      specs: ["Mam CNC", "Phuoc Ohlins", "Po titan", "Den LED"],
      description: "Mau xe do noi bat voi dan chan CNC va dan ao carbon.",
      featured: true
    },
    {
      name: "Yamaha Exciter 155 GP Custom",
      slug: "yamaha-exciter-155-gp-custom",
      brand: yamaha._id,
      category: naked._id,
      engine: "155cc VVA",
      stock: 4,
      price: 79000000,
      salePrice: 75800000,
      thumbnail: "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      gallery: ["https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80"],
      specs: ["Quick shifter", "Po Akrapovic", "Tem GP", "He thong ABS"],
      description: "Ban do theo phong cach GP, manh va gon.",
      featured: true
    }
  ]);

  const accessories = await Accessory.insertMany([
    {
      name: "Mu Bao Hiem 3/4 Royal M139",
      slug: "mu-bao-hiem-3-4-royal-m139",
      category: "Bao ho",
      compatibleVehicles: ["Winner X", "Exciter 155", "Xe so", "Xe con tay"],
      stock: 20,
      price: 950000,
      salePrice: 850000,
      thumbnail: "https://images.unsplash.com/photo-1558981403-c5f9891c4a9e?auto=format&fit=crop&w=900&q=80",
      description: "Mu 3/4 gon nhe, phu hop di pho va touring ngan.",
      featured: true
    },
    {
      name: "Gang Tay Scoyco MC29",
      slug: "gang-tay-scoyco-mc29",
      category: "Bao ho",
      compatibleVehicles: ["Winner X", "Exciter 155", "Naked Bike"],
      stock: 30,
      price: 650000,
      salePrice: 590000,
      thumbnail: "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=900&q=80",
      description: "Gang tay full ngon, thoang khi va om tay khi chay duong dai.",
      featured: true
    },
    {
      name: "Gia Do Dien Thoai GUB Pro",
      slug: "gia-do-dien-thoai-gub-pro",
      category: "Tien ich",
      compatibleVehicles: ["Moi loai xe"],
      stock: 25,
      price: 420000,
      salePrice: 350000,
      thumbnail: "https://images.unsplash.com/photo-1516728778615-2d590ea1858a?auto=format&fit=crop&w=900&q=80",
      description: "Ke nhom CNC chac chan, de dan duong khi di tour.",
      featured: true
    }
  ]);

  await Cart.create({
    user: user._id,
    items: [
      {
        itemType: "vehicle",
        vehicle: vehicles[0]._id,
        quantity: 1,
        price: vehicles[0].salePrice || vehicles[0].price
      },
      {
        itemType: "accessory",
        accessory: accessories[0]._id,
        quantity: 1,
        price: accessories[0].salePrice || accessories[0].price
      }
    ]
  });

  await Order.create({
    user: user._id,
    items: [
      {
        itemType: "vehicle",
        vehicle: vehicles[1]._id,
        quantity: 1,
        price: vehicles[1].salePrice || vehicles[1].price
      },
      {
        itemType: "accessory",
        accessory: accessories[1]._id,
        quantity: 2,
        price: accessories[1].salePrice || accessories[1].price
      }
    ],
    subtotalAmount: (vehicles[1].salePrice || vehicles[1].price) + (accessories[1].salePrice || accessories[1].price) * 2,
    discountAmount: 0,
    shippingFee: 40000,
    totalAmount: (vehicles[1].salePrice || vehicles[1].price) + (accessories[1].salePrice || accessories[1].price) * 2 + 40000,
    status: "confirmed",
    paymentMethod: "bank_transfer",
    fulfillmentMethod: "delivery",
    shippingAddress: "Ha Noi",
    distanceKm: 2,
    storeAddress: "1 DN11, Khu Pho 4, Dong Hung Thuan, Ho Chi Minh"
  });

  await Review.create({
    user: user._id,
    vehicle: vehicles[0]._id,
    rating: 5,
    comment: "Mau xe dep, do chat, gia on."
  });

  await Promotion.insertMany([
    { title: "Giam 10% cho don dau tien", code: "WELCOME10", discountPercent: 10, active: true },
    { title: "Sale mo cua showroom", code: "SHOWROOM15", discountPercent: 15, active: true }
  ]);

  await Service.insertMany([
    {
      vehicle: vehicles[0]._id,
      user: user._id,
      serviceType: "Thay da ranh",
      cost: 2500000,
      date: new Date("2026-03-25"),
      notes: "Thay da ranh Michelin, chay re va dam chat",
      status: "completed"
    },
    {
      vehicle: vehicles[0]._id,
      user: user._id,
      serviceType: "Bao duong hang nam",
      cost: 5000000,
      date: new Date("2026-04-10"),
      notes: "Thay dau, loc dau, kiem tra he thong",
      status: "pending"
    },
    {
      vehicle: vehicles[1]._id,
      user: user._id,
      serviceType: "Di chinh phuoc Ohlins",
      cost: 8000000,
      date: new Date("2026-02-15"),
      notes: "Chinh tap cung va tap mem cho hanh trinh",
      status: "completed"
    }
  ]);

  console.log("Seed thanh cong");
  console.log("Admin:", admin.email, "/ 123456");
  console.log("User:", user.email, "/ 123456");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
