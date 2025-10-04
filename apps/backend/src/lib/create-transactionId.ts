import { Database } from "@hazel/db"
import { Effect, Option, Schema } from "effect"
import { TransactionIdFromString } from "./schema"

export const generateTransactionId = Effect.fn("generateTransactionId")(function* (
	tx?: <T>(
		fn: (client: Database.TransactionClient) => Promise<T>,
	) => Effect.Effect<T, Database.DatabaseError, never>,
) {
	// 1. Check explicit tx parameter (highest priority)
	let txExecutor: Database.TxFn | undefined = tx

	// 2. Check TransactionContext from Effect Context (auto-propagated)
	if (!txExecutor) {
		const maybeCtx = yield* Effect.serviceOption(Database.TransactionContext)
		if (Option.isSome(maybeCtx)) {
			txExecutor = maybeCtx.value.execute
		}
	}

	// 3. Fail if no transaction context found
	if (!txExecutor) {
		return yield* Effect.die("generateTransactionId must be called within a transaction")
	}

	const result = yield* txExecutor((client) =>
		client.execute(`SELECT pg_current_xact_id()::xid::text as txid`),
	).pipe(
		Effect.map((rows) => rows[0]?.txid as string),
		Effect.flatMap((txid) => Schema.decode(TransactionIdFromString)(txid)),
		Effect.orDie,
	)

	return result
})
