// If your generator outputs to the default location (most common):
//   generator client { provider = "prisma-client-js" }
//   -> import from '@prisma/client'
import { PrismaClient } from "../../generated/prisma";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
