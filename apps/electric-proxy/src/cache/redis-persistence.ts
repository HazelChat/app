import { Persistence } from "@effect/experimental"
import { Redis } from "@hazel/effect-bun"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { ProxyConfigLive, ProxyConfigService } from "../config"

/**
 * Create a BackingPersistence using @hazel/effect-bun Redis service
 */
const makeRedisBacking = Effect.gen(function* () {
	const redis = yield* Redis

	return Persistence.BackingPersistence.of({
		[Persistence.BackingPersistenceTypeId]: Persistence.BackingPersistenceTypeId,
		make: (prefix) =>
			Effect.sync(() => {
				const prefixed = (key: string) => `${prefix}:${key}`

				const parse = (method: string) => (str: string | null) => {
					if (str === null) return Effect.succeedNone
					return Effect.try({
						try: () => Option.some(JSON.parse(str)),
						catch: (error) => Persistence.PersistenceBackingError.make(method, error),
					})
				}

				return identity<Persistence.BackingPersistenceStore>({
					get: (key) =>
						Effect.flatMap(
							redis.get(prefixed(key)).pipe(
								Effect.mapError((error) => Persistence.PersistenceBackingError.make("get", error)),
							),
							parse("get"),
						),

					getMany: (keys) =>
						Effect.flatMap(
							redis.send<(string | null)[]>("MGET", keys.map(prefixed)).pipe(
								Effect.mapError((error) => Persistence.PersistenceBackingError.make("getMany", error)),
							),
							Effect.forEach(parse("getMany")),
						),

					set: (key, value, ttl) =>
						Effect.gen(function* () {
							const serialized = yield* Effect.try({
								try: () => JSON.stringify(value),
								catch: (error) => Persistence.PersistenceBackingError.make("set", error),
							})

							const pkey = prefixed(key)
							yield* redis.set(pkey, serialized).pipe(
								Effect.mapError((error) => Persistence.PersistenceBackingError.make("set", error)),
							)

							if (Option.isSome(ttl)) {
								// Use PEXPIRE for millisecond precision
								yield* redis.send("PEXPIRE", [pkey, String(Duration.toMillis(ttl.value))]).pipe(
									Effect.mapError((error) => Persistence.PersistenceBackingError.make("set", error)),
								)
							}
						}),

					setMany: (entries) =>
						Effect.gen(function* () {
							for (const [key, value, ttl] of entries) {
								const pkey = prefixed(key)
								const serialized = JSON.stringify(value)
								yield* redis.set(pkey, serialized).pipe(
									Effect.mapError((error) => Persistence.PersistenceBackingError.make("setMany", error)),
								)
								if (Option.isSome(ttl)) {
									yield* redis.send("PEXPIRE", [pkey, String(Duration.toMillis(ttl.value))]).pipe(
										Effect.mapError((error) => Persistence.PersistenceBackingError.make("setMany", error)),
									)
								}
							}
						}),

					remove: (key) =>
						redis.del(prefixed(key)).pipe(
							Effect.mapError((error) => Persistence.PersistenceBackingError.make("remove", error)),
						),

					clear: Effect.gen(function* () {
						const keys = yield* redis.send<string[]>("KEYS", [`${prefix}:*`]).pipe(
							Effect.mapError((error) => Persistence.PersistenceBackingError.make("clear", error)),
						)
						if (keys.length > 0) {
							yield* redis.send("DEL", keys).pipe(
								Effect.mapError((error) => Persistence.PersistenceBackingError.make("clear", error)),
							)
						}
					}),
				})
			}),
	})
})

/**
 * Layer providing BackingPersistence using @hazel/effect-bun Redis service
 */
const RedisBackingLive = Layer.unwrapEffect(
	Effect.gen(function* () {
		const config = yield* ProxyConfigService
		yield* Effect.log("Connecting to Redis via @hazel/effect-bun", { url: config.redisUrl })
		return Layer.effect(Persistence.BackingPersistence, makeRedisBacking).pipe(
			Layer.provide(Redis.layer(Redacted.value(config.redisUrl))),
		)
	}),
).pipe(Layer.provide(ProxyConfigLive))

/**
 * Redis persistence layer using @hazel/effect-bun Redis service.
 * Provides: Persistence.ResultPersistence
 */
export const RedisPersistenceLive = Persistence.layerResult.pipe(Layer.provide(RedisBackingLive))

/**
 * In-memory persistence layer for testing or fallback.
 */
export const MemoryPersistenceLive = Persistence.layerResultMemory
