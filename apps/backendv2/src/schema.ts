import { integer, pgTable, uuid, varchar } from "drizzle-orm/pg-core"

export const usersTable = pgTable("users", {})
