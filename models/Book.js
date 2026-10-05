const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    totalCopies: {
      type: Number,
      required: true,
      default: 1,
    },
    availableCopies: {
      type: Number,
      required: true,
      default: 1,
      validate: {
        validator: function (value) {
          return value <= this.totalCopies;
        },
        message: "Available copies cannot exceed total copies",
      },
    },
    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Genre",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Book", bookSchema);
