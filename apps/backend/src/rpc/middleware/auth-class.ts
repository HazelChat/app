/**
 * Auth Middleware Class Definition (Client-Safe)
 *
 * This file contains ONLY the middleware class definition that is safe to import
 * in browser code. The server-side implementation is in auth.ts.
 *
 * This separation prevents accidentally bundling server-side code (UserRepo, WorkOS, etc.)
 * when frontend imports RPC group definitions that reference this middleware.
 */

import { RpcMiddleware } from "@effect/rpc"
import {
	CurrentUser,
	InvalidBearerTokenError,
	InvalidJwtPayloadError,
	SessionAuthenticationError,
	SessionExpiredError,
	SessionLoadError,
	SessionNotProvidedError,
	SessionRefreshError,
	UnauthorizedError,
	WorkOSUserFetchError,
} from "@hazel/domain"
import { Schema as S } from "effect"

/**
 * Authentication middleware that provides CurrentUser context to RPC handlers.
 *
 * This middleware:
 * 1. Extracts the session cookie from request headers
 * 2. Verifies the session via WorkOS and retrieves user information
 * 3. Provides CurrentUser to the RPC handler via Effect context
 *
 * Usage in RPC definition:
 * ```typescript
 * Rpc.make("MessageCreate", { ... }).middleware(AuthMiddleware)
 * ```
 *
 * Usage in handler:
 * ```typescript
 * MessageCreate: (payload) =>
 *   Effect.gen(function* () {
 *     const user = yield* CurrentUser.Context
 *     // user is automatically available from middleware!
 *   })
 * ```
 */
const AuthFailure = S.Union(
	UnauthorizedError,
	SessionLoadError,
	SessionAuthenticationError,
	InvalidJwtPayloadError,
	SessionNotProvidedError,
	SessionRefreshError,
	SessionExpiredError,
	InvalidBearerTokenError,
	WorkOSUserFetchError,
)

export class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()("AuthMiddleware", {
	provides: CurrentUser.Context,
	failure: AuthFailure,
	requiredForClient: true,
}) {}
