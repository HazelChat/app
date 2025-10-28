import * as VariantSchema from "@effect/experimental/VariantSchema"
import type { AuthorizedActor } from "@hazel/effect-lib"
import type { Brand } from "effect/Brand"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { ParseError } from "effect/ParseResult"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import type { DatabaseError, TransactionClient } from "./database"

const { Class, Field, FieldExcept, FieldOnly, Struct, Union, extract, fieldEvolve, fieldFromKey } =
	VariantSchema.make({
		variants: ["select", "insert", "update", "json", "jsonCreate", "jsonUpdate"],
		defaultVariant: "select",
	})

export type Any = Schema.Schema.Any & {
	readonly fields: Schema.Struct.Fields
	readonly insert: Schema.Schema.Any
	readonly update: Schema.Schema.Any
	readonly json: Schema.Schema.Any
	readonly jsonCreate: Schema.Schema.Any
	readonly jsonUpdate: Schema.Schema.Any
}

export type AnyNoContext = Schema.Schema.AnyNoContext & {
	readonly fields: Schema.Struct.Fields
	readonly insert: Schema.Schema.AnyNoContext
	readonly update: Schema.Schema.AnyNoContext
	readonly json: Schema.Schema.AnyNoContext
	readonly jsonCreate: Schema.Schema.AnyNoContext
	readonly jsonUpdate: Schema.Schema.AnyNoContext
}

export type VariantsDatabase = "select" | "insert" | "update"

export type VariantsJson = "json" | "jsonCreate" | "jsonUpdate"

export {
	/**
	 * A base class for creating domain model schemas with variants for database and JSON APIs.
	 *
	 * @example
	 * ```ts
	 * export class Group extends Model.Class<Group>("Group")({
	 *   id: Model.Generated(GroupId),
	 *   name: Schema.NonEmptyTrimmedString,
	 *   createdAt: Model.DateTimeInsertFromDate,
	 *   updatedAt: Model.DateTimeUpdateFromDate
	 * }) {}
	 *
	 * Group.insert        // for inserts
	 * Group.update        // for updates
	 * Group.json          // for JSON API
	 * Group.jsonCreate    // for JSON creation
	 * Group.jsonUpdate    // for JSON updates
	 * ```
	 */
	Class,
	extract,
	Field,
	fieldEvolve,
	FieldExcept,
	fieldFromKey,
	FieldOnly,
	Struct,
	Union,
}

export const fields: <A extends VariantSchema.Struct<any>>(self: A) => A[VariantSchema.TypeId] =
	VariantSchema.fields

export const Override: <A>(value: A) => A & Brand<"Override"> = VariantSchema.Override

export interface Generated<S extends Schema.Schema.All | Schema.PropertySignature.All>
	extends VariantSchema.Field<{
		readonly select: S
		readonly update: S
		readonly json: S
	}> {}

/** A field for database-generated columns (available for select and update, not insert). */
export const Generated = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
	schema: S,
): Generated<S> =>
	Field({
		select: schema,
		update: schema,
		json: schema,
	})

export interface GeneratedByApp<S extends Schema.Schema.All | Schema.PropertySignature.All>
	extends VariantSchema.Field<{
		readonly select: S
		readonly insert: S
		readonly update: S
		readonly json: S
	}> {}

/** A field for application-generated columns (required for DB variants, optional for JSON). */
export const GeneratedByApp = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
	schema: S,
): GeneratedByApp<S> =>
	Field({
		select: schema,
		insert: schema,
		update: schema,
		json: schema,
	})

export interface Sensitive<S extends Schema.Schema.All | Schema.PropertySignature.All>
	extends VariantSchema.Field<{
		readonly select: S
		readonly insert: S
		readonly update: S
	}> {}

/** A field for sensitive values hidden from JSON variants. */
export const Sensitive = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
	schema: S,
): Sensitive<S> =>
	Field({
		select: schema,
		insert: schema,
		update: schema,
	})

