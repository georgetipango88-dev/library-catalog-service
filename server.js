require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const genreRoutes = require("./routes/genres");
const bookRoutes = require("./routes/books");

// Import centralized error handler
const errorHandler = require("./middleware/errorHandler");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Global middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Library Catalog API is running",
  });
});

// Auth routes (supports /api/auth and /auth)
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

// User profile routes (supports /api/users and /users)
app.use("/api/users", userRoutes);
app.use("/users", userRoutes);

// Genre CRUD routes (supports /api/genres and /genres)
app.use("/api/genres", genreRoutes);
app.use("/genres", genreRoutes);

// Book CRUD routes (supports /api/books and /books)
app.use("/api/books", bookRoutes);
app.use("/books", bookRoutes);

// Handle unknown endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Centralized error handler
// Must be registered after all routes
app.use(errorHandler);

// Connect to MongoDB and start server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
