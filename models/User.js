const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const borrowedBookSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    borrowedAt: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day default loan period
    },
    returned: {
      type: Boolean,
      default: false,
    },
    returnedAt: {
      type: Date,
    },
  },
  { _id: true },
);

const studySpaceBookingSchema = new mongoose.Schema(
  {
    spaceName: {
      type: String,
      required: true,
      trim: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
    },
  },
  { _id: true, timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      enum: {
        values: ["patron", "librarian"],
        message: "{VALUE} is not a valid role. Allowed roles are: patron, librarian",
      },
      default: "patron",
    },
    borrowedBooks: [borrowedBookSchema],
    bookedStudySpaces: [studySpaceBookingSchema],
  },
  {
    timestamps: true,
  },
);

// Hash password before saving if modified or new
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with stored hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Guarantee password is never leaked in JSON outputs
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
