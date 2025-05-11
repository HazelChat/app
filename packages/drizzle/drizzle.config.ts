import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./drizzle",
	schema: "./src/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: "postgresql://user:password@127.0.0.1:5430/postgres",
		// PRODDB
		// url: "postgresql://postgres:mkwqhcfdnqdelwn1@142.132.228.194:6992/zero",
	},
})
