import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { useUserServers } from "~/lib/hooks/data/use-user-servers"

export const ServerSelectSidebar = () => {
	const { servers } = useUserServers()

	return (
		<ul class="flex flex-col gap-3 px-2 py-1">
			<For each={servers()}>
				{(server) => (
					<li>
						<Link to="/$serverId" params={{ serverId: server.id }}>
							<Avatar>
								<AvatarImage src={server.imageUrl} alt={server.name} />
								<AvatarFallback>{server.name.slice(0, 2)}</AvatarFallback>
							</Avatar>
						</Link>
					</li>
				)}
			</For>
		</ul>
	)
}
