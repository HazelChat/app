import { Effect } from "effect"
import { AuthenticationError } from "./errors.ts"

/**
 * Bot authentication context
 */
export interface BotAuthContext {
	/**
	 * Bot ID
	 */
	readonly botId: string

	/**
	 * Channel IDs the bot has access to
	 */
	readonly channelIds: readonly string[]

	/**
	 * Bot token
	 */
	readonly token: string
}

/**
 * Service for bot authentication
 */
export class BotAuth extends Effect.Service<BotAuth>()("BotAuth", {
	accessors: true,
	effect: Effect.fn(function* (context: BotAuthContext) {
		return {
			getContext: Effect.succeed(context),

			validateToken: (token: string) =>
				Effect.gen(function* () {
					if (token !== context.token) {
						return yield* Effect.fail(
							new AuthenticationError({
								message: "Invalid bot token",
								cause: "Token does not match",
							}),
						)
					}
					return true
				}),
		}
	}),
}) {}

/**
 * Helper to create auth context from bot token
 * In a real implementation, this would decode the JWT or call an API
 */
export const createAuthContextFromToken = (
	token: string,
): Effect.Effect<BotAuthContext, AuthenticationError> =>
	Effect.gen(function* () {
		// TODO: In production, validate token against backend
		// For now, create a simple context
		const botId = `bot_temp_id`

		return {
			botId,
			channelIds: [],
			token,
		}
	})
