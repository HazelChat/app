import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/solid-router"
import { api } from "convex-hazel/_generated/api"
import { For, createEffect } from "solid-js"
import { Card } from "~/components/ui/card"
import { createQuery } from "~/lib/convex"
import { getCurrentServerId } from "~/lib/helpers/localstorage"

export const Route = createFileRoute("/_protected/_app/")({
	component: App,
})

function App() {
	const navigate = useNavigate()
	const servers = createQuery(api.servers.getServersForUser)

	createEffect(() => {
		if (servers()?.length === 0) {
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
				<For each={servers()}>
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
