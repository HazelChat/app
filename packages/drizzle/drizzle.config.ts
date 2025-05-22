import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./drizzle",
	schema: "./src/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: "postgresql://postgres:85xBA69v46rgx9iy@db.cxknqtqxflqzictgdqzs.supabase.co:5432/postgres",
		//url: "postgresql://user:password@127.0.0.1:5430/postgres",

		// url: "postgresql://postgres:gdvUHFLbRGiyVjagLzTfgDDnzMpFACMM@shuttle.proxy.rlwy.net:54129/railway",
	},
})
