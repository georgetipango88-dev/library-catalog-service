const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper to generate signed JWT token
const signToken = (user) => {
  const secret =
    process.env.JWT_SECRET || "default_jwt_secret_key_change_in_production";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      username: user.username,
    },
    secret,
    { expiresIn },
  );
};

// Helper for setting cookie options
const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
};

/**
 * POST /api/auth/register
 * Registers a new user. Role defaults to 'patron'.
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Default username to email prefix if not explicitly provided
    const chosenUsername =
      username && username.trim()
        ? username.trim()
        : email.split("@")[0].trim();

    // Check for existing user by email or username
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: chosenUsername }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with that email or username already exists",
      });
    }

    // Default role is 'patron'
    const assignedRole = role === "librarian" ? "librarian" : "patron";

    const user = await User.create({
      username: chosenUsername,
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
    });

    const token = signToken(user);
    res.cookie("token", token, getCookieOptions());

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user,
    });
  }),
);

/**
 * POST /api/auth/login
 * Validates credentials and returns a JWT token (+ sets httpOnly cookie).
 */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email/username and password",
      });
    }

    // Look up user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { username: identifier.trim() },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = signToken(user);
    res.cookie("token", token, getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  }),
);

/**
 * POST /api/auth/logout
 * Clears the auth cookie on client.
 */
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully. Token cleared.",
    });
  }),
);

module.exports = router;
