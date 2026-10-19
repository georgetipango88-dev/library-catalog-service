# Token Storage Strategy & Security Trade-Off Analysis

**Course:** MERN Stack — Week 4: Authentication, Authorization, and Security  
**Project:** Library Catalog Service (`library-catalog-service`)  
**Author:** George Tipango  

---

## 1. Selected Token Storage Strategy

For this application, we implemented a **dual-delivery architecture** centered on **`httpOnly` cookies** for browser clients, with support for standard **`Authorization: Bearer <token>` HTTP headers** for API consumers and testing tools (such as Postman and automated test suites).

When a user successfully authenticates via `POST /api/auth/register` or `POST /api/auth/login`, the server:
1. Issues a cryptographically signed JSON Web Token (JWT) signed with HMAC-SHA256 and a strong server-side secret (`JWT_SECRET`).
2. Sets an **`httpOnly` cookie** named `token` with strict flags:
   - `httpOnly: true` (disallows client-side JavaScript access via `document.cookie`).
   - `sameSite: "strict"` (instructs browsers not to send the cookie on cross-site requests).
   - `secure: true` in production (enforces HTTPS-only transmission).
   - `maxAge: 7 * 24 * 60 * 60 * 1000` (7-day lifespan aligned with token expiry).
3. Simultaneously returns the JWT string in the JSON response payload (`{ success: true, token, user }`), permitting decoupled clients (Postman, mobile apps, single-page frontends) to store the token in memory and provide it via the `Authorization: Bearer <token>` header.
4. The authentication middleware (`requireAuth`) inspects both the `Authorization` header and incoming parsed cookies (`req.cookies.token`), providing seamless support across both client paradigms.

---

## 2. In-Depth Security Trade-Off Analysis

### Option A: `httpOnly` Cookies (Our Primary Client Storage)

- **Key Advantage — Defense against Cross-Site Scripting (XSS):**  
  Because the browser prevents client-side JavaScript from accessing `httpOnly` cookies, any malicious script injected into the application (via an unescaped input, compromised third-party library, or malicious CDN asset) **cannot read or exfiltrate the JWT**. This eliminates the primary token theft vector.

- **Primary Trade-Off — Cross-Site Request Forgery (CSRF):**  
  Because browsers automatically attach cookies to HTTP requests made to the target domain, an external malicious site could induce a user's browser to submit authenticated requests without their consent.  
  *How We Mitigated This Trade-Off:*  
  We set `sameSite: "strict"`, which instructs modern browsers never to send the authentication cookie during cross-site requests. For distributed or cross-domain architectures, this is additionally paired with CSRF double-submit cookies or custom header verification.

---

### Option B: `localStorage` / `sessionStorage`

- **Key Advantage — Simplicity & Inherent CSRF Resistance:**  
  `localStorage` is trivial to implement in single-page applications (React, Vue) and works seamlessly across origins without CORS cookie configuration. Furthermore, because browsers do not automatically attach `localStorage` values to outgoing HTTP requests, requests made with `localStorage` tokens must explicitly include `Authorization: Bearer <token>`, making the system inherently immune to classical CSRF attacks.

- **Primary Trade-Off — Catastrophic Exposure to XSS:**  
  Any script executing within the window origin can read `localStorage.getItem("token")`. A single Cross-Site Scripting vulnerability in any frontend component or dependency allows an attacker to silently steal the token, store it remotely, and impersonate the user indefinitely until the token expires.

---

### Option C: In-Memory / Closure Storage

- **Key Advantage:**  
  Storing the token purely in application memory (e.g., a React context/state variable) provides the strongest security against persistence attacks: it cannot be harvested from disk or storage APIs, and it is not vulnerable to CSRF.

- **Primary Trade-Off:**  
  The token is wiped whenever the user refreshes the page, navigates between tabs, or closes the window. To prevent forcing users to re-login on every page refresh, this strategy requires a complex "silent refresh" mechanism using an `httpOnly` refresh token cookie to re-issue short-lived in-memory access tokens.

---

## 3. Token Invalidation and Logout Mechanism

HTTP is stateless, and standard JWTs remain cryptographically valid until their encoded expiration (`exp`) timestamp passes. To handle logout robustly:

1. **Client-Side Cookie Invalidation:**  
   When the client calls `POST /api/auth/logout`, the server responds with:
   ```javascript
   res.clearCookie("token", {
     httpOnly: true,
     secure: process.env.NODE_ENV === "production",
     sameSite: "strict",
   });
   ```
   This clears the cookie in the user's browser immediately.

2. **Client-Side Storage Invalidation:**  
   Clients maintaining tokens in memory or `localStorage` discard the token reference upon receiving the 200 response from `POST /api/auth/logout`.

3. **Server-Side Token Blocklisting / Expiration:**  
   To prevent replay attacks before the token's natural expiry, production systems implement a server-side Redis token blocklist (storing logged-out `jti` or token hashes with TTL equal to the remaining expiry) or an incremental `tokenVersion` integer on the `User` document. If a user logs out or changes their password, `tokenVersion` increments, immediately invalidating any prior tokens whose embedded version no longer matches the database record.

---

## 4. Summary Matrix

| Storage Mechanism | XSS Resilience | CSRF Resilience | Complexity | Session Invalidation |
| :--- | :--- | :--- | :--- | :--- |
| **`httpOnly` Cookie** *(Selected)* | **High** (JavaScript cannot read token) | **Requires `SameSite`/CSRF handling** | Moderate | Cookie cleared on `POST /api/auth/logout` |
| **`localStorage`** | **Critical Risk** (Full token exfiltration) | **High** (Not sent automatically) | Low | Client removes key from storage |
| **In-Memory State** | **High** (Ephemeral, non-persistent) | **High** (Requires explicit headers) | High (Requires silent refresh) | Memory cleared on logout / tab close |
