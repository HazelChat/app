"use client"

import {
	CommandMenu,
	CommandMenuItem,
	CommandMenuLabel,
	CommandMenuList,
	type CommandMenuProps,
	CommandMenuSearch,
	CommandMenuSection,
	CommandMenuShortcut,
} from "~/components/ui/command-menu"
import IconDashboard from "./icons/icon-dashboard"
import IconGear from "./icons/icon-gear"
import IconMsgs from "./icons/icon-msgs"

export function CommandPalette(props: Pick<CommandMenuProps, "isOpen" | "onOpenChange">) {
	return (
		<CommandMenu shortcut="k" {...props}>
			<CommandMenuSearch placeholder="Where would you like to go?" />
			<CommandMenuList>
				<CommandMenuSection>
					<CommandMenuItem href="#" textValue="all channels">
						<IconMsgs />
						<CommandMenuLabel>All channels</CommandMenuLabel>
					</CommandMenuItem>
					<CommandMenuItem href="#" textValue="members">
						<IconDashboard />
						<CommandMenuLabel>Members</CommandMenuLabel>
					</CommandMenuItem>
					<CommandMenuItem href="#" textValue="settings">
						<IconGear />
						<CommandMenuLabel>Settings</CommandMenuLabel>
					</CommandMenuItem>
				</CommandMenuSection>
			</CommandMenuList>
		</CommandMenu>
	)
}
