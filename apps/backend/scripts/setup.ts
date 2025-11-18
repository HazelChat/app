#!/usr/bin/env bun

import { Database } from "@hazel/db"
import { withSystemActor } from "@hazel/domain"
import { Effect, Logger, LogLevel } from "effect"
import { DatabaseLive } from "../src/services/database"
import { WorkOS } from "../src/services/workos"
import { WorkOSSync } from "../src/services/workos-sync"

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	bold: "\x1b[1m",
}

const log = (color: keyof typeof colors, message: string) => {
	console.log(`${colors[color]}${message}${colors.reset}`)
}

// Test database connection
const testDatabase = Effect.gen(function* () {
	log("blue", `\n${"=".repeat(50)}`)
	log("blue", "DATABASE CONNECTION")
	log("blue", `${"=".repeat(50)}`)

	const db = yield* Database.Database

	yield* db.execute((client) => client.$client`SELECT 1`).pipe(Effect.orDie)

	log("green", "  ✓ Database connection successful")
})

// Sync WorkOS data
const syncWorkOS = Effect.gen(function* () {
	log("magenta", `\n${"=".repeat(50)}`)
	log("magenta", "WORKOS DATA SYNC")
	log("magenta", `${"=".repeat(50)}`)

	const workOsSync = yield* WorkOSSync

	log("blue", "\n  → Syncing WorkOS data to database...")

	const result = yield* workOsSync.syncAll.pipe(withSystemActor)

	// Display results
	log("cyan", "\n  Sync Results:")
	log(
		"white",
		`    Users: ${result.users.created} created, ${result.users.updated} updated, ${result.users.deleted} deleted`,
	)
	log(
		"white",
		`    Organizations: ${result.organizations.created} created, ${result.organizations.updated} updated, ${result.organizations.deleted} deleted`,
	)
	log(
		"white",
		`    Memberships: ${result.memberships.created} created, ${result.memberships.updated} updated, ${result.memberships.deleted} deleted`,
	)
	log(
		"white",
		`    Invitations: ${result.invitations.created} created, ${result.invitations.updated} updated, ${result.invitations.deleted} deleted`,
	)

	// Display errors if any
	if (result.totalErrors > 0) {
		log("yellow", `\n  ⚠️  ${result.totalErrors} error(s) occurred during sync`)
	} else {
		log("green", "\n  ✓ WorkOS sync completed successfully")
	}

	return result
})

// Main setup script
const setupScript = Effect.gen(function* () {
	const startTime = Date.now()

	log("bold", `\n${"=".repeat(50)}`)
	log("bold", "SETUP - DATABASE & WORKOS")
	log("bold", `${"=".repeat(50)}`)

	yield* testDatabase
	const syncResult = yield* syncWorkOS

	const duration = ((Date.now() - startTime) / 1000).toFixed(2)

	log("bold", `\n${"=".repeat(50)}`)
	log("bold", "SETUP COMPLETE")
	log("bold", `${"=".repeat(50)}`)

	log("green", `\n✓ Setup completed in ${duration}s`)

	if (syncResult.totalErrors > 0) {
		log("yellow", `\n  Note: ${syncResult.totalErrors} error(s) occurred during sync`)
	}
})

// Run the script
const runnable = setupScript.pipe(
	Effect.provide(DatabaseLive),
	Effect.provide(WorkOSSync.Default),
	Effect.provide(WorkOS.Default),
	Effect.provide(Logger.minimumLogLevel(LogLevel.Info)),
)

Effect.runPromise(runnable).catch((error) => {
	log("red", `\n✗ Setup failed: ${error}`)
	process.exit(1)
})
