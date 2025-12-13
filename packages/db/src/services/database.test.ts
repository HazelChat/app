import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Effect, Redacted } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Database, layer, TransactionContext } from "./database"

let container: StartedPostgreSqlContainer

beforeAll(async () => {
	container = await new PostgreSqlContainer("postgres:alpine").start()

	// Create test table using postgres.js (same driver as the Database service)
	const postgres = (await import("postgres")).default
	const sql = postgres(container.getConnectionUri())
	await sql`CREATE TABLE IF NOT EXISTS _test_rollback (id TEXT PRIMARY KEY)`
	await sql.end()
}, 60000) // 60s timeout for container startup

afterAll(async () => {
	await container?.stop()
})

describe("Database.transaction", () => {
	const getTestLayer = () =>
		layer({
			url: Redacted.make(container.getConnectionUri()),
			ssl: false,
		})

	describe("rollback behavior", () => {
		it("should rollback transaction when Effect fails after successful insert", async () => {
			const testId = `test-rollback-${Date.now()}`

			const program = Effect.gen(function* () {
				const db = yield* Database

				// This transaction should rollback entirely
				const result = yield* db
					.transaction(
						Effect.gen(function* () {
							// Get the transaction context to execute within the transaction
							const txCtx = yield* TransactionContext

							// Step 1: Insert a record using the transaction client
							yield* txCtx.execute((tx) =>
								tx.execute(`INSERT INTO _test_rollback (id) VALUES ('${testId}')`),
							)

							// Step 2: Fail the Effect
							return yield* Effect.fail(new Error("Intentional failure"))
						}),
					)
					.pipe(Effect.either)

				// Verify the transaction failed
				expect(result._tag).toBe("Left")

				// Verify the insert was rolled back (query outside transaction)
				const rows = yield* db.execute(
					(client) => client.$client`SELECT * FROM _test_rollback WHERE id = ${testId}`,
				)

				// Should be empty because transaction rolled back
				expect(rows.length).toBe(0)
			})

			await Effect.runPromise(
				program.pipe(Effect.provide(getTestLayer()), Effect.scoped) as Effect.Effect<void>,
			)
		})

		it("should commit transaction when Effect succeeds", async () => {
			const testId = `test-commit-${Date.now()}`

			const program = Effect.gen(function* () {
				const db = yield* Database

				// This transaction should commit
				yield* db.transaction(
					Effect.gen(function* () {
						// Get the transaction context to execute within the transaction
						const txCtx = yield* TransactionContext

						yield* txCtx.execute((tx) =>
							tx.execute(`INSERT INTO _test_rollback (id) VALUES ('${testId}')`),
						)
						return "success"
					}),
				)

				// Verify the insert persisted (query outside transaction)
				const rows = yield* db.execute(
					(client) => client.$client`SELECT * FROM _test_rollback WHERE id = ${testId}`,
				)

				expect(rows.length).toBe(1)

				// Cleanup
				yield* db.execute((client) => client.$client`DELETE FROM _test_rollback WHERE id = ${testId}`)
			})

			await Effect.runPromise(
				program.pipe(Effect.provide(getTestLayer()), Effect.scoped) as Effect.Effect<void>,
			)
		})

		it("should propagate the correct error through Effect when transaction fails", async () => {
			const testId = `test-error-${Date.now()}`

			const program = Effect.gen(function* () {
				const db = yield* Database

				class CustomTestError {
					readonly _tag = "CustomTestError"
					constructor(readonly message: string) {}
				}

				const result = yield* db
					.transaction(
						Effect.gen(function* () {
							// Get the transaction context to execute within the transaction
							const txCtx = yield* TransactionContext

							yield* txCtx.execute((tx) =>
								tx.execute(`INSERT INTO _test_rollback (id) VALUES ('${testId}')`),
							)
							return yield* Effect.fail(new CustomTestError("Custom error message"))
						}),
					)
					.pipe(Effect.either)

				// Verify the transaction failed with the correct error type
				expect(result._tag).toBe("Left")
				if (result._tag === "Left") {
					const cause = result.left
					// The error should be our custom error
					expect(cause).toBeDefined()
				}

				// Verify rollback occurred (query outside transaction)
				const rows = yield* db.execute(
					(client) => client.$client`SELECT * FROM _test_rollback WHERE id = ${testId}`,
				)
				expect(rows.length).toBe(0)
			})

			await Effect.runPromise(
				program.pipe(Effect.provide(getTestLayer()), Effect.scoped) as Effect.Effect<void>,
			)
		})
	})
})
