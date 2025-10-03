import { HttpApiSchema } from "@effect/platform"
import { Effect, Predicate, Schema } from "effect"
import { CurrentUser } from "."

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>("UnauthorizedError")(
	"UnauthorizedError",
	{
		message: Schema.String,
		detail: Schema.String,
	},
	HttpApiSchema.annotations({
		status: 401,
	}),
) {
	static is(u: unknown): u is UnauthorizedError {
		return Predicate.isTagged(u, "@superwall/schema/models/errors/Unauthorized")
	}

	static refail(entity: string, action: string) {
		return <A, E, R>(
			effect: Effect.Effect<A, E, R>,
		): Effect.Effect<A, UnauthorizedError, CurrentUser.Context | R> =>
			Effect.catchIf(
				effect,
				(e) => !UnauthorizedError.is(e),
				() =>
					Effect.flatMap(
						CurrentUser.Context,
						(actor) =>
							new UnauthorizedError({
								message: `Unauthorized action ${action}`,
								detail: `You are not authorized to perform ${action} on ${entity} for ${actor.id}`,
							}),
					),
			) as any
	}
}

export class InternalServerError extends Schema.TaggedError<InternalServerError>("InternalServerError")(
	"InternalServerError",
	{
		message: Schema.String,
		detail: Schema.optional(Schema.String),
		cause: Schema.Any,
	},
	HttpApiSchema.annotations({
		status: 500,
	}),
) {}

export class DmChannelAlreadyExistsError extends Schema.TaggedError<DmChannelAlreadyExistsError>(
	"DmChannelAlreadyExistsError",
)(
	"DmChannelAlreadyExistsError",
	{
		message: Schema.String,
		detail: Schema.optional(Schema.String),
	},
	HttpApiSchema.annotations({
		status: 409,
	}),
) {}

export function withRemapDbErrors<R, E extends { _tag: string }, A>(
	entityType: string,
	action: "update" | "create" | "delete" | "select",
	entityId?: any | { value: any; key: string }[],
) {
	return (
		effect: Effect.Effect<R, E, A>,
	): Effect.Effect<R, Exclude<E, { _tag: "DatabaseError" | "ParseError" }> | InternalServerError, A> => {
		return effect.pipe(
			Effect.catchTags({
				DatabaseError: (err: any) =>
					Effect.fail(
						new InternalServerError({
							message: `Error ${action}ing ${entityType}`,
							detail: constructDetailMessage(
								"There was an error in parsing when",
								entityType,
								entityId,
							),
							cause: err,
						}),
					),
				ParseError: (err: any) =>
					Effect.fail(
						new InternalServerError({
							message: `Error ${action}ing ${entityType}`,
							detail: constructDetailMessage(
								"There was an error in parsing when",
								entityType,
								entityId,
							),
							cause: err,
						}),
					),
			}),
		)
	}
}

const constructDetailMessage = (
	title: string,
	entityType: string,
	entityId?: any | { value: any; key: string }[],
) => {
	if (entityId) {
		if (Array.isArray(entityId)) {
			return `${title} the ${entityType} with values ${entityId
				.map((value) => `${value.key}: ${value.value}`)
				.join(", ")}`
		}
		return `${title} the ${entityType} with id ${entityId}`
	}

	return `${title} the ${entityType}`
}
