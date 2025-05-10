import { createFileRoute } from "@tanstack/solid-router"
import { useAuth } from "clerk-solidjs"
import { For, createMemo, createSignal } from "solid-js"
import { IconChat } from "~/components/icons/chat"
import { IconHorizontalDots } from "~/components/icons/horizontal-dots"
import { IconSearch } from "~/components/icons/search"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { TextField } from "~/components/ui/text-field"
import { useServerMemmbers } from "~/lib/hooks/data/use-server-members"
import { newId } from "~/lib/id-helpers"
import { useZero } from "~/lib/zero/zero-context"

export const Route = createFileRoute("/_app/$serverId/")({
	component: RouteComponent,
})

function RouteComponent() {
	const z = useZero()

	const params = Route.useParams()
	const serverId = createMemo(() => params().serverId)

	const [searchQuery, setSearchQuery] = createSignal("")

	const { members } = useServerMemmbers({ serverId, searchQuery })
	const navigate = Route.useNavigate()

	const { userId } = useAuth()

	const handleOpenChat = async ({
		targetUserId,
		userId,
		serverId,
	}: { targetUserId: string; userId: string; serverId: string }) => {
		if (!userId || !targetUserId || userId === targetUserId) {
			return
		}

		const potentialChannel = await z.query.serverChannels
			.where("channelType", "=", "direct")
			.where("serverId", "=", serverId)
			.whereExists("users", (q) => q.where("id", "=", userId))
			.whereExists("users", (q) => q.where("id", "=", targetUserId))
			.related("users")
			.limit(100)
			.one()
			.run()

		if (potentialChannel && potentialChannel.users?.length === 2) {
			return navigate({ to: "/$serverId/chat/$id" as const, params: { id: potentialChannel.id, serverId } })
		}

		const channelId = newId("serverChannels")

		try {
			await z.mutateBatch(async (tx) => {
				await tx.serverChannels.insert({
					id: channelId,
					serverId: serverId,
					channelType: "direct",
					name: "DM",
				})
				await tx.channelMembers.insert({ userId: userId, channelId: channelId, joinedAt: Date.now() })
				await tx.channelMembers.insert({ userId: targetUserId, channelId: channelId, joinedAt: Date.now() })
			})
			navigate({ to: "/$serverId/chat/$id" as const, params: { id: channelId, serverId } })
		} catch (error) {
			console.error("Failed to create DM channel:", error)
		}
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
				<For each={members()}>
					{(member) => (
						<div class="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
							<div class="flex items-center gap-2">
								<Avatar src={member.user!.avatarUrl} name={member.user!.displayName} />

								<div>
									<p>{member.user?.displayName}</p>
									<p class="text-muted-foreground">{member.user?.tag}</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Button
									intent="ghost"
									size="square"
									onClick={() =>
										handleOpenChat({
											targetUserId: member.user!.id,
											userId: userId()!,
											serverId: serverId(),
										})
									}
								>
									<IconChat />
								</Button>
								<Button intent="ghost" size="square">
									<IconHorizontalDots />
								</Button>
							</div>
						</div>
					)}
				</For>
			</div>
		</div>
	)
}
