import { createListCollection } from "@ark-ui/solid/listbox"
import { createFileRoute } from "@tanstack/solid-router"
import { IconPhone } from "~/components/icons/phone"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Dialog } from "~/components/ui/dialog"
import { ListBox } from "~/components/ui/list-box"
import { Menu } from "~/components/ui/menu"
import { Popover } from "~/components/ui/popover"
import { Separator } from "~/components/ui/separator"
import { Tabs } from "~/components/ui/tabs"
import { TextField } from "~/components/ui/text-field"
import { Tooltip } from "~/components/ui/tooltip"

import { Index } from "solid-js"

export const Route = createFileRoute("/internal")({
	component: RouteComponent,
})

function RouteComponent() {
	const collection = createListCollection({
		items: [
			{ label: "React", value: "react" },
			{ label: "Solid", value: "solid" },
			{ label: "Svelte", value: "svelte", disabled: true },
			{ label: "Vue", value: "vue" },
		],
	})

	return (
		<div class="container mx-auto flex flex-col gap-6 py-16">
			<div class="flex flex-row flex-wrap gap-3">
				<Button intent="default">Default</Button>
				<Button intent="secondary">Secondary</Button>
				<Button intent="outline">Outline</Button>
				<Button intent="ghost">Ghost</Button>
				<Button intent="link">Link</Button>
			</div>
			<div class="flex flex-row flex-wrap gap-3">
				<Button intent="default" size="small">
					Small
				</Button>
				<Button intent="default" size="default">
					Default
				</Button>
				<Button intent="default" size="large">
					Large
				</Button>
				<Button intent="default" size="icon">
					<IconPhone />
				</Button>
			</div>
			<div class="flex flex-row flex-wrap gap-3">
				<Avatar class="size-10">
					<Avatar.Image src="https://avatars.githubusercontent.com/u/101927?v=4" />
					<Avatar.Fallback>UI</Avatar.Fallback>
				</Avatar>
				<Avatar shape="circle" class="size-10">
					<Avatar.Image src="https://avatars.githubusercontent.com/u/101927?v=4" />
					<Avatar.Fallback>UI</Avatar.Fallback>
				</Avatar>
				<Avatar class="size-10">
					<Avatar.Fallback>FB</Avatar.Fallback>
				</Avatar>
				<Avatar shape="circle" class="size-10">
					<Avatar.Fallback>FB</Avatar.Fallback>
				</Avatar>
			</div>
			<div class="flex gap-3">
				<Card>
					<Card.Header>
						<Card.Title>Card Title</Card.Title>
						<Card.Description>Card Description</Card.Description>
					</Card.Header>
					<Card.Content>
						<p>Card Content</p>
					</Card.Content>
					<Card.Footer>
						<Button>Button</Button>
					</Card.Footer>
				</Card>
			</div>
			<div class="flex gap-3">
				<div class="flex flex-col gap-3">
					<h1 class="text-3xl">Dialog</h1>
					<Dialog>
						<Dialog.Trigger
							asChild={(props) => (
								<Button intent="outline" {...props()}>
									Edit Profile
								</Button>
							)}
						/>
						<Dialog.Content class="sm:max-w-[425px]">
							<Dialog.Header>
								<Dialog.Title>Edit profile</Dialog.Title>
								<Dialog.Description>
									Make changes to your profile here. Click save when you're done.
								</Dialog.Description>
							</Dialog.Header>
							<div class="grid gap-4 py-4">WOW</div>
							<Dialog.Footer>
								<Button type="submit">Save changes</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog>
				</div>
			</div>
			<div class="flex flex-col gap-3">
				<Tooltip>
					<Tooltip.Trigger
						asChild={(props) => (
							<Button class="w-18" intent="outline" {...props()}>
								Hover
							</Button>
						)}
					/>
					<Tooltip.Content>
						<p>Add to library</p>
					</Tooltip.Content>
				</Tooltip>
			</div>

			<div class="flex flex-row gap-3">
				<Popover>
					<Popover.Trigger
						asChild={(props) => (
							<Button class="w-auto" intent="outline" {...props()}>
								Popover
							</Button>
						)}
					/>
					<Popover.Content>
						<Popover.Title>Popover Title</Popover.Title>
						<Popover.Description>Popover Description</Popover.Description>
					</Popover.Content>
				</Popover>
				<Popover>
					<Popover.Trigger
						asChild={(props) => (
							<Button class="w-auto" intent="outline" {...props()}>
								Popover with Arrow
							</Button>
						)}
					/>
					<Popover.Content withArrow>
						<Popover.Title>Popover Title</Popover.Title>
						<Popover.Description>Popover Description</Popover.Description>
					</Popover.Content>
				</Popover>
			</div>
			<div class="flex flex-row gap-3">
				<TextField label="Label" placeholder="Placeholder" />
				<TextField label="Label" placeholder="Placeholder" helperText="Helper Text" />
			</div>
			<div class="flex flex-row gap-3">
				<Menu>
					<Menu.Trigger asChild={(props) => <Button {...props}>Menu</Button>} />
					<Menu.Content>
						<Menu.Item value="1">Item 1</Menu.Item>
						<Menu.Separator />
						<Menu.Item value="2">Item 2</Menu.Item>
						<Menu.Item value="3">Item 3</Menu.Item>
					</Menu.Content>
				</Menu>
				<Menu>
					<Menu.Trigger asChild={(props) => <Button {...props}>Menu</Button>} />
					<Menu.Content>
						<Menu.Item value="1">Item 1</Menu.Item>
						<Menu.Item value="2">Item 2</Menu.Item>
						<Menu.Item value="3">Item 3</Menu.Item>
					</Menu.Content>
				</Menu>
			</div>
			<div class="flex flex-row gap-3">
				<Separator />
				<Separator orientation="vertical" />
			</div>
			<div class="flex flex-row gap-3">
				<Tabs>
					<Tabs.List>
						<Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
						<Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
						<Tabs.Trigger value="tab3">Tab 3</Tabs.Trigger>
					</Tabs.List>
					<Tabs.Content value="tab1">
						<p>Tab 1 Content</p>
					</Tabs.Content>
					<Tabs.Content value="tab2">
						<p>Tab 2 Content</p>
					</Tabs.Content>
					<Tabs.Content value="tab3">
						<p>Tab 3 Content</p>
					</Tabs.Content>
				</Tabs>
			</div>
			<div class="flex flex-row gap-3">
				<ListBox id="wow" collection={collection}>
					<ListBox.Label>Select your Framework</ListBox.Label>

					<ListBox.Content>
						<Index each={collection.items}>
							{(item) => (
								<ListBox.Item item={item()}>
									<ListBox.ItemText>{item().label}</ListBox.ItemText>
									<ListBox.ItemIndicator />
								</ListBox.Item>
							)}
						</Index>
					</ListBox.Content>
				</ListBox>
				<ListBox id="listboxId" collection={collection}>
					<ListBox.Label>Select your Framework</ListBox.Label>

					<ListBox.Content>
						<Index each={collection.items}>
							{(item) => (
								<ListBox.Item item={item()}>
									<ListBox.ItemText>{item().label}</ListBox.ItemText>
								</ListBox.Item>
							)}
						</Index>
					</ListBox.Content>
				</ListBox>
			</div>
		</div>
	)
}
