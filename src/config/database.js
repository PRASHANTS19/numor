// // src/config/database.js
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();
// module.exports = prisma;
const { PrismaClient } = require("@prisma/client");

let prisma;

if (process.env.NODE_ENV === "production") {
  // In production, create a single Prisma instance
  prisma = new PrismaClient();
} else {
  // In development, use globalThis to prevent multiple instances
  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient();
  }
  prisma = globalThis.prisma;
}


module.exports = prisma;
