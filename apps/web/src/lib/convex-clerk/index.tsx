import { type Accessor, createMemo, type JSX } from "solid-js"
import type { ConvexSolidClient } from "../convex/client"
import { ConvexProviderWithAuth } from "../convex/convex-auth-state"

type UseAuth = () => {
	isLoaded: Accessor<boolean>
	isSignedIn: Accessor<boolean | undefined>
	sessionId: Accessor<string | null | undefined>
	userId: Accessor<string | null | undefined>
	actor: Accessor<any | null | undefined>
	orgId: Accessor<string | null | undefined>
	orgRole: Accessor<string | null | undefined>
	orgPermissions: Accessor<string[] | null | undefined>
	has: (params: any) => boolean
	signOut: () => void
	getToken: (options: { template?: "convex"; skipCache?: boolean }) => Promise<string | null>
}

export function ConvexProviderWithClerk(props: {
	children: JSX.Element
	client: ConvexSolidClient
	useAuth: UseAuth
}) {
	const useAuthFromClerk = createUseAuthFromClerk(props.useAuth)

	return (
		<ConvexProviderWithAuth client={props.client} createAuth={useAuthFromClerk}>
			{props.children}
		</ConvexProviderWithAuth>
	)
}

function createUseAuthFromClerk(useAuth: UseAuth) {
	return () => {
		const { isLoaded, isSignedIn, getToken, orgId, orgRole } = useAuth()

		const fetchAccessToken = createMemo(() => {
			const _currentOrgId = orgId()
			const _currentOrgRole = orgRole()

			return async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
				try {
					return await getToken({
						template: "convex",
						skipCache: forceRefreshToken,
					})
				} catch {
					return null
				}
			}
		})

		const isLoading = createMemo(() => !isLoaded())
		const isAuthenticated = createMemo(() => isSignedIn() ?? false)

		return {
			isLoading: isLoading,
			isAuthenticated: isAuthenticated,
			fetchAccessToken: fetchAccessToken(),
		}
	}
}
