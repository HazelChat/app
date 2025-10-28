import { Atom, Result, useAtomSet, useAtomValue } from "@effect-atom/atom-react"
import { Effect, Exit } from "effect"
import { HazelApiClient } from "~/lib/services/common/atom-client"
import { router } from "~/main"
import { HazelRpcClient } from "./services/common/rpc-atom-client"

interface LoginOptions {
	returnTo?: string
	workosOrganizationId?: string
	invitationToken?: string
}

interface LogoutOptions {
	redirectTo?: string
}

/**
 * Atom that tracks whether the current route is a public route
 * (i.e., starts with /auth)
 */
const isPublicRouteAtom = Atom.make((get) => {
	const unsubscribe = router.subscribe("onResolved", (event) => {
		get.setSelf(event.toLocation.pathname.startsWith("/auth"))
	})

	get.addFinalizer(unsubscribe)

	return router.state.location.pathname.startsWith("/auth")
}).pipe(Atom.keepAlive)

/**
 * Query atom that fetches the current user from the API
 */
const currentUserQueryAtom = HazelRpcClient.query("user.me", void 0, {
	reactivityKeys: ["currentUser"],
})

/**
 * Derived atom that returns the current user
 * Returns null if on a public route or if the query failed
 */
export const userAtom = Atom.make((get) => {
	const isPublicRoute = get(isPublicRouteAtom)
	if (isPublicRoute) {
		return null
	}

	const result = get(currentUserQueryAtom)
	return Result.getOrElse(result, () => null)
})

/**
 * Derived atom that returns whether the auth state is loading
 */
const isLoadingAtom = Atom.make((get) => {
	const isPublicRoute = get(isPublicRouteAtom)
	if (isPublicRoute) {
		return false
	}

	const result = get(currentUserQueryAtom)
	return result._tag === "Initial" || result.waiting
})

/**
 * Login mutation atom
 */
const loginAtom = HazelApiClient.mutation("auth", "login")

/**
 * Logout function atom
 */
const logoutAtom = Atom.fn(
	Effect.fnUntraced(function* (options?: LogoutOptions) {
		const redirectTo = options?.redirectTo || "/"
		const logoutUrl = new URL("/auth/logout", import.meta.env.VITE_BACKEND_URL)
		logoutUrl.searchParams.set("redirectTo", redirectTo)
		window.location.href = logoutUrl.toString()
	}),
)

export function useAuth() {
	const user = useAtomValue(userAtom)
	const isLoading = useAtomValue(isLoadingAtom)
	const loginMutation = useAtomSet(loginAtom, { mode: "promiseExit" })
	const logoutFn = useAtomSet(logoutAtom)

	const login = async (options?: LoginOptions) => {
		const exit = await loginMutation({
			urlParams: {
				...options,
				returnTo: options?.returnTo || location.href,
			},
		})

		Exit.match(exit, {
			onSuccess: (data) => {
				window.location.href = data.authorizationUrl
			},
			onFailure: (cause) => {
				console.error("Login failed:", cause)
			},
		})
	}

	const logout = (options?: LogoutOptions) => {
		logoutFn(options)
	}

	return {
		user,
		isLoading,
		login,
		logout,
	}
}
