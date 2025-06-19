import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQueries, useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { For, Show, Suspense, createMemo, createSignal } from "solid-js"
import { IconChat } from "~/components/icons/chat"
import { IconHorizontalDots } from "~/components/icons/horizontal-dots"
import { IconLoader } from "~/components/icons/loader"
import { IconSearch } from "~/components/icons/search"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { TextField } from "~/components/ui/text-field"
import { createMutation } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"

export const Route = createFileRoute("/_protected/_app/$serverId/")({
	component: RouteComponent,
})

function RouteComponent() {
	const navigate = Route.useNavigate()
	const params = Route.useParams()

	const [searchQuery, setSearchQuery] = createSignal("")

	const membersQuery = useQuery(() =>
		convexQuery(api.social.getMembers, {
			serverId: params().serverId as Id<"servers">,
		}),
	)

	const currentUserQuery = useQuery(() => convexQuery(api.me.get, {}))

	const createDmChannel = createMutation(api.channels.creatDmChannel)

	const handleOpenChat = async ({
		targetUserId,
		serverId,
	}: { targetUserId: Id<"users">; serverId: Id<"servers"> }) => {
		if (!targetUserId) {
			return
		}

		const channelId = await createDmChannel({
			serverId: serverId,
			userId: targetUserId,
		})

		navigate({ to: "/$serverId/chat/$id" as const, params: { id: channelId, serverId } })
	}

	return (
		<div class="container mx-auto px-6 py-12">
			<div class="flex flex-col gap-2">
				<TextField
					value={searchQuery()}
					onInput={(props) => {
						setSearchQuery(props.target.value)
					}}
					prefix={<IconSearch class="ml-3 size-5" />}
					placeholder="Search Members"
				/>
				<Suspense
					fallback={
						<div>
							<IconLoader class="animate-spin" />
						</div>
					}
				>
					<For each={membersQuery.data}>
						{(member) => (
							<div class="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
								<div class="flex items-center gap-2">
									<Avatar src={member.avatarUrl} name={member.displayName} />

									<div>
										<p>{member.displayName}</p>
										<p class="text-muted-foreground">{member.tag}</p>
									</div>
								</div>
								<Show when={currentUserQuery.data?._id !== member.accountId}>
									<div class="flex items-center gap-2">
										<Button
											intent="ghost"
											size="square"
											onClick={() =>
												handleOpenChat({
													targetUserId: member._id,
													serverId: params().serverId as Id<"servers">,
												})
											}
										>
											<IconChat />
										</Button>
										<Button intent="ghost" size="square">
											<IconHorizontalDots />
										</Button>
									</div>
								</Show>
							</div>
						)}
					</For>
				</Suspense>
			</div>
		</div>
	)
}
