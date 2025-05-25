import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Cassandra from "cassandra-driver"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { cons } from "effect/List"
import * as Redacted from "effect/Redacted"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"

export const TypeId: unique symbol = Symbol.for("@effect/sql-cassandra/CassandraClient")

export type TypeId = typeof TypeId

export interface CassandraClient extends Client.SqlClient {
	readonly [TypeId]: TypeId
	readonly config: CassandraClientConfig
}

export const CassandraClient = Context.GenericTag<CassandraClient>("@effect/sql-cassandra/CassandraClient")

export interface CassandraClientConfig {
	readonly contactPoints?: ReadonlyArray<string> | undefined
	readonly localDataCenter?: string | undefined
	readonly keyspace?: string | undefined
	readonly credentials?:
		| {
				readonly username: string
				readonly password: Redacted.Redacted
		  }
		| undefined

	readonly maxConnections?: number | undefined
	readonly connectionTimeout?: Duration.DurationInput | undefined
	readonly requestTimeout?: Duration.DurationInput | undefined

	readonly clientOptions?: Cassandra.ClientOptions | undefined

	readonly spanAttributes?: Record<string, unknown> | undefined

	readonly transformResultNames?: ((str: string) => string) | undefined
	readonly transformQueryNames?: ((str: string) => string) | undefined
}

export const make = (
	options: CassandraClientConfig,
): Effect.Effect<CassandraClient, SqlError, Scope | Reactivity.Reactivity> =>
	Effect.gen(function* () {
		const compiler = makeCompiler(options.transformQueryNames)
		const transformRows = options.transformResultNames
			? Statement.defaultTransforms(options.transformResultNames).array
			: undefined

		class ConnectionImpl implements Connection {
			constructor(private readonly client: Cassandra.Client) {}

			private runRaw(cql: string, params?: ReadonlyArray<any>) {
				return Effect.async<Cassandra.types.ResultSet, SqlError>((resume) => {
					this.client.execute(cql, params || [], (err, result) => {
						if (err) {
							console.error("Cassandra execution error:", err)
							resume(
								Effect.fail(
									new SqlError({
										cause: err,
										message: "Failed to execute statement",
									}),
								),
							)
						} else {
							resume(Effect.succeed(result!))
						}
					})
				})
			}

			private run(cql: string, params?: ReadonlyArray<any>) {
				return this.runRaw(cql, params).pipe(Effect.map((result) => result.rows || []))
			}

			execute(
				cql: string,
				params: ReadonlyArray<Statement.Primitive>,
				transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
			) {
				return transformRows ? Effect.map(this.run(cql, params), transformRows) : this.run(cql, params)
			}

			executeRaw(cql: string, params: ReadonlyArray<Statement.Primitive>) {
				return this.runRaw(cql, params)
			}

			executeValues(cql: string, params: ReadonlyArray<Statement.Primitive>) {
				return this.run(cql, params).pipe(Effect.map((rows) => rows.map(Object.values)))
			}

			executeUnprepared(
				cql: string,
				params: ReadonlyArray<Statement.Primitive>,
				transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
			) {
				return transformRows ? Effect.map(this.run(cql, params), transformRows) : this.run(cql, params)
			}

			executeStream(
				cql: string,
				params: ReadonlyArray<Statement.Primitive>,
				transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined,
			) {
				const self = this
				return Effect.gen(function* () {
					const rows = yield* self.run(cql, params)
					const transformed = transformRows ? transformRows(rows as any) : rows
					return Stream.fromIterable(transformed)
				})
			}
		}

		const clientOptions: Cassandra.ClientOptions = {
			...options.clientOptions,
			contactPoints: (options.contactPoints as string[]) || ["127.0.0.1"],
			localDataCenter: options.localDataCenter || "datacenter1",
			keyspace: options.keyspace,
			credentials: options.credentials
				? {
						username: options.credentials.username,
						password: Redacted.value(options.credentials.password),
					}
				: undefined,
			pooling: {
				maxRequestsPerConnection: options.maxConnections || 2048,
				...(options.clientOptions?.pooling || {}),
			},
			socketOptions: {
				connectTimeout: options.connectionTimeout ? Duration.toMillis(options.connectionTimeout) : 5000,
				readTimeout: options.requestTimeout ? Duration.toMillis(options.requestTimeout) : 12000,
				...(options.clientOptions?.socketOptions || {}),
			},
		}

		const client = new Cassandra.Client(clientOptions)

		yield* Effect.acquireRelease(
			Effect.async<void, SqlError>((resume) => {
				client.connect((err) => {
					if (err) {
						resume(
							Effect.fail(
								new SqlError({
									cause: err,
									message: "CassandraClient: Failed to connect",
								}),
							),
						)
					} else {
						resume(Effect.void)
					}
				})
			}),
			() =>
				Effect.async<void>((resume) => {
					client.shutdown(() => resume(Effect.void))
				}),
		).pipe(
			Effect.timeoutFail({
				duration: Duration.seconds(10),
				onTimeout: () =>
					new SqlError({
						message: "CassandraClient: Connection timeout",
						cause: new Error("connection timeout"),
					}),
			}),
		)

		const connection = new ConnectionImpl(client)

		const spanAttributes: Array<[string, unknown]> = [
			...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
			[Otel.SEMATTRS_DB_SYSTEM, "cassandra"],
			["server.address", options.contactPoints?.[0] || "127.0.0.1"],
			["server.port", 9042],
		]

		if (options.keyspace) {
			spanAttributes.push([Otel.SEMATTRS_DB_NAME, options.keyspace])
		}

		return Object.assign(
			yield* Client.make({
				acquirer: Effect.succeed(connection),
				transactionAcquirer: Effect.succeed(connection),
				compiler,
				spanAttributes,
				transformRows,
			}),
			{ [TypeId]: TypeId as TypeId, config: options },
		)
	})

export const layerConfig = (
	config: Config.Config.Wrap<CassandraClientConfig>,
): Layer.Layer<CassandraClient | Client.SqlClient, ConfigError | SqlError> =>
	Layer.scopedContext(
		Config.unwrap(config).pipe(
			Effect.flatMap(make),
			Effect.map((client) => Context.make(CassandraClient, client).pipe(Context.add(Client.SqlClient, client))),
		),
	).pipe(Layer.provide(Reactivity.layer))

export const layer = (
	config: CassandraClientConfig,
): Layer.Layer<CassandraClient | Client.SqlClient, ConfigError | SqlError> =>
	Layer.scopedContext(
		Effect.map(make(config), (client) =>
			Context.make(CassandraClient, client).pipe(Context.add(Client.SqlClient, client)),
		),
	).pipe(Layer.provide(Reactivity.layer))

const escapeSql = Statement.defaultEscape('"')

export const makeCompiler = (transform?: (_: string) => string) =>
	Statement.makeCompiler({
		dialect: "cassandra" as any,
		placeholder(index) {
			return "?"
		},
		onIdentifier: transform
			? (value, withoutTransform) => (withoutTransform ? escapeSql(value) : escapeSql(transform(value)))
			: escapeSql,
		onCustom() {
			return ["", []]
		},
		onRecordUpdate() {
			return ["", []]
		},
	})
