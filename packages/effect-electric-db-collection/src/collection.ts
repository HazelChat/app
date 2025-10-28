import type { Row } from "@electric-sql/client"
import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { CollectionConfig } from "@tanstack/db"
import type { ElectricCollectionUtils, Txid } from "@tanstack/electric-db-collection"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import { Effect, type ManagedRuntime } from "effect"
import { InvalidTxIdError, TxIdTimeoutError } from "./errors"
import { convertDeleteHandler, convertInsertHandler, convertUpdateHandler } from "./handlers"
import type { EffectElectricCollectionConfig } from "./types"

type InferSchemaOutput<T> = T extends StandardSchemaV1
	? StandardSchemaV1.InferOutput<T> extends Row<unknown>
		? StandardSchemaV1.InferOutput<T>
		: Record<string, unknown>
	: Record<string, unknown>

/**
 * Effect-based utilities for Electric collections
 */
export interface EffectElectricCollectionUtils extends ElectricCollectionUtils {
	/**
	 * Wait for a specific transaction ID to be synced (Effect version)
	 */
	readonly awaitTxIdEffect: (
		txid: Txid,
		timeout?: number,
	) => Effect.Effect<boolean, TxIdTimeoutError | InvalidTxIdError>
}

/**
 * Creates Electric collection options with Effect-based handlers
 */

// With schema + with runtime (R inferred from runtime)
export function effectElectricCollectionOptions<T extends StandardSchemaV1, R>(
	config: EffectElectricCollectionConfig<
		InferSchemaOutput<T>,
		string | number,
		T,
		Record<string, never>,
		R
	> & {
		schema: T
		runtime: ManagedRuntime.ManagedRuntime<R, any>
	},
): CollectionConfig<InferSchemaOutput<T>, string | number, T> & {
	id?: string
	utils: EffectElectricCollectionUtils
	schema: T
}

// With schema + without runtime (R must be never)
export function effectElectricCollectionOptions<T extends StandardSchemaV1>(
	config: EffectElectricCollectionConfig<
		InferSchemaOutput<T>,
		string | number,
		T,
		Record<string, never>,
		never
	> & {
		schema: T
		runtime?: never
	},
): CollectionConfig<InferSchemaOutput<T>, string | number, T> & {
	id?: string
	utils: EffectElectricCollectionUtils
	schema: T
}

// Without schema + with runtime (R inferred from runtime)
export function effectElectricCollectionOptions<T extends Row<unknown>, R>(
	config: EffectElectricCollectionConfig<T, string | number, never, Record<string, never>, R> & {
		schema?: never
		runtime: ManagedRuntime.ManagedRuntime<R, any>
	},
): CollectionConfig<T, string | number> & {
	id?: string
	utils: EffectElectricCollectionUtils
	schema?: never
}

// Without schema + without runtime (R must be never)
export function effectElectricCollectionOptions<T extends Row<unknown>>(
	config: EffectElectricCollectionConfig<T, string | number, never, Record<string, never>, never> & {
		schema?: never
		runtime?: never
	},
): CollectionConfig<T, string | number> & {
	id?: string
	utils: EffectElectricCollectionUtils
	schema?: never
}

export function effectElectricCollectionOptions(
	config: EffectElectricCollectionConfig<any, any, any, any, any>,
): CollectionConfig<any, string | number, any> & {
	id?: string
	utils: EffectElectricCollectionUtils
	schema?: any
} {
	const promiseOnInsert = convertInsertHandler(config.onInsert, config.runtime)
	const promiseOnUpdate = convertUpdateHandler(config.onUpdate, config.runtime)
	const promiseOnDelete = convertDeleteHandler(config.onDelete, config.runtime)

	const standardConfig = electricCollectionOptions({
		...config,
		onInsert: promiseOnInsert,
		onUpdate: promiseOnUpdate,
		onDelete: promiseOnDelete,
	} as any)
	const awaitTxIdEffect = (
		txid: Txid,
		timeout: number = 30000,
	): Effect.Effect<boolean, TxIdTimeoutError | InvalidTxIdError> => {
		if (typeof txid !== "number") {
			return Effect.fail(
				new InvalidTxIdError({
					message: `Expected txid to be a number, got ${typeof txid}`,
					receivedType: typeof txid,
				}),
			)
		}

		return Effect.tryPromise({
			try: () => standardConfig.utils.awaitTxId(txid, timeout),
			catch: (error) => {
				if (error instanceof Error && error.message.includes("timeout")) {
					return new TxIdTimeoutError({
						message: `Timeout waiting for txid ${txid}`,
						txid,
						timeout,
					})
				}
				return new InvalidTxIdError({
					message: `Invalid txid: ${error}`,
					receivedType: typeof txid,
				})
			},
		})
	}

	return {
		...standardConfig,
		utils: {
			...standardConfig.utils,
			awaitTxIdEffect,
		},
	}
}
