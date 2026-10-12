const mongoose = require("mongoose");
const Genre = require("../models/Genre");
const Book = require("../models/Book");

// =====================================
// GET ALL GENRES
// GET /genres
// =====================================

const getGenres = async (req, res, next) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: genres,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================
// GET GENRE BY ID
// GET /genres/:id
// =====================================

const getGenreById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid genre ID",
      });
    }

    const genre = await Genre.findById(req.params.id);

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Genre not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: genre,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================
// CREATE GENRE
// POST /genres
// =====================================

const createGenre = async (req, res, next) => {
  try {
    const genre = await Genre.create(req.body);

    return res.status(201).json({
      success: true,
      data: genre,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================
// UPDATE GENRE
// PUT /genres/:id
// =====================================

const updateGenre = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid genre ID",
      });
    }

    const genre = await Genre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Genre not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: genre,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================
// DELETE GENRE
// DELETE /genres/:id
// =====================================

const deleteGenre = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid genre ID",
      });
    }

    // Check whether the genre exists
    const genre = await Genre.findById(req.params.id);

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: "Genre not found",
      });
    }

    // Check whether books are assigned to this genre
    const bookCount = await Book.countDocuments({
      genre: req.params.id,
    });

    // Prevent deletion if books still reference the genre
    if (bookCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete this genre because books are assigned to it",
        bookCount,
      });
    }

    // Delete the genre if no books reference it
    await Genre.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Genre deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================
// EXPORT CONTROLLER FUNCTIONS
// =====================================

module.exports = {
  getGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre,
};
