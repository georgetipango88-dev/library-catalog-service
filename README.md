# Library Catalog Service

A small Node.js, Express-ready data layer for a library catalog. This repository currently contains the Mongoose models and a repeatable database seed script.

## Setup

1. Install Node.js LTS.
2. Install dependencies with `npm install`.
3. Create a MongoDB database and configure its connection string in `MONGODB_URI`.
4. Copy `.env.example` to `.env` and replace the placeholder with your own MongoDB connection string. Keep `.env` private; it is ignored by Git.
5. Run `npm run seed` to replace the existing `Book` and `Genre` data with the sample catalog.

The seed script logs the inserted genre and book counts and disconnects from MongoDB when it finishes. Since it deliberately clears both collections before inserting, use it only with a development or assignment database whose catalog data can be replaced.

## Schema Design

### Genre

- `name` is a required, unique string because it is the human-readable label shown in the catalog. A unique constraint prevents duplicate genre labels from becoming separate choices.
- `slug` is a required, unique, lowercase string for stable URL and API identifiers. Storing it separately avoids deriving routes from display text on every request; its lowercase setter and unique constraint keep these identifiers consistent.

### Book

- `title` and `author` are required strings stored directly on each book. They are small attributes routinely displayed and searched with a book, so embedding them avoids extra reads and there is no shared entity to keep synchronized.
- `isbn` is a required, unique string. ISBNs are identifiers, not numbers: retaining the string preserves formatting and leading zeroes. Uniqueness prevents the same edition identifier from being cataloged twice.
- `description` is a required string stored on the book because it describes that specific catalog entry and is normally read with the book. This avoids a separate lookup for a single related value.
- `coverImage` is a string URL stored on the book. A cover URL belongs to a particular catalog entry and can be retrieved with the rest of its display data; making it optional allows a book to remain cataloged when no cover URL is available.
- `totalCopies` and `availableCopies` are required numbers stored on the book. They are small, frequently displayed inventory values that belong to that book, so keeping them together makes catalog reads simple. The trade-off is that inventory updates need to maintain `availableCopies <= totalCopies`; the seed data observes that invariant, and inventory operations should enforce it too.
- `genre` is a required MongoDB `ObjectId` reference to the `Genre` model, not an embedded genre object. Many books share a genre and genres are managed independently, so referencing avoids repeating genre names/slugs across book documents and lets a rename stay consistent. The trade-off is that queries needing genre details may require a Mongoose `populate()` or a separate lookup.

Both schemas use Mongoose timestamps, so MongoDB documents also record when each record was created and last updated.

## Models and Seed Data

- `models/Genre.js` defines the genre collection.
- `models/Book.js` defines books and their genre references.
- `seed.js` clears existing books and genres, inserts four genres and fifteen books, then disconnects.

The seed dataset uses ISBN-13 identifiers and assigns each book to one of the inserted genre documents.