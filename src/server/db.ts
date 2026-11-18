import { createDb, type Db } from "../lib/db";

/** One Prisma client per server process (survives dev hot reloads). */
const g = globalThis as unknown as { __linefinderDb?: Db };
export const db: Db = g.__linefinderDb ?? createDb();
if (process.env.NODE_ENV !== "production") g.__linefinderDb = db;
