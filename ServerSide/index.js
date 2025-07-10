const Express = require("express");
const router = Express.Router();
const db = require("./config/database");
const { cloudinaryconnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const userroutes = require("./Routes/User.js");
const productRoutes = require("./Routes/productRoutes");
const cookiesparser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const errorMiddleware = require("./Middleware/errorMiddleware");
const contractRoutes = require('./Routes/contractRoutes');
const uploadRoutes = require('./Routes/uploadRoutes');
const notificationRoutes = require('./Routes/notificationRoute');
const chatRoutes = require('./Routes/chatRoutes');
const contactRoutes = require('./Routes/contactRoutes');
const http = require('http');
const { Server } = require('socket.io');
const setupSocketServer = require('./socket/socketManager');

const app = Express();

require("dotenv").config();

const PORT = process.env.PORT || 4000;
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

app.use(cookiesparser());
app.use(
  cors({
    origin: '*',
    // credentials: true, // Remove this line for wildcard origin
  })
);

// Using fileUpload for routes that don't use multer
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Connect to database
db.connect();

// Connect to cloudinary
cloudinaryconnect();

// Set up routes
app.use("/api/v1/auth", userroutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/contracts", contractRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1", notificationRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/contact", contactRoutes);

// Serve temp files
app.use('/tmp', Express.static(path.join(__dirname, 'tmp')));

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your Server Running",
  });
});

// Error Handling Middleware
app.use(errorMiddleware);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
    // credentials: true // Remove this line for wildcard origin
  }
});

// Make io available to controllers
app.set('socketio', io);

// Setup socket server
setupSocketServer(io);

// Only start the server if not running in a serverless environment
if (process.env.VERCEL === undefined) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app for Vercel serverless function
module.exports = app;
