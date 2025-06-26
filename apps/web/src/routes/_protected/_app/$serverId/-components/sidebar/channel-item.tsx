import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { Link } from "@tanstack/solid-router"
import type { FunctionReturnType } from "convex/server"
import { type Accessor, createMemo, Index, Match, Switch } from "solid-js"
import {
	IconHashtagStroke,
	IconMultipleCrossCancelStroke,
	IconPhone2,
	IconStar1,
	IconThreeDotsMenuHorizontalStroke,
	IconVolumeMute1,
	IconVolumeOne1,
} from "~/components/iconsv2"
import { Avatar } from "~/components/ui/avatar"
import { Menu } from "~/components/ui/menu"
import { Sidebar } from "~/components/ui/sidebar"
import { IconSignOut } from "~/components/ui/signout"
import { UserAvatar } from "~/components/ui/user-avatar"
import { createMutation } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"
import { cn } from "~/lib/utils"

export interface ChannelItemProps {
	channel: Accessor<FunctionReturnType<typeof api.channels.getChannels>["serverChannels"][0]>
	serverId: Accessor<string>
}

export const ChannelItem = (props: ChannelItemProps) => {
	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel()._id,
	}))

	const leaveChannel = createMutation(api.channels.leaveChannel)
	const updateChannelPreferences = createMutation(api.channels.updateChannelPreferences)

	return (
		<Sidebar.MenuItem>
			<Sidebar.MenuButton as={Link} to="/$serverId/chat/$id" params={params() as any}>
				<IconHashtagStroke class="size-5" />
				<p class={cn("text-ellipsis text-nowrap", props.channel().isMuted && "opacity-60")}>
					{props.channel().name}
				</p>
			</Sidebar.MenuButton>
			<Menu positioning={{ placement: "bottom" }}>
				<Menu.Trigger
					asChild={(props) => (
						<Sidebar.MenuAction
							showOnHover
							class="rounded-sm text-foreground data-[state=open]:bg-muted"
							{...props()}
						>
							<IconThreeDotsMenuHorizontalStroke class="text-foreground" />
							<span class="sr-only">More</span>
						</Sidebar.MenuAction>
					)}
				/>
				<Menu.Content>
					<MuteMenuItem
						channelId={() => props.channel()._id}
						serverId={props.serverId}
						isMuted={() => props.channel().isMuted}
					/>
					<Menu.Item
						value="favorite"
						onSelect={async () => {
							await updateChannelPreferences({
								channelId: props.channel()._id,
								serverId: props.serverId() as Id<"servers">,
								isFavorite: !props.channel().isFavorite,
							})
						}}
					>
						{props.channel().isFavorite ? (
							<IconStar1 class="size-4 text-amber-500" />
						) : (
							<IconStar1 class="size-4" />
						)}
						{props.channel().isFavorite ? "Unfavorite" : "Favorite"}
					</Menu.Item>
					<Menu.Item
						class="flex items-center gap-2 text-destructive"
						value="close"
						onSelect={() => {
							leaveChannel({
								channelId: props.channel()._id as Id<"channels">,
								serverId: props.serverId() as Id<"servers">,
							})
						}}
					>
						<IconSignOut class="size-4" />
						Leave Channel
					</Menu.Item>
				</Menu.Content>
			</Menu>
		</Sidebar.MenuItem>
	)
}

const MuteMenuItem = (props: {
	channelId: Accessor<string>
	isMuted: Accessor<boolean>
	serverId: Accessor<string>
}) => {
	const updateChannelPreferences = createMutation(api.channels.updateChannelPreferences)

	return (
		<Menu.Item
			value="mute"
			onSelect={async () => {
				await updateChannelPreferences({
					channelId: props.channelId() as Id<"channels">,
					serverId: props.serverId() as Id<"servers">,
					isMuted: !props.isMuted(),
				})
			}}
		>
			{props.isMuted() ? <IconVolumeOne1 class="size-4" /> : <IconVolumeMute1 class="size-4" />}
			{props.isMuted() ? "Unmute" : "Mute"}
		</Menu.Item>
	)
}

interface DmChannelLinkProps {
	channel: Accessor<FunctionReturnType<typeof api.channels.getChannels>["dmChannels"][0]>
	serverId: Accessor<Id<"servers">>
	userPresence: Accessor<
		{
			userId: string
			online: boolean
			lastDisconnected: number
		}[]
	>
}

export const DmChannelLink = (props: DmChannelLinkProps) => {
	const meQuery = useQuery(() => ({
		...convexQuery(api.me.getUser, { serverId: props.serverId() }),
	}))

	const params = createMemo(() => ({
		serverId: props.serverId(),
		id: props.channel()._id,
	}))

	const updateChannelPreferences = createMutation(api.channels.updateChannelPreferences)

	const filteredMembers = createMemo(() =>
		props.channel().members.filter((member) => member.userId !== meQuery.data?._id),
	)

	return (
		<Sidebar.MenuItem>
			<Sidebar.MenuButton as={Link} to="/$serverId/chat/$id" params={params() as any}>
				<div class="-space-x-4 flex items-center justify-center">
					<Switch>
						<Match when={props.channel().type === "single" && filteredMembers().length === 1}>
							<div class="flex items-center justify-center gap-3">
								<UserAvatar
									class="size-6"
									avatarUrl={filteredMembers()[0].user.avatarUrl}
									displayName={filteredMembers()[0].user.displayName}
									status={
										props
											.userPresence()
											.find((p) => p.userId === filteredMembers()[0].user._id)?.online
											? "online"
											: "offline"
									}
								/>

								<p class={cn("truncate", props.channel().isMuted && "opacity-60")}>
									{filteredMembers()[0].user.displayName}
								</p>
							</div>
						</Match>
						<Match when={true}>
							<div class="-space-x-4 flex items-center justify-center">
								<Index each={filteredMembers()}>
									{(member) => (
										<div class="inline-block">
											<Avatar
												class="size-7"
												src={member().user.avatarUrl}
												name={member().user.displayName}
											/>
										</div>
									)}
								</Index>
								<p class={cn("truncate", props.channel().isMuted && "opacity-60")}>
									{filteredMembers()
										.map((member) => member.user.displayName)
										.join(", ")}
								</p>
							</div>
						</Match>
					</Switch>
				</div>
			</Sidebar.MenuButton>

			<Menu positioning={{ placement: "bottom-start" }}>
				<Menu.Trigger
					asChild={(props) => (
						<Sidebar.MenuAction
							showOnHover
							class="rounded-sm text-foreground data-[state=open]:bg-muted"
							{...props()}
						>
							<IconThreeDotsMenuHorizontalStroke class="text-foreground" />
							<span class="sr-only">More</span>
						</Sidebar.MenuAction>
					)}
				/>
				<Menu.Content>
					<Menu.Item
						class="flex items-center gap-2"
						value="phone"
						onSelect={() => {
							console.log("TODO: Implement call")
						}}
					>
						<IconPhone2 class="size-4" />
						Call
					</Menu.Item>
					<Menu.Separator />
					<MuteMenuItem
						channelId={() => props.channel()._id}
						serverId={props.serverId}
						isMuted={() => props.channel().isMuted}
					/>
					<Menu.Item
						class="text-destructive"
						value="close"
						onSelect={async () => {
							await updateChannelPreferences({
								channelId: props.channel()._id as Id<"channels">,
								serverId: props.serverId() as Id<"servers">,
								isHidden: true,
							})
						}}
					>
						<IconMultipleCrossCancelStroke class="size-4" />
						Close
					</Menu.Item>
				</Menu.Content>
			</Menu>
		</Sidebar.MenuItem>
	)
}
