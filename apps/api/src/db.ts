import { PrismaClient } from '@prisma/client';

// This creates a single connection to the database that the whole app shares
export const prisma = new PrismaClient();