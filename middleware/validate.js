const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const Genre = require("../models/Genre");

// Return validation errors as JSON
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path || "body",
        message: error.msg,
      })),
    });
  }

  next();
};

// =====================================
// GENRE VALIDATION
// =====================================

const genreCreateRules = [
  body("name")
    .isString()
    .withMessage("name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("name is required"),

  body("slug")
    .isString()
    .withMessage("slug must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("slug is required"),
];

const genreUpdateRules = [
  body("name")
    .optional()
    .isString()
    .withMessage("name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("name cannot be empty"),

  body("slug")
    .optional()
    .isString()
    .withMessage("slug must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("slug cannot be empty"),

  body().custom((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !["name", "slug"].some((field) =>
        Object.prototype.hasOwnProperty.call(value, field),
      )
    ) {
      throw new Error("Provide at least one of: name or slug");
    }

    return true;
  }),
];

// =====================================
// BOOK VALIDATION
// =====================================

const validateGenreExists = async (value) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new Error("genre must be a valid MongoDB ID");
  }

  const genre = await Genre.findById(value);

  if (!genre) {
    throw new Error("genre does not exist");
  }

  return true;
};

const bookFields = [
  "title",
  "author",
  "isbn",
  "description",
  "coverImage",
  "totalCopies",
  "availableCopies",
  "genre",
];

const requiredBookString = (field) =>
  body(field)
    .isString()
    .withMessage(`${field} must be a string`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`);

const optionalBookString = (field) =>
  body(field)
    .optional()
    .isString()
    .withMessage(`${field} must be a string`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${field} cannot be empty`);

const copyCountRule = (field) =>
  body(field)
    .optional()
    .isInt({ min: 0 })
    .withMessage(`${field} must be a non-negative integer`)
    .bail()
    .toInt();

const bookCreateRules = [
  requiredBookString("title"),
  requiredBookString("author"),
  requiredBookString("isbn"),
  requiredBookString("description"),

  body("coverImage")
    .optional()
    .isString()
    .withMessage("coverImage must be a string"),

  copyCountRule("totalCopies"),
  copyCountRule("availableCopies"),

  body("genre")
    .isString()
    .withMessage("genre must be a string")
    .bail()
    .notEmpty()
    .withMessage("genre is required")
    .bail()
    .custom(validateGenreExists),

  body().custom((value) => {
    const total = value.totalCopies ?? 1;
    const available = value.availableCopies ?? 1;

    if (
      Number.isInteger(total) &&
      Number.isInteger(available) &&
      available > total
    ) {
      throw new Error("availableCopies cannot exceed totalCopies");
    }

    return true;
  }),
];

const bookUpdateRules = [
  optionalBookString("title"),
  optionalBookString("author"),
  optionalBookString("isbn"),
  optionalBookString("description"),

  body("coverImage")
    .optional()
    .isString()
    .withMessage("coverImage must be a string"),

  copyCountRule("totalCopies"),
  copyCountRule("availableCopies"),

  body("genre")
    .optional()
    .isString()
    .withMessage("genre must be a string")
    .bail()
    .notEmpty()
    .withMessage("genre cannot be empty")
    .bail()
    .custom(validateGenreExists),

  body().custom((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !bookFields.some((field) =>
        Object.prototype.hasOwnProperty.call(value, field),
      )
    ) {
      throw new Error("Provide at least one Book field to update");
    }

    if (
      Number.isInteger(value.totalCopies) &&
      Number.isInteger(value.availableCopies) &&
      value.availableCopies > value.totalCopies
    ) {
      throw new Error("availableCopies cannot exceed totalCopies");
    }

    return true;
  }),
];

// Export reusable validation middleware
module.exports = {
  validate,
  genreCreateRules,
  genreUpdateRules,
  bookCreateRules,
  bookUpdateRules,
};
