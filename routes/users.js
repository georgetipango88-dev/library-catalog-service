const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/users/profile
 * Returns the currently authenticated user's own profile.
 * Identity is derived strictly from the verified JWT in requireAuth (req.user),
 * never from client-supplied query parameters, headers, or request body.
 */
router.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Derive identity strictly from verified token (req.user)
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("borrowedBooks.book");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  }),
);

module.exports = router;
