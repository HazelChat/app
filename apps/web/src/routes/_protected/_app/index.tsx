import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { For, createEffect } from "solid-js"
import { Card } from "~/components/ui/card"
import { convexQuery } from "~/lib/convex-query"
import { getCurrentServerId } from "~/lib/helpers/localstorage"

export const Route = createFileRoute("/_protected/_app/")({
	component: App,
})

function App() {
	const navigate = useNavigate()
	const serversQuery = useQuery(() => convexQuery(api.servers.getServersForUser, {}))

	createEffect(() => {
		if (serversQuery.data?.length === 0) {
			navigate({
				to: "/onboarding",
			})
		}
	})

	createEffect(() => {
		const savedServerId = getCurrentServerId()

		if (savedServerId) {
			navigate({
				to: "/$serverId",
				params: {
					serverId: savedServerId,
				},
			})
		}
	})

	return (
		<main class="container mx-auto flex w-full py-14">
			<div class="flex flex-row gap-3">
				<For each={serversQuery.data}>
					{(server) => (
						<Link to="/$serverId" params={{ serverId: server._id }}>
							<Card>
								<Card.Header>
									<Card.Title>{server.name}</Card.Title>
								</Card.Header>
							</Card>
						</Link>
					)}
				</For>
			</div>
		</main>
	)
}
