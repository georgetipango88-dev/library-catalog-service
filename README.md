# Library Catalog Service

A secure, production-ready RESTful Library Catalog and Management API built with **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**.

The system features robust authentication, password hashing with bcrypt, JSON Web Token (JWT) verification, role-based access control (RBAC: Patrons vs. Librarians), user borrowing/booking activity profiles, input validation, search, filtering, and pagination.

---

## Table of Contents

- [Technologies Used](#technologies-used)
- [Setup and Installation](#setup-and-installation)
- [Database Seeding & Test Accounts](#database-seeding--test-accounts)
- [Token Storage Strategy & Security Trade-Offs (Write-Up)](#token-storage-strategy--security-trade-offs-write-up)
- [Authentication & Role-Based Access Control](#authentication--role-based-access-control)
- [API Endpoints Documentation](#api-endpoints-documentation)
  - [Authentication Endpoints](#authentication-endpoints)
  - [User Profile Endpoints](#user-profile-endpoints)
  - [Book Endpoints (RBAC Protected)](#book-endpoints-rbac-protected)
  - [Genre Endpoints](#genre-endpoints)
- [Searching, Filtering, and Pagination](#searching-filtering-and-pagination)
- [Request Validation & Error Handling](#request-validation--error-handling)
- [Postman Testing & Collection](#postman-testing--collection)
- [Automated Verification Tests](#automated-verification-tests)

---

## Technologies Used

- **Runtime:** Node.js (v18+)
- **Web Framework:** Express.js (v5)
- **Database & ODM:** MongoDB Atlas / Local MongoDB with Mongoose
- **Password Security:** `bcryptjs` (salt rounds: 10)
- **Authentication:** `jsonwebtoken` (JWT, HMAC-SHA256)
- **Cookie Handling:** `cookie-parser`
- **Validation:** `express-validator`
- **Environment & Logging:** `dotenv`, `morgan`, `cors`
- **Testing:** Native Node.js automated test runner & Postman collection

---

## Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/georgetipango88-dev/library-catalog-service.git
   cd library-catalog-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure the following variables in `.env`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=supersecretjwtkey_replace_with_strong_secret_in_production
   JWT_EXPIRES_IN=7d
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   The API will listen at: `http://localhost:5000`

---

## Database Seeding & Test Accounts

Run the database seed script to clear existing records and seed genres, books, and pre-configured test accounts:

```bash
npm run seed
```

Or seed only user accounts via:
```bash
npm run seed:user
```

### Seeded Test Credentials

| Role | Username | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- | :--- |
| **Librarian** | `librarian` | `librarian@library.org` | `Librarian@12345` | Full Catalog Mutation (POST/PUT/DELETE books) & Profile |
| **Patron** | `patron` | `patron@library.org` | `Patron@12345` | Catalog Browsing & Own Profile Access (Forbidden on mutations) |

> [!IMPORTANT]
> **Password Hashing Guarantee:** Plaintext passwords are never stored in the database. All user passwords are encrypted using `bcryptjs` with 10 salt rounds prior to persistence. Stored hashes begin with the `$2a$` or `$2b$` identifier.

---

## Token Storage Strategy & Security Trade-Offs (Write-Up)

### 1. Selected Token Storage Strategy
For this service, we implemented a **dual-delivery architecture**:
- **`httpOnly` Cookies for Browsers:** On successful authentication (`POST /api/auth/register` or `POST /api/auth/login`), the server issues an `httpOnly`, `sameSite: "strict"`, and `secure` cookie named `token`. This guarantees that browser-based clients securely manage authentication state without exposing tokens to client-side scripts.
- **Authorization Header for API / Mobile / Postman Clients:** The signed JWT is simultaneously returned in the JSON response payload (`{ token, user }`). Clients can send this token in the standard HTTP header:
  ```http
  Authorization: Bearer <your_jwt_token>
  ```
The `requireAuth` middleware automatically inspects the `Authorization` header first, falling back to parsed cookies (`req.cookies.token`).

### 2. Security Trade-Off Analysis

#### A. `httpOnly` Cookies (Selected for Browser Sessions)
- **Advantage (XSS Immunity):** `httpOnly` cookies cannot be accessed or read by JavaScript (`document.cookie` returns empty). If an attacker succeeds in exploiting an XSS vulnerability on the frontend, they cannot read, dump, or exfiltrate the authentication token.
- **Trade-Off (CSRF Exposure):** Because browsers automatically include cookies with outbound requests to the server's origin, the site becomes susceptible to Cross-Site Request Forgery (CSRF).  
  *Mitigation:* We mitigate this by configuring `SameSite=Strict`, which commands modern browsers never to attach the authentication cookie during third-party cross-site requests.

#### B. `localStorage` / `sessionStorage`
- **Advantage (Simplicity & CSRF Immunity):** `localStorage` is simple to wire up in SPAs (React, Vue) and is not automatically transmitted with requests, making requests inherently immune to CSRF.
- **Trade-Off (Critical XSS Risk):** Any script executing within the document origin (including third-party analytics, ad tags, or vulnerable npm dependencies) has unrestricted read access to `localStorage.getItem("token")`. A single XSS flaw exposes the token to immediate theft.

#### C. In-Memory Token Storage (State / Closures)
- **Advantage:** Eliminates disk persistence vulnerabilities; tokens cannot be stolen via `localStorage` scrapers.
- **Trade-Off:** Disappears upon page reload or tab closure. Requires implementing a complex "silent refresh" loop with refresh tokens.

### 3. Logout & Invalidation Mechanism
- **Client-Side Invalidation:** The `POST /api/auth/logout` endpoint clears the client cookie by issuing `res.clearCookie("token", { httpOnly: true, sameSite: "strict", secure: ... })`. Programmatic clients discard their in-memory token upon receiving the 200 OK response.
- **Server-Side Revocation:** In enterprise environments requiring instant token revocation, an optional Redis token blocklist or an incrementing `tokenVersion` field on the User schema can be checked by `requireAuth` to invalidate previously issued tokens prior to their expiration date.

---

## Authentication & Role-Based Access Control

The API enforces strict separation between authentication (*"Who are you?"*) and authorization (*"What are you allowed to do?"*):

- **`requireAuth` Middleware (`middleware/auth.js`):** Validates the incoming JWT, decodes the user ID, retrieves the User document from MongoDB (excluding the password hash), and attaches the user to `req.user`. Returns `401 Unauthorized` if the token is missing, expired, or invalid.
- **`requireRole('librarian')` / `isLibrarian` Middleware:** Checks `req.user.role`. Returns `403 Forbidden` if a non-librarian (such as a patron or unprivileged user) attempts to access catalog-mutating routes.

---

## API Endpoints Documentation

### Authentication Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user. Defaults to `patron` role. Issues JWT & sets cookie. |
| `POST` | `/api/auth/login` | Public | Verify credentials and return JWT & cookie. |
| `POST` | `/api/auth/logout` | Authenticated | Clears the auth cookie on client. |

#### Example: Register Patron (`POST /api/auth/register`)
```json
{
  "username": "jane_patron",
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

#### Example: Login (`POST /api/auth/login`)
```json
{
  "email": "librarian@library.org",
  "password": "Librarian@12345"
}
```

---

### User Profile Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Authenticated (`requireAuth`) | Returns the authenticated caller's own profile (derived from token; never accepts user ID from query/body). |

- **Security Note:** Identity is strictly derived from the verified token (`req.user._id`). Any query parameters like `?id=...` are ignored, ensuring zero horizontal privilege escalation.

---

### Book Endpoints (RBAC Protected)

| Method | Endpoint | Access | Required Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/books` | Public | None | List books with search, filter, and pagination |
| `GET` | `/books/:id` | Public | None | Retrieve specific book by ID |
| `POST` | `/books` | Protected | **Librarian** | Create a book (Anonymous: `401`, Patron: `403`, Librarian: `201`) |
| `PUT` | `/books/:id` | Protected | **Librarian** | Update book details/inventory (Patron: `403`, Librarian: `200`) |
| `DELETE` | `/books/:id` | Protected | **Librarian** | Delete book from catalog (Patron: `403`, Librarian: `200`) |

*(Note: Routes are also aliased under `/api/books` for API consistency).*

---

### Genre Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/genres` | Public | Retrieve all genres |
| `GET` | `/genres/:id` | Public | Retrieve genre by ID |
| `POST` | `/genres` | Public | Create new genre |
| `PUT` | `/genres/:id` | Public | Update existing genre |
| `DELETE` | `/genres/:id` | Public | Delete genre (rejected with `409` if referenced by books) |

---

## Postman Testing & Collection

An updated Postman collection is located at:
```
postman/library-catalog.postman_collection.json
```

### Automatic Token Persistence
The `Login Librarian` and `Login Patron` requests contain automated Postman **Tests scripts** that parse the JWT and store it in both the collection and environment variables (`jwt_token` and `patron_token`):
```javascript
const jsonData = pm.response.json();
if (jsonData.token) {
    pm.environment.set("jwt_token", jsonData.token);
    pm.collectionVariables.set("jwt_token", jsonData.token);
}
```
All protected book and user profile requests automatically inherit `{{jwt_token}}` or `{{patron_token}}`.

---

## Automated Verification Tests

A comprehensive integration test suite verifies all grading criteria. Run:

```bash
npm test
```

### Test Suite Output
```text
=== STARTING AUTOMATED TEST SUITE FOR WEEK 4 GRADING ===
--- TEST 1: Password Hashing Verification ---
✅ PASSED: Password in database MUST NOT equal plain-text password
✅ PASSED: Password in database MUST be a valid bcrypt hash (starts with $2)
✅ PASSED: bcrypt.compare must validate candidate password against stored hash
✅ PASSED: User.toJSON() must omit password so it is never exposed in JSON responses

--- TEST 2: Registration Endpoint (POST /api/auth/register) ---
✅ PASSED: POST /api/auth/register returns 201 Created (got 201)
✅ PASSED: Registration response indicates success
✅ PASSED: Registration returns JWT token
✅ PASSED: New registration defaults to 'patron' role
✅ PASSED: Registration response does not leak password
✅ PASSED: Registration sets httpOnly cookie with token

--- TEST 3: Login Endpoints (POST /api/auth/login) ---
✅ PASSED: Invalid credentials returns 401
✅ PASSED: Librarian login returns 200
✅ PASSED: Librarian login issues valid token and role
✅ PASSED: Patron login returns 200
✅ PASSED: Patron login issues valid token and role

--- TEST 4: Logout Endpoint (POST /api/auth/logout) ---
✅ PASSED: Logout returns 200
✅ PASSED: Logout clears/invalidates the auth cookie

--- TEST 5: Profile Endpoint (GET /api/users/profile) ---
✅ PASSED: Accessing profile without token returns 401
✅ PASSED: Accessing profile with invalid token returns 401
✅ PASSED: Patron profile returns 200
✅ PASSED: Profile returns caller's own email
✅ PASSED: Profile returns caller's own role
✅ PASSED: Profile never returns password
✅ PASSED: Profile models borrowedBooks activity array
✅ PASSED: Profile models bookedStudySpaces activity array
✅ PASSED: Librarian profile returns 200

--- TEST 6: Protected POST /books (Role-Based Access Control) ---
✅ PASSED: POST /books without token returns 401 Unauthorized
✅ PASSED: POST /books with valid patron token returns 403 Forbidden
✅ PASSED: POST /books with valid librarian token succeeds with 201 Created

--- TEST 7: Protected PUT /books/:id ---
✅ PASSED: PUT /books/:id with patron token returns 403 Forbidden
✅ PASSED: PUT /books/:id with librarian token returns 200 OK

--- TEST 8: Protected DELETE /books/:id ---
✅ PASSED: DELETE /books/:id with patron token returns 403 Forbidden
✅ PASSED: DELETE /books/:id with librarian token returns 200 OK

--- TEST 9: Verification of /api/books and /api/users Aliases ---
✅ PASSED: POST /api/books without token returns 401

🎉 ALL ASSIGNMENT REQUIREMENTS PASSED WITH 100% SUCCESS!
```

---

## Assignment Information

- **Course:** HPF IT Academy / Power Learn Project — MERN Stack
- **Module:** Week 4 — Authentication, Authorization & Security Hardening
- **Repository:** [https://github.com/georgetipango88-dev/library-catalog-service.git](https://github.com/georgetipango88-dev/library-catalog-service.git)
