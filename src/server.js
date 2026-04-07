const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");

const connectDatabase = require("./config/db");
const { initSocket } = require("./utils/socket");
const authRoutes = require("./routes/authRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

connectDatabase();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ message: "API is running", googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID) });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal server error"
  });
});

const server = http.createServer(app);
const io = initSocket(server);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
