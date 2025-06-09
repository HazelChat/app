import { Match, Switch } from "solid-js"
import { Avatar } from "./avatar"

export const UserAvatar = (props: {
	avatarUrl: string
	displayName: string
	status: "online" | "offline" | "away"
}) => {
	return (
		<div class="relative">
			<Avatar class="size-7" src={props.avatarUrl} name={props.displayName} />
			<Switch>
				<Match when={props.status === "online"}>
					<span class="-end-1 -bottom-1 absolute size-3 rounded-full border-2 border-background bg-emerald-500">
						<span class="sr-only">Online</span>
					</span>
				</Match>
				<Match when={props.status === "offline"}>
					<span class="-end-1 -bottom-1 absolute size-3 rounded-full border-2 border-background bg-muted">
						<span class="sr-only">Offline</span>
					</span>
				</Match>
				<Match when={props.status === "away"}>
					<span class="-end-1 -bottom-1 absolute size-3 rounded-full border-2 border-background bg-yellow-500">
						<span class="sr-only">Away</span>
					</span>
				</Match>
			</Switch>
		</div>
	)
}
