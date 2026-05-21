import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (typeof window === "undefined") {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4, // limit pool size for serverless connection limits
      ssl: {
        rejectUnauthorized: false
      }
    });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prismaInstance = globalForPrisma.prisma;
} else {
  prismaInstance = null as any;
}

export const prisma = prismaInstance;