export interface FieldOption<S extends Schema.Schema.Any>
	extends VariantSchema.Field<{
		readonly select: Schema.OptionFromNullOr<S>
		readonly insert: Schema.OptionFromNullOr<S>
		readonly update: Schema.OptionFromNullOr<S>
		readonly json: Schema.optionalWith<S, { as: "Option" }>
		readonly jsonCreate: Schema.optionalWith<S, { as: "Option"; nullable: true }>
		readonly jsonUpdate: Schema.optionalWith<S, { as: "Option"; nullable: true }>
	}> {}

/** Makes a field optional for all variants (nullable for DB, optional for JSON). */
export const FieldOption: <Field extends VariantSchema.Field<any> | Schema.Schema.Any>(
	self: Field,
) => Field extends Schema.Schema.Any
	? FieldOption<Field>
	: Field extends VariantSchema.Field<infer S>
		? VariantSchema.Field<{
				readonly [K in keyof S]: S[K] extends Schema.Schema.Any
					? K extends VariantsDatabase
						? Schema.OptionFromNullOr<S[K]>
						: Schema.optionalWith<S[K], { as: "Option"; nullable: true }>
					: never
			}>
		: never = fieldEvolve({
	select: Schema.OptionFromNullOr,
	insert: Schema.OptionFromNullOr,
	update: Schema.OptionFromNullOr,
	json: Schema.optionalWith({ as: "Option" }),
	jsonCreate: Schema.optionalWith({ as: "Option", nullable: true }),
	jsonUpdate: Schema.optionalWith({ as: "Option", nullable: true }),
}) as any

export interface DateTimeFromDate
	extends Schema.transform<typeof Schema.ValidDateFromSelf, typeof Schema.DateTimeUtcFromSelf> {}

export const DateTimeFromDate: DateTimeFromDate = Schema.transform(
	Schema.ValidDateFromSelf,
	Schema.DateTimeUtcFromSelf,
	{
		decode: DateTime.unsafeFromDate,
		encode: DateTime.toDateUtc,
	},
)

export interface Date
	extends Schema.transformOrFail<typeof Schema.String, typeof Schema.DateTimeUtcFromSelf> {}

/** A DateTime.Utc serialized as ISO date string (YYYY-MM-DD). */
export const Date: Date = Schema.transformOrFail(Schema.String, Schema.DateTimeUtcFromSelf, {
	decode: (s, _, ast) =>
		DateTime.make(s).pipe(
			Option.map(DateTime.removeTime),
			Option.match({
				onNone: () => ParseResult.fail(new ParseResult.Type(ast, s)),
				onSome: (dt) => ParseResult.succeed(dt),
			}),
		),
	encode: (dt) => ParseResult.succeed(DateTime.formatIsoDate(dt)),
})

export const DateWithNow = VariantSchema.Overrideable(Date, Schema.DateTimeUtcFromSelf, {
	generate: Option.match({
		onNone: () => Effect.map(DateTime.now, DateTime.removeTime),
		onSome: (dt) => Effect.succeed(DateTime.removeTime(dt)),
	}),
})

export const DateTimeWithNow = VariantSchema.Overrideable(Schema.String, Schema.DateTimeUtcFromSelf, {
	generate: Option.match({
		onNone: () => Effect.map(DateTime.now, DateTime.formatIso),
		onSome: (dt) => Effect.succeed(DateTime.formatIso(dt)),
	}),
	decode: Schema.DateTimeUtc,
})

export const DateTimeFromDateWithNow = VariantSchema.Overrideable(
	Schema.DateFromSelf,
	Schema.DateTimeUtcFromSelf,
	{
		generate: Option.match({
			onNone: () => Effect.map(DateTime.now, DateTime.toDateUtc),
			onSome: (dt) => Effect.succeed(DateTime.toDateUtc(dt)),
		}),
		decode: DateTimeFromDate,
	},
)

export const DateTimeFromNumberWithNow = VariantSchema.Overrideable(
	Schema.Number,
	Schema.DateTimeUtcFromSelf,
	{
		generate: Option.match({
			onNone: () => Effect.map(DateTime.now, DateTime.toEpochMillis),
			onSome: (dt) => Effect.succeed(DateTime.toEpochMillis(dt)),
		}),
		decode: Schema.DateTimeUtcFromNumber,
	},
)

export interface DateTimeInsert
	extends VariantSchema.Field<{
		readonly select: typeof Schema.DateTimeUtc
		readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>
		readonly json: typeof Schema.DateTimeUtc
	}> {}

