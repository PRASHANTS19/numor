// // src/config/database.js
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();
// module.exports = prisma;
require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

let prisma;

if (process.env.NODE_ENV === "production") {
  // In production, create a single Prisma instance
  prisma = new PrismaClient({ adapter });
} else {
  // In development, use globalThis to prevent multiple instances
  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient({ adapter });
  }
  prisma = globalThis.prisma;
}


module.exports = prisma;
