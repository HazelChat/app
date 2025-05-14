import { defineConfig } from "drizzle-kit"

export default defineConfig({
	out: "./drizzle",
	schema: "./src/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: "postgresql://user:password@127.0.0.1:5430/postgres",
		// url: "postgresql://postgres:CMaOXuhzjmDJiuMFxaxwMZykGFSJFDcJ@centerbeam.proxy.rlwy.net:31496/railway",
	},
})