/** A DateTime.Utc field set on insert only, serialized as string (createdAt). */
export const DateTimeInsert: DateTimeInsert = Field({
	select: Schema.DateTimeUtc,
	insert: DateTimeWithNow,
	json: Schema.DateTimeUtc,
})

export interface DateTimeInsertFromDate
	extends VariantSchema.Field<{
		readonly select: DateTimeFromDate
		readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
		readonly json: typeof Schema.DateTimeUtc
	}> {}

/** A DateTime.Utc field set on insert only, serialized as Date object. */
export const DateTimeInsertFromDate: DateTimeInsertFromDate = Field({
	select: DateTimeFromDate,
	insert: DateTimeFromDateWithNow,
	json: Schema.DateTimeUtc,
})

export interface DateTimeInsertFromNumber
	extends VariantSchema.Field<{
		readonly select: typeof Schema.DateTimeUtcFromNumber
		readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>
		readonly json: typeof Schema.DateTimeUtcFromNumber
	}> {}

/** A DateTime.Utc field set on insert only, serialized as epoch milliseconds. */
export const DateTimeInsertFromNumber: DateTimeInsertFromNumber = Field({
	select: Schema.DateTimeUtcFromNumber,
	insert: DateTimeFromNumberWithNow,
	json: Schema.DateTimeUtcFromNumber,
})

export interface DateTimeUpdate
	extends VariantSchema.Field<{
		readonly select: typeof Schema.DateTimeUtc
		readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>
		readonly update: VariantSchema.Overrideable<DateTime.Utc, string>
		readonly json: typeof Schema.DateTimeUtc
	}> {}

/** A DateTime.Utc field set on insert/update, serialized as string (updatedAt). */
export const DateTimeUpdate: DateTimeUpdate = Field({
	select: Schema.DateTimeUtc,
	insert: DateTimeWithNow,
	update: DateTimeWithNow,
	json: Schema.DateTimeUtc,
})

export interface DateTimeUpdateFromDate
	extends VariantSchema.Field<{
		readonly select: DateTimeFromDate
		readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
		readonly update: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>
		readonly json: typeof Schema.DateTimeUtc
	}> {}

/** A DateTime.Utc field set on insert/update, serialized as Date object. */
export const DateTimeUpdateFromDate: DateTimeUpdateFromDate = Field({
	select: DateTimeFromDate,
	insert: DateTimeFromDateWithNow,
	update: DateTimeFromDateWithNow,
	json: Schema.DateTimeUtc,
})

export interface DateTimeUpdateFromNumber
	extends VariantSchema.Field<{
		readonly select: typeof Schema.DateTimeUtcFromNumber
		readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>
		readonly update: VariantSchema.Overrideable<DateTime.Utc, number>
		readonly json: typeof Schema.DateTimeUtcFromNumber
	}> {}

/** A DateTime.Utc field set on insert/update, serialized as epoch milliseconds. */
export const DateTimeUpdateFromNumber: DateTimeUpdateFromNumber = Field({
	select: Schema.DateTimeUtcFromNumber,
	insert: DateTimeFromNumberWithNow,
	update: DateTimeFromNumberWithNow,
	json: Schema.DateTimeUtcFromNumber,
})

export interface JsonFromString<S extends Schema.Schema.All | Schema.PropertySignature.All>
	extends VariantSchema.Field<{
		readonly select: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
		readonly insert: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
		readonly update: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>
		readonly json: S
		readonly jsonCreate: S
		readonly jsonUpdate: S
	}> {}

/** A JSON value stored as text in the database, object in JSON variants. */
export const JsonFromString = <S extends Schema.Schema.All | Schema.PropertySignature.All>(
	schema: S,
): JsonFromString<S> => {
	const parsed = Schema.parseJson(schema as any)
	return Field({
		select: parsed,
		insert: parsed,
		update: parsed,
		json: schema,
		jsonCreate: schema,
		jsonUpdate: schema,
	}) as any
}

export interface UuidV4Insert<B extends string | symbol>
	extends VariantSchema.Field<{
		readonly select: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
		readonly insert: VariantSchema.Overrideable<Uint8Array & Brand<B>, Uint8Array>
		readonly update: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
		readonly json: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>
	}> {}

