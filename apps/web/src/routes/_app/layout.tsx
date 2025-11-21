import { createFileRoute, Outlet } from "@tanstack/react-router"
import { Match, Option } from "effect"
import { toast } from "sonner"
import { Loader } from "~/components/loader"
import { Button } from "~/components/ui/button"
import { Text } from "~/components/ui/text"
import { organizationCollection, organizationMemberCollection } from "~/db/collections"
import { useAuth } from "~/lib/auth"

export const Route = createFileRoute("/_app")({
	component: RouteComponent,
	loader: async () => {
		await organizationCollection.preload()
		await organizationMemberCollection.preload()

		return null
	},
})

function RouteComponent() {
	const { user, error, isLoading } = useAuth()

	// Show loader while loading
	if (isLoading && !user) {
		return <Loader />
	}

	// Handle authentication errors
	if (!user && Option.isSome(error)) {
		const errorValue = error.value
		const errorTag = errorValue._tag

		const serviceErrorScreen = (
			<div className="flex h-screen flex-col items-center justify-center gap-6">
				<div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
					<h1 className="font-bold font-mono text-2xl text-danger">Service Temporarily Unavailable</h1>
					<Text>
						We're having trouble connecting to the authentication service. This is usually temporary.
					</Text>
					<Text className="text-muted-fg text-xs">{errorValue.message}</Text>
					<Button intent="primary" onPress={() => window.location.reload()}>
						Retry
					</Button>
				</div>
			</div>
		)

		return Match.value(errorTag).pipe(
			// 503 errors - infrastructure/service issues - show error screen with retry
			Match.when("SessionLoadError", () => serviceErrorScreen),
			Match.when("SessionRefreshError", () => serviceErrorScreen),
			Match.when("WorkOSUserFetchError", () => serviceErrorScreen),
			// 401 errors - user needs to re-authenticate - redirect to login
			Match.orElse(() => {
				const returnTo = encodeURIComponent(window.location.href)
				const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"
				window.location.href = `${backendUrl}/auth/login?returnTo=${returnTo}`

				toast.error(errorValue.message)
				return <Loader />
			}),
		)
	}

	// No user and no error - redirect to login
	if (!user) {
		const returnTo = encodeURIComponent(window.location.href)
		const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"
		window.location.href = `${backendUrl}/auth/login?returnTo=${returnTo}`
		return <Loader />
	}

	return <Outlet />
}
