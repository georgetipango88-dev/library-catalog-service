const express = require("express");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const { requireAuth, requireRole } = require("../middleware/auth");

const {
  validate,
  bookCreateRules,
  bookUpdateRules,
} = require("../middleware/validate");

const router = express.Router();

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const validId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid Book ID",
    });
  }
  next();
};

// GET /books - Filtering, searching, pagination (Public)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { genre, search } = req.query;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "page must be >= 1 and limit must be between 1 and 100",
      });
    }

    const filter = {};

    if (genre) {
      if (!mongoose.isValidObjectId(genre)) {
        return res.status(400).json({
          success: false,
          message: "Invalid genre ID",
        });
      }
      filter.genre = genre;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { author: { $regex: escaped, $options: "i" } },
      ];
    }

    const total = await Book.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const books = await Book.find(filter)
      .populate("genre")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      totalPages,
      page,
      limit,
      data: books,
    });
  }),
);

// GET /books/:id (Public)
router.get(
  "/:id",
  validId,
  asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id).populate("genre");

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({ success: true, data: book });
  }),
);

// POST /books (Protected: Librarian Only)
router.post(
  "/",
  requireAuth,
  requireRole("librarian"),
  bookCreateRules,
  validate,
  asyncHandler(async (req, res) => {
    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      data: book,
    });
  }),
);

// PUT /books/:id (Protected: Librarian Only)
router.put(
  "/:id",
  requireAuth,
  requireRole("librarian"),
  validId,
  bookUpdateRules,
  validate,
  asyncHandler(async (req, res) => {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const total = req.body.totalCopies ?? book.totalCopies;
    const available = req.body.availableCopies ?? book.availableCopies;

    if (available > total) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: [
          {
            field: "availableCopies",
            message: "availableCopies cannot exceed totalCopies",
          },
        ],
      });
    }

    const allowedFields = [
      "title",
      "author",
      "isbn",
      "description",
      "coverImage",
      "totalCopies",
      "availableCopies",
      "genre",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        book[field] = req.body[field];
      }
    }

    await book.save();

    res.status(200).json({
      success: true,
      data: book,
    });
  }),
);

// DELETE /books/:id (Protected: Librarian Only)
router.delete(
  "/:id",
  requireAuth,
  requireRole("librarian"),
  validId,
  asyncHandler(async (req, res) => {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  }),
);

module.exports = router;