export const UuidV4WithGenerate = <B extends string | symbol>(
	schema: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>,
): VariantSchema.Overrideable<Uint8Array & Brand<B>, Uint8Array> =>
	VariantSchema.Overrideable(Schema.Uint8ArrayFromSelf, schema, {
		generate: Option.match({
			onNone: () => Effect.sync(() => crypto.randomUUID()),
			onSome: (id) => Effect.succeed(id as any),
		}),
		decode: Schema.Uint8ArrayFromSelf,
		constructorDefault: () => crypto.randomUUID() as any,
	})

/** A UUID v4 field auto-generated on insert. */
export const UuidV4Insert = <const B extends string | symbol>(
	schema: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>,
): UuidV4Insert<B> =>
	Field({
		select: schema,
		insert: UuidV4WithGenerate(schema),
		update: schema,
		json: schema,
	})

/** A boolean parsed from 0 or 1. */
export class BooleanFromNumber extends Schema.transform(Schema.Literal(0, 1), Schema.Boolean, {
	decode: (n) => n === 1,
	encode: (b) => (b ? 1 : 0),
}) {}

export interface EntitySchema extends Schema.Schema.AnyNoContext {
	readonly fields: Schema.Struct.Fields
	readonly insert: Schema.Schema.AnyNoContext
	readonly update: Schema.Schema.AnyNoContext
	readonly json: Schema.Schema.AnyNoContext
	readonly jsonCreate: Schema.Schema.AnyNoContext
	readonly jsonUpdate: Schema.Schema.AnyNoContext
}

export interface RepositoryOptions<Col extends string, Name extends string> {
	idColumn: Col
	name: Name
}

export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>

export class EntityNotFound extends Schema.TaggedError<EntityNotFound>()("EntityNotFound", {
	type: Schema.String,
	id: Schema.Any,
}) {}

export interface Repository<RecordType, S extends EntitySchema, Col extends string, Name extends string, Id> {
	readonly insert: (
		insert: S["insert"]["Type"],
		tx?: <U>(fn: (client: TransactionClient) => Promise<U>) => Effect.Effect<U, DatabaseError>,
	) => Effect.Effect<RecordType[], DatabaseError | ParseError, AuthorizedActor<Name, "create">>

	readonly insertVoid: (
		insert: S["insert"]["Type"],
		tx?: <U>(fn: (client: TransactionClient) => Promise<U>) => Effect.Effect<U, DatabaseError>,
	) => Effect.Effect<void, DatabaseError | ParseError, AuthorizedActor<Name, "create">>

	readonly update: (
		update: PartialExcept<S["update"]["Type"], Col>,
		tx?: <U>(fn: (client: TransactionClient) => Promise<U>) => Effect.Effect<U, DatabaseError>,
	) => Effect.Effect<RecordType, DatabaseError | ParseError, AuthorizedActor<Name, "update">>

	readonly updateVoid: (
		update: PartialExcept<S["update"]["Type"], Col>,
		tx?: <U>(fn: (client: TransactionClient) => Promise<U>) => Effect.Effect<U, DatabaseError>,
	) => Effect.Effect<void, DatabaseError | ParseError, AuthorizedActor<Name, "update">>

	// readonly updateManyVoid: (
	//   update: PartialExcept<S["update"]["Type"], Col>[]
	// ) => Effect.Effect<void, DatabaseError | ParseError>

	readonly findById: (
		id: Id,
		tx?: <U>(fn: (client: TransactionClient) => Promise<U>) => Effect.Effect<U, DatabaseError>,
	) => Effect.Effect<Option.Option<RecordType>, DatabaseError, AuthorizedActor<Name, "select">>

	readonly with: <A, E, R>(
		id: Id,
		f: (item: RecordType) => Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E | EntityNotFound, R>

	readonly deleteById: (
		id: Id,
		tx?: <U>(fn: (client: TransactionClient) => Promise<U>) => Effect.Effect<U, DatabaseError>,
	) => Effect.Effect<void, DatabaseError, AuthorizedActor<Name, "delete">>
}
