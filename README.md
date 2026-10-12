# Library Catalog Service

A RESTful Library Catalog API built with Node.js, Express.js,
MongoDB, and Mongoose.

The project supports managing books and genres, validating
requests, searching books, filtering by genre, and pagination.

## Technologies Used

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- express-validator
- dotenv
- cors
- morgan
- Postman

## Setup and Installation

1. Clone the repository:

   git clone https://github.com/georgetipango88-dev/library-catalog-service.git

2. Navigate to the project:

   cd library-catalog-service

3. Install dependencies:

   npm install

4. Copy `.env.example` to `.env`.

5. Configure the MongoDB connection:

   MONGODB_URI=your_mongodb_connection_string
   PORT=5000

6. Start the server:

   npm start

The API runs at:

http://localhost:5000

Ensure your current IP address is authorized in MongoDB Atlas.

## Database Seeding

Run:

npm run seed

The seed script clears existing Book and Genre records,
inserts four genres and fifteen sample books, and disconnects
from MongoDB when finished.

WARNING: Seeding replaces existing catalog data. Use a
development or assignment database.

## API Endpoints

### Genre Endpoints

| Method | Endpoint    | Description                           |
| ------ | ----------- | ------------------------------------- |
| GET    | /genres     | Retrieve all genres                   |
| GET    | /genres/:id | Retrieve a genre by ID                |
| POST   | /genres     | Create a new genre                    |
| PUT    | /genres/:id | Update an existing genre              |
| DELETE | /genres/:id | Delete a genre without assigned books |

Example POST /genres request:

{
"name": "Science Fiction",
"slug": "science-fiction"
}

### Book Endpoints

| Method | Endpoint   | Description           |
| ------ | ---------- | --------------------- |
| GET    | /books     | Retrieve books        |
| GET    | /books/:id | Retrieve a book by ID |
| POST   | /books     | Create a book         |
| PUT    | /books/:id | Update a book         |
| DELETE | /books/:id | Delete a book         |

Example POST /books request:

{
"title": "Example Book",
"author": "Example Author",
"isbn": "9781234567897",
"description": "A sample book for API testing.",
"totalCopies": 5,
"availableCopies": 5,
"genre": "REPLACE_WITH_EXISTING_GENRE_ID"
}

The genre value must reference an existing Genre document.

## Searching, Filtering, and Pagination

The GET /books endpoint supports the following query parameters:

| Parameter | Description                                |
| --------- | ------------------------------------------ |
| genre     | Filter by MongoDB genre ID                 |
| search    | Case-insensitive search by title or author |
| page      | Page number                                |
| limit     | Number of books per page                   |

Examples:

GET /books?search=becoming

GET /books?genre=GENRE_ID

GET /books?page=2&limit=5

GET /books?genre=GENRE_ID&search=becoming&page=1&limit=5

Query parameters can be combined.

Paginated responses include:

- total
- totalPages
- page
- limit
- data

## Request Validation

Reusable validation middleware is implemented in:

middleware/validate.js

Validation covers:

- Required fields
- Incorrect data types
- Empty or invalid field values
- Invalid or nonexistent genre references
- Book inventory constraints

For example, submitting an empty object to POST /books
returns HTTP 400 with field-specific validation errors.

## HTTP Status Codes

| Code | Meaning                                          |
| ---- | ------------------------------------------------ |
| 200  | Successful request                               |
| 201  | Resource created                                 |
| 400  | Invalid request or validation error              |
| 404  | Resource or endpoint not found                   |
| 409  | Genre cannot be deleted while books reference it |
| 500  | Internal server error                            |

The API uses centralized error handling to return JSON error
responses without exposing server stack traces to clients.

## Genre Deletion Policy

A genre cannot be deleted while books are assigned to it.

Before deletion, the API checks whether any Book documents
reference the selected genre.

If books are assigned to that genre, the API returns
HTTP 409 Conflict.

If no books reference the genre, deletion is allowed.

This policy is intended to prevent orphaned book references.

## Schema Design

### Genre

- `name`: Required, unique human-readable genre label.
- `slug`: Required, unique lowercase identifier.

Keeping these fields unique prevents duplicate genre
labels and identifiers.

### Book

- `title`: Required book title.
- `author`: Required author name.
- `isbn`: Required unique string identifier.
- `description`: Required book description.
- `coverImage`: Optional cover image URL.
- `totalCopies`: Total inventory count.
- `availableCopies`: Available inventory count.
- `genre`: Required ObjectId reference to Genre.

The inventory constraint requires availableCopies not to
exceed totalCopies.

Books reference Genre documents rather than embedding genre
information. This avoids duplicating genre details across
multiple books.

Both models use Mongoose timestamps.

## Models and Seed Data

- `models/Genre.js` defines the Genre model.
- `models/Book.js` defines the Book model.
- `seed.js` inserts four genres and fifteen books.

The seed dataset uses ISBN-13 identifiers and associates
each book with an existing genre.

## Project Structure

library-catalog-service/
controllers/
genreController.js
middleware/
validate.js
errorHandler.js
models/
Book.js
Genre.js
routes/
books.js
genres.js
postman/
library-catalog.postman_collection.json
server.js
seed.js
README.md
package.json
.env.example

## Postman Testing

The API endpoints are documented and tested using Postman.

The exported Postman collection is stored at:

postman/library-catalog.postman_collection.json

The collection covers Genre CRUD, Book CRUD, search,
filtering, pagination, and validation-error requests.

## Security

Environment variables are stored in `.env`, which must
not be committed to GitHub.

Database credentials should never be included in the
README or Postman collection.

## Assignment

HPF IT Academy / Power Learn Project

MERN Stack — Week 3

Genre & Book API Hardening
