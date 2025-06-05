import { api } from "@hazel/backend/api"
import { Link, useParams } from "@tanstack/solid-router"
import { For, createMemo, createSignal } from "solid-js"
import { IconChevronUpDown } from "~/components/icons/chevron-up-down"
import { IconPlus } from "~/components/icons/plus"
import { Avatar } from "~/components/ui/avatar"
import { Menu } from "~/components/ui/menu"
import { Sidebar } from "~/components/ui/sidebar"
import { createQuery } from "~/lib/convex"
import { CreateServerDialog } from "./create-server-dialog"

export const WorkspaceSwitcher = () => {
	const params = useParams({
		from: "/_protected/_app/$serverId",
	})

	const [createDialogOpen, setCreateDialogOpen] = createSignal(false)

	const servers = createQuery(api.servers.getServersForUser)

	const activeServer = createMemo(() => servers()?.find((server) => server._id === params().serverId))

	return (
		<>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Menu>
						<Menu.Trigger
							asChild={(props) => (
								<Sidebar.MenuButton
									size="lg"
									class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
									{...props()}
								>
									<Avatar
										size="xs"
										src={activeServer()?.imageUrl}
										name={activeServer()?.name!}
									/>
									<div class="grid flex-1 text-left text-sm leading-tight">
										<span class="truncate font-semibold">{activeServer()?.name}</span>
									</div>
									<IconChevronUpDown class="ml-auto" />
								</Sidebar.MenuButton>
							)}
						/>
						<Menu.Content class="min-w-56 rounded-lg">
							<Menu.ItemGroup>
								<Menu.Label>Servers</Menu.Label>
								<For each={servers()}>
									{(server) => (
										<Menu.Item
											class="flex items-center gap-2"
											value={server._id}
											asChild={(props) => (
												<Link
													to="/$serverId"
													params={{
														serverId: server._id,
													}}
													{...props()}
												/>
											)}
										>
											<Avatar size="xs" src={server.imageUrl} name={server.name} />
											<span class="truncate text-muted-foreground text-xs">
												{server.name}
											</span>
										</Menu.Item>
									)}
								</For>
							</Menu.ItemGroup>
							<Menu.Separator />
							<Menu.ItemGroup>
								<Menu.Item
									value="add-server"
									class="gap-2 p-2"
									onSelect={() => setCreateDialogOpen(true)}
								>
									<div class="flex size-6 items-center justify-center rounded-md border bg-background">
										<IconPlus class="size-4" />
									</div>
									<div class="font-medium text-muted-foreground">Add Server</div>
								</Menu.Item>
							</Menu.ItemGroup>
						</Menu.Content>
					</Menu>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
			<CreateServerDialog open={createDialogOpen()} onOpenChange={setCreateDialogOpen} />
		</>
	)
}
