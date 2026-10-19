require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const app = require("./server");
const User = require("./models/User");
const Book = require("./models/Book");
const Genre = require("./models/Genre");

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;

let server;
let librarianToken = "";
let patronToken = "";
let sampleGenreId = "";
let createdBookId = "";

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
};

async function runTests() {
  try {
    console.log("=== STARTING AUTOMATED TEST SUITE FOR WEEK 4 GRADING ===");

    // Ensure database connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Start HTTP server on test port
    await new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`Test server running on ${BASE_URL}`);
        resolve();
      });
    });

    // Reset & Seed test data
    await User.deleteMany({});
    await Book.deleteMany({});
    await Genre.deleteMany({});

    // 1. Verify Passwords are NEVER stored plaintext in DB
    console.log("\n--- TEST 1: Password Hashing Verification ---");
    const testPlainPassword = "MySecurePassword123!";
    const testUser = await User.create({
      username: "test_hasher",
      email: "hasher@test.com",
      password: testPlainPassword,
      role: "patron",
    });

    // Fetch directly from DB with raw lean query
    const rawUserDoc = await User.findById(testUser._id).select("+password").lean();
    assert(
      rawUserDoc.password !== testPlainPassword,
      "Password in database MUST NOT equal plain-text password",
    );
    assert(
      rawUserDoc.password.startsWith("$2"),
      `Password in database MUST be a valid bcrypt hash (starts with $2), got: ${rawUserDoc.password.substring(0, 7)}...`,
    );
    assert(
      await bcrypt.compare(testPlainPassword, rawUserDoc.password),
      "bcrypt.compare must validate candidate password against stored hash",
    );
    assert(
      testUser.toJSON().password === undefined,
      "User.toJSON() must omit password so it is never exposed in JSON responses",
    );

    // Seed Genre for book tests
    const genre = await Genre.create({
      name: "Cyberpunk",
      slug: "cyberpunk",
    });
    sampleGenreId = genre._id.toString();

    // 2. Auth Endpoints: Register Patron
    console.log("\n--- TEST 2: Registration Endpoint (POST /api/auth/register) ---");
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "registered_patron",
        email: "patron_new@library.org",
        password: "PatronPassword123!",
      }),
    });
    assert(regRes.status === 201, `POST /api/auth/register returns 201 Created (got ${regRes.status})`);
    const regData = await regRes.json();
    assert(regData.success === true, "Registration response indicates success");
    assert(regData.token && typeof regData.token === "string", "Registration returns JWT token");
    assert(regData.user.role === "patron", "New registration defaults to 'patron' role");
    assert(regData.user.password === undefined, "Registration response does not leak password");

    // Check Set-Cookie header contains token
    const regCookie = regRes.headers.get("set-cookie");
    assert(regCookie && regCookie.includes("token="), "Registration sets httpOnly cookie with token");

    // 3. Auth Endpoints: Seeded Accounts & Login
    console.log("\n--- TEST 3: Login Endpoints (POST /api/auth/login) ---");
    // Seed standard librarian and patron
    await User.create({
      username: "librarian",
      email: "librarian@library.org",
      password: "Librarian@12345",
      role: "librarian",
    });
    await User.create({
      username: "patron",
      email: "patron@library.org",
      password: "Patron@12345",
      role: "patron",
    });

    // Test invalid login
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "librarian@library.org",
        password: "WrongPassword!",
      }),
    });
    assert(badLoginRes.status === 401, `Invalid credentials returns 401 (got ${badLoginRes.status})`);

    // Test librarian login
    const libLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "librarian@library.org",
        password: "Librarian@12345",
      }),
    });
    assert(libLoginRes.status === 200, `Librarian login returns 200 (got ${libLoginRes.status})`);
    const libData = await libLoginRes.json();
    assert(libData.token && libData.user.role === "librarian", "Librarian login issues valid token and role");
    librarianToken = libData.token;

    // Test patron login
    const patLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "patron@library.org",
        password: "Patron@12345",
      }),
    });
    assert(patLoginRes.status === 200, `Patron login returns 200 (got ${patLoginRes.status})`);
    const patData = await patLoginRes.json();
    assert(patData.token && patData.user.role === "patron", "Patron login issues valid token and role");
    patronToken = patData.token;

    // 4. Logout Endpoint: Invalidation / Cookie clearing
    console.log("\n--- TEST 4: Logout Endpoint (POST /api/auth/logout) ---");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
    });
    assert(logoutRes.status === 200, `Logout returns 200 (got ${logoutRes.status})`);
    const logoutCookie = logoutRes.headers.get("set-cookie");
    assert(
      logoutCookie && (logoutCookie.includes("token=;") || logoutCookie.includes("Max-Age=0") || logoutCookie.includes("Expires=")),
      "Logout clears/invalidates the auth cookie",
    );

    // 5. User Profile: GET /api/users/profile
    console.log("\n--- TEST 5: Profile Endpoint (GET /api/users/profile) ---");
    // Without token -> 401
    const noTokenProfileRes = await fetch(`${BASE_URL}/api/users/profile`);
    assert(noTokenProfileRes.status === 401, `Accessing profile without token returns 401 (got ${noTokenProfileRes.status})`);

    // With invalid token -> 401
    const badTokenProfileRes = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: "Bearer totally_bogus_token" },
    });
    assert(badTokenProfileRes.status === 401, `Accessing profile with invalid token returns 401 (got ${badTokenProfileRes.status})`);

    // With patron token -> 200 (strictly caller's data)
    const patronProfileRes = await fetch(`${BASE_URL}/api/users/profile?id=malicious_spoofed_id`, {
      headers: { Authorization: `Bearer ${patronToken}` },
    });
    assert(patronProfileRes.status === 200, `Patron profile returns 200 (got ${patronProfileRes.status})`);
    const patronProfileData = await patronProfileRes.json();
    assert(patronProfileData.data.email === "patron@library.org", "Profile returns caller's own email");
    assert(patronProfileData.data.role === "patron", "Profile returns caller's own role");
    assert(patronProfileData.data.password === undefined, "Profile never returns password");
    assert(Array.isArray(patronProfileData.data.borrowedBooks), "Profile models borrowedBooks activity array");
    assert(Array.isArray(patronProfileData.data.bookedStudySpaces), "Profile models bookedStudySpaces activity array");

    // With librarian token -> 200 (strictly librarian's data)
    const libProfileRes = await fetch(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${librarianToken}` },
    });
    assert(libProfileRes.status === 200, `Librarian profile returns 200 (got ${libProfileRes.status})`);
    const libProfileData = await libProfileRes.json();
    assert(libProfileData.data.email === "librarian@library.org", "Librarian profile returns librarian's email");

    // 6. Role-Based Access Control on Book-Mutating Routes: POST /books
    console.log("\n--- TEST 6: Protected POST /books (Role-Based Access Control) ---");
    const newBookPayload = {
      title: "Neuromancer",
      author: "William Gibson",
      isbn: "9780441569595",
      description: "Case is a washed-up computer hacker hired for one last job in cyberspace.",
      totalCopies: 5,
      availableCopies: 5,
      genre: sampleGenreId,
    };

    // A. Anonymous / No Token -> 401
    const noAuthBookRes = await fetch(`${BASE_URL}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBookPayload),
    });
    assert(
      noAuthBookRes.status === 401,
      `POST /books without token returns 401 Unauthorized (got ${noAuthBookRes.status})`,
    );

    // B. Patron Token -> 403 Forbidden
    const patronBookRes = await fetch(`${BASE_URL}/books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patronToken}`,
      },
      body: JSON.stringify(newBookPayload),
    });
    assert(
      patronBookRes.status === 403,
      `POST /books with valid patron token returns 403 Forbidden (got ${patronBookRes.status})`,
    );

    // C. Librarian Token -> 201 Created
    const libBookRes = await fetch(`${BASE_URL}/books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${librarianToken}`,
      },
      body: JSON.stringify(newBookPayload),
    });
    assert(
      libBookRes.status === 201,
      `POST /books with valid librarian token succeeds with 201 Created (got ${libBookRes.status})`,
    );
    const libBookData = await libBookRes.json();
    createdBookId = libBookData.data._id;
    assert(createdBookId !== undefined, "Book was created and has an _id");

    // 7. Role-Based Access Control: PUT /books/:id
    console.log("\n--- TEST 7: Protected PUT /books/:id ---");
    // Patron -> 403
    const patronPutRes = await fetch(`${BASE_URL}/books/${createdBookId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patronToken}`,
      },
      body: JSON.stringify({ totalCopies: 10, availableCopies: 10 }),
    });
    assert(
      patronPutRes.status === 403,
      `PUT /books/:id with patron token returns 403 Forbidden (got ${patronPutRes.status})`,
    );

    // Librarian -> 200
    const libPutRes = await fetch(`${BASE_URL}/books/${createdBookId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${librarianToken}`,
      },
      body: JSON.stringify({ totalCopies: 10, availableCopies: 10 }),
    });
    assert(
      libPutRes.status === 200,
      `PUT /books/:id with librarian token returns 200 OK (got ${libPutRes.status})`,
    );

    // 8. Role-Based Access Control: DELETE /books/:id
    console.log("\n--- TEST 8: Protected DELETE /books/:id ---");
    // Patron -> 403
    const patronDelRes = await fetch(`${BASE_URL}/books/${createdBookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${patronToken}` },
    });
    assert(
      patronDelRes.status === 403,
      `DELETE /books/:id with patron token returns 403 Forbidden (got ${patronDelRes.status})`,
    );

    // Librarian -> 200
    const libDelRes = await fetch(`${BASE_URL}/books/${createdBookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${librarianToken}` },
    });
    assert(
      libDelRes.status === 200,
      `DELETE /books/:id with librarian token returns 200 OK (got ${libDelRes.status})`,
    );

    // 9. Also verify /api/books path aliases work identically
    console.log("\n--- TEST 9: Verification of /api/books and /api/users Aliases ---");
    const apiBooksNoAuth = await fetch(`${BASE_URL}/api/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBookPayload),
    });
    assert(
      apiBooksNoAuth.status === 401,
      `POST /api/books without token returns 401 (got ${apiBooksNoAuth.status})`,
    );

    console.log("\n========================================================");
    console.log("🎉 ALL ASSIGNMENT REQUIREMENTS PASSED WITH 100% SUCCESS!");
    console.log("========================================================\n");
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runTests();
