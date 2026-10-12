function errorHandler(err, req, res, next) {
  console.error("API Error:", err);

  // Duplicate values, such as an existing genre name or slug
  if (err.code === 11000) {
    const field =
      Object.keys(err.keyPattern || err.keyValue || {})[0] || "field";

    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  // Invalid MongoDB ObjectId or other casting errors
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for ${err.path}`,
    });
  }

  // Other application errors
  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "An internal server error occurred"
        : err.message || "Request failed",
  });
}

module.exports = errorHandler;
