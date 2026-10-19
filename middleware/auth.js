const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Authentication Middleware:
 * Verifies JWT from either 'Authorization: Bearer <token>' header or httpOnly cookie.
 * Attaches the authenticated user object (excluding password) to req.user.
 */
const requireAuth = async (req, res, next) => {
  let token;

  // 1. Check Authorization header for Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    // 2. Check cookies as fallback or primary client storage
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token missing",
    });
  }

  try {
    const secret = process.env.JWT_SECRET || "default_jwt_secret_key_change_in_production";
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or account deactivated",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/**
 * Role-Based Authorization Middleware:
 * Restricts access to users having specified roles.
 * Returns 403 Forbidden if user's role does not match.
 *
 * @param  {...string} roles - Permitted roles (e.g., 'librarian')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: this action requires '${roles.join(" or ")}' privileges`,
      });
    }

    next();
  };
};

// Convenience shorthand for librarian routes
const isLibrarian = requireRole("librarian");

module.exports = {
  requireAuth,
  protect: requireAuth, // course note alias
  requireRole,
  isLibrarian,
};
