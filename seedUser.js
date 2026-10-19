require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");

const seedLibrarian = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in the .env file");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for user seeding");

    // Remove existing seed users if present to ensure clean state
    await User.deleteMany({
      email: { $in: ["librarian@library.org", "patron@library.org"] },
    });

    // Seed exactly one librarian account with a known test password
    const librarian = await User.create({
      username: "librarian",
      email: "librarian@library.org",
      password: "Librarian@12345",
      role: "librarian",
    });

    // Seed one patron account for testing 403 Forbidden role restrictions
    const patron = await User.create({
      username: "patron",
      email: "patron@library.org",
      password: "Patron@12345",
      role: "patron",
    });

    console.log("-----------------------------------------");
    console.log("User accounts seeded successfully:");
    console.log(`Librarian Account:`);
    console.log(`  Username: ${librarian.username}`);
    console.log(`  Email:    ${librarian.email}`);
    console.log(`  Password: Librarian@12345`);
    console.log(`  Role:     ${librarian.role}`);
    console.log(`  ID:       ${librarian._id}`);
    console.log("-----------------------------------------");
    console.log(`Patron Account:`);
    console.log(`  Username: ${patron.username}`);
    console.log(`  Email:    ${patron.email}`);
    console.log(`  Password: Patron@12345`);
    console.log(`  Role:     ${patron.role}`);
    console.log(`  ID:       ${patron._id}`);
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("Error seeding users:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

seedLibrarian();
