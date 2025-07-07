import type { useAuth } from "authkit-solidjs"
import { createMemo, type JSX } from "solid-js"
import type { ConvexSolidClient } from "../convex/client"
import { ConvexProviderWithAuth } from "../convex/convex-auth-state"

export function ConvexProviderWithWorkOS(props: {
	children: JSX.Element
	client: ConvexSolidClient
	useAuth: typeof useAuth
}) {
	const useAuthFromWorkOS = createUseAuthFromWorkOS(props.useAuth)

	return (
		<ConvexProviderWithAuth client={props.client} createAuth={useAuthFromWorkOS}>
			{props.children}
		</ConvexProviderWithAuth>
	)
}

function createUseAuthFromWorkOS(useAuthHook: typeof useAuth) {
	return () => {
		const authData = useAuthHook()

		const fetchAccessToken = createMemo(() => {
			// Track organization context for potential future use
			return async (_args: { forceRefreshToken: boolean }) => {
				try {
					const token = await authData.getAccessToken()
					return token
				} catch {
					return null
				}
			}
		})

		const isLoading = createMemo(() => authData.isLoading)
		const isAuthenticated = createMemo(() => !!authData.user)

		return {
			isLoading,
			isAuthenticated,
			fetchAccessToken: fetchAccessToken(),
		}
	}
}
