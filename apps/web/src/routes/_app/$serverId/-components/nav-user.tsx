import { Link } from "@tanstack/solid-router"
import { useAuth, useUser } from "clerk-solidjs"
import type { Accessor } from "solid-js"
import { IconChevronUpDown } from "~/components/icons/chevron-up-down"
import { IconCreditCard } from "~/components/icons/credit-card"
import { IconSettings } from "~/components/icons/settings"
import { Avatar } from "~/components/ui/avatar"
import { Menu } from "~/components/ui/menu"
import { Sidebar } from "~/components/ui/sidebar"
import { IconSignOut } from "~/components/ui/signout"

interface NavUserProps {
	serverId: Accessor<string>
}

export const NavUser = (props: NavUserProps) => {
	const { user } = useUser()

	const { signOut } = useAuth()

	return (
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Menu positioning={{ placement: "right" }}>
					<Menu.Trigger
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						asChild={(props) => (
							<Sidebar.MenuButton size="lg" {...props()}>
								{props().children}
							</Sidebar.MenuButton>
						)}
					>
						<Avatar size="sm" src={user()?.imageUrl} name={user()?.username!} />
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">{user()?.username}</span>
							<span class="truncate text-xs">{user()?.primaryEmailAddress?.emailAddress}</span>
						</div>
						<IconChevronUpDown class="ml-auto size-4" />
					</Menu.Trigger>
					<Menu.Content>
						<Menu.ItemGroup>
							<Menu.Label>
								<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar size="sm" src={user()?.imageUrl} name={user()?.username!} />
									<div class="grid flex-1 text-left text-sm leading-tight">
										<span class="truncate font-semibold">{user()?.username}</span>
										<span class="truncate text-xs">
											{user()?.primaryEmailAddress?.emailAddress}
										</span>
									</div>
								</div>
							</Menu.Label>
						</Menu.ItemGroup>
						<Menu.Separator />
						<Menu.ItemGroup>
							<Menu.Item
								value="settings"
								asChild={(parentProps) => (
									<Link
										to="/$serverId/settings"
										params={{
											serverId: props.serverId(),
										}}
										{...parentProps()}
									/>
								)}
							>
								<IconSettings class="size-4" />
								Settings
							</Menu.Item>
							<Menu.Item
								value="billing"
								asChild={(parentProps) => (
									<Link
										to="/$serverId/billing"
										params={{
											serverId: props.serverId(),
										}}
										{...parentProps()}
									/>
								)}
							>
								<IconCreditCard class="size-4" />
								Billing
							</Menu.Item>
						</Menu.ItemGroup>
						<Menu.Separator />
						<Menu.ItemGroup>
							<Menu.Item value="logout" onClick={() => signOut()}>
								<IconSignOut class="size-4" />
								Logout
							</Menu.Item>
						</Menu.ItemGroup>
					</Menu.Content>
				</Menu>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	)
}
