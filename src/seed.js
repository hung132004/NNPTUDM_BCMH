const dotenv = require("dotenv");
const connectDatabase = require("./config/db");
const User = require("./models/User");
const Brand = require("./models/Brand");
const Category = require("./models/Category");
const Vehicle = require("./models/Vehicle");
const Cart = require("./models/Cart");
const Order = require("./models/Order");
const Review = require("./models/Review");
const Promotion = require("./models/Promotion");

dotenv.config();

async function seed() {
  await connectDatabase();

  await Promise.all([
    User.deleteMany(),
    Brand.deleteMany(),
    Category.deleteMany(),
    Vehicle.deleteMany(),
    Cart.deleteMany(),
    Order.deleteMany(),
    Review.deleteMany(),
    Promotion.deleteMany()
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

  await Cart.create({
    user: user._id,
    items: [
      {
        vehicle: vehicles[0]._id,
        quantity: 1,
        price: vehicles[0].salePrice || vehicles[0].price
      }
    ]
  });

  await Order.create({
    user: user._id,
    items: [
      {
        vehicle: vehicles[1]._id,
        quantity: 1,
        price: vehicles[1].salePrice || vehicles[1].price
      }
    ],
    totalAmount: vehicles[1].salePrice || vehicles[1].price,
    status: "confirmed",
    paymentMethod: "COD",
    shippingAddress: "Ha Noi"
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

  console.log("Seed thanh cong");
  console.log("Admin:", admin.email, "/ 123456");
  console.log("User:", user.email, "/ 123456");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
