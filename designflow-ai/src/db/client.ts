import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton pattern: hot-reload would otherwise
// create a new PrismaClient (and a new connection pool) on every save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
