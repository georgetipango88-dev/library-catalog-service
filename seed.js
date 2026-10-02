require("dotenv").config();

const mongoose = require("mongoose");
const Genre = require("./models/Genre");
const Book = require("./models/Book");

const seedDatabase = async () => {
  try {
    // Check that the MongoDB connection string exists
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in the .env file");
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data so the seed script can be safely re-run
    await Book.deleteMany({});
    await Genre.deleteMany({});

    console.log("Existing books and genres cleared");

    // Create genres
    const genres = await Genre.insertMany([
      {
        name: "Science Fiction",
        slug: "science-fiction",
      },
      {
        name: "Fantasy",
        slug: "fantasy",
      },
      {
        name: "Mystery",
        slug: "mystery",
      },
      {
        name: "Biography",
        slug: "biography",
      },
    ]);

    // Get each genre so its MongoDB ObjectId can be referenced by books
    const scienceFiction = genres.find(
      (genre) => genre.slug === "science-fiction",
    );
    const fantasy = genres.find((genre) => genre.slug === "fantasy");
    const mystery = genres.find((genre) => genre.slug === "mystery");
    const biography = genres.find((genre) => genre.slug === "biography");

    // Create books
    const books = [
      {
        title: "Dune",
        author: "Frank Herbert",
        isbn: "9780441172719",
        description:
          "A science fiction novel about politics, survival, and power on the desert planet Arrakis.",
        coverImage: "https://example.com/images/dune.jpg",
        totalCopies: 6,
        availableCopies: 4,
        genre: scienceFiction._id,
      },
      {
        title: "The Martian",
        author: "Andy Weir",
        isbn: "9780553418026",
        description:
          "An astronaut uses science and determination to survive alone on Mars.",
        coverImage: "https://example.com/images/the-martian.jpg",
        totalCopies: 5,
        availableCopies: 3,
        genre: scienceFiction._id,
      },
      {
        title: "Foundation",
        author: "Isaac Asimov",
        isbn: "9780553293357",
        description:
          "Scientists attempt to preserve human knowledge during the decline of a galactic empire.",
        coverImage: "https://example.com/images/foundation.jpg",
        totalCopies: 4,
        availableCopies: 2,
        genre: scienceFiction._id,
      },
      {
        title: "The Left Hand of Darkness",
        author: "Ursula K. Le Guin",
        isbn: "9780441478125",
        description:
          "A science fiction story exploring culture, identity, and diplomacy on a distant planet.",
        coverImage: "https://example.com/images/the-left-hand-of-darkness.jpg",
        totalCopies: 3,
        availableCopies: 2,
        genre: scienceFiction._id,
      },
      {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "9780547928227",
        description:
          "Bilbo Baggins joins a dangerous journey to reclaim a lost dwarven kingdom.",
        coverImage: "https://example.com/images/the-hobbit.jpg",
        totalCopies: 7,
        availableCopies: 5,
        genre: fantasy._id,
      },
      {
        title: "A Game of Thrones",
        author: "George R.R. Martin",
        isbn: "9780553593716",
        description:
          "Noble families compete for political power in a dangerous fantasy kingdom.",
        coverImage: "https://example.com/images/a-game-of-thrones.jpg",
        totalCopies: 5,
        availableCopies: 2,
        genre: fantasy._id,
      },
      {
        title: "The Name of the Wind",
        author: "Patrick Rothfuss",
        isbn: "9780756404741",
        description:
          "A gifted musician and magician tells the story of his extraordinary life.",
        coverImage: "https://example.com/images/the-name-of-the-wind.jpg",
        totalCopies: 4,
        availableCopies: 4,
        genre: fantasy._id,
      },
      {
        title: "The Lion, the Witch and the Wardrobe",
        author: "C.S. Lewis",
        isbn: "9780064471046",
        description:
          "Four children discover the magical world of Narnia and join a struggle against evil.",
        coverImage: "https://example.com/images/lion-witch-wardrobe.jpg",
        totalCopies: 6,
        availableCopies: 3,
        genre: fantasy._id,
      },
      {
        title: "Gone Girl",
        author: "Gillian Flynn",
        isbn: "9780307588371",
        description:
          "A woman's disappearance creates suspicion and reveals secrets within her marriage.",
        coverImage: "https://example.com/images/gone-girl.jpg",
        totalCopies: 5,
        availableCopies: 4,
        genre: mystery._id,
      },
      {
        title: "The Girl with the Dragon Tattoo",
        author: "Stieg Larsson",
        isbn: "9780307454546",
        description:
          "A journalist and a hacker investigate a decades-old disappearance.",
        coverImage: "https://example.com/images/girl-with-dragon-tattoo.jpg",
        totalCopies: 4,
        availableCopies: 2,
        genre: mystery._id,
      },
      {
        title: "The Silent Patient",
        author: "Alex Michaelides",
        isbn: "9781250301697",
        description:
          "A psychotherapist investigates why a famous artist stopped speaking after a violent crime.",
        coverImage: "https://example.com/images/silent-patient.jpg",
        totalCopies: 5,
        availableCopies: 1,
        genre: mystery._id,
      },
      {
        title: "The Hound of the Baskervilles",
        author: "Arthur Conan Doyle",
        isbn: "9780140437867",
        description:
          "Sherlock Holmes investigates a mysterious death linked to a legendary hound.",
        coverImage: "https://example.com/images/hound-of-the-baskervilles.jpg",
        totalCopies: 4,
        availableCopies: 3,
        genre: mystery._id,
      },
      {
        title: "Long Walk to Freedom",
        author: "Nelson Mandela",
        isbn: "9780316548182",
        description:
          "Nelson Mandela recounts his life, political struggle, imprisonment, and journey to leadership.",
        coverImage: "https://example.com/images/long-walk-to-freedom.jpg",
        totalCopies: 6,
        availableCopies: 4,
        genre: biography._id,
      },
      {
        title: "Steve Jobs",
        author: "Walter Isaacson",
        isbn: "9781451648539",
        description:
          "A biography exploring the life, work, and influence of technology entrepreneur Steve Jobs.",
        coverImage: "https://example.com/images/steve-jobs.jpg",
        totalCopies: 4,
        availableCopies: 2,
        genre: biography._id,
      },
      {
        title: "Becoming",
        author: "Michelle Obama",
        isbn: "9781524763138",
        description:
          "A memoir describing Michelle Obama's childhood, career, family life, and public service.",
        coverImage: "https://example.com/images/becoming.jpg",
        totalCopies: 5,
        availableCopies: 3,
        genre: biography._id,
      },
    ];

    // Insert all books into MongoDB
    const insertedBooks = await Book.insertMany(books);

    // Display a short summary
    console.log(
      `Seeded ${genres.length} genres and ${insertedBooks.length} books`,
    );
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

seedDatabase();
