const express = require("express");

const {
  getGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre,
} = require("../controllers/genreController");

const {
  validate,
  genreCreateRules,
  genreUpdateRules,
} = require("../middleware/validate");

const router = express.Router();

// Get all genres
router.get("/", getGenres);

// Get one genre by ID
router.get("/:id", getGenreById);

// Create a genre with input validation
router.post("/", genreCreateRules, validate, createGenre);

// Update a genre with input validation
router.put("/:id", genreUpdateRules, validate, updateGenre);

// Delete a genre
router.delete("/:id", deleteGenre);

module.exports = router;
