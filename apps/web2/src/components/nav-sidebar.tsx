import IconDashboard from "~/components/icons/icon-dashboard"
import IconMsgs from "~/components/icons/icon-msgs"
import { Logo } from "~/components/logo"
import { Link } from "~/components/ui/link"
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarItem,
	SidebarSection,
	SidebarSectionGroup,
	SidebarSeparator,
	useSidebar,
} from "~/components/ui/sidebar"

export const servers = [
	{
		id: "srv_01",
		name: "Design",
		avatar: "https://avatars.laravel.cloud/1f2a3b4c-5d6e-7f89-0123-456789abcdef",
		href: "#",
	},
	{
		id: "srv_02",
		name: "Gaming",
		avatar: "https://avatars.laravel.cloud/2a3b4c5d-6e7f-8901-2345-6789abcdef01",
		href: "#",
	},
	{
		id: "srv_03",
		name: "Chill zone",
		avatar: "https://avatars.laravel.cloud/3b4c5d6e-7f89-0123-4567-89abcdef0123",
		href: "#",
	},
	{
		id: "srv_04",
		name: "Music room",
		avatar: "https://avatars.laravel.cloud/4c5d6e7f-8901-2345-6789-abcdef012345",
		href: "#",
	},
	{
		id: "srv_05",
		name: "Writers club",
		avatar: "https://avatars.laravel.cloud/5d6e7f89-0123-4567-89ab-cdef01234567",
		href: "#",
	},
	{
		id: "srv_06",
		name: "Movie nights",
		avatar: "https://avatars.laravel.cloud/6e7f8901-2345-6789-abcd-ef0123456789",
		href: "#",
	},
	{
		id: "srv_07",
		name: "Study group",
		avatar: "https://avatars.laravel.cloud/7f890123-4567-89ab-cdef-0123456789ab",
		href: "#",
	},
	{
		id: "srv_08",
		name: "Photography",
		avatar: "https://avatars.laravel.cloud/89012345-6789-abcd-ef01-23456789abcd",
		href: "#",
	},
	{
		id: "srv_09",
		name: "Art corner",
		avatar: "https://avatars.laravel.cloud/90123456-789a-bcde-f012-3456789abcde",
		href: "#",
	},
	{
		id: "srv_10",
		name: "Foodies",
		avatar: "https://avatars.laravel.cloud/a0123456-89ab-cdef-0123-456789abcdef",
		href: "#",
	},
	{
		id: "srv_11",
		name: "Sports arena",
		avatar: "https://avatars.laravel.cloud/b1234567-89ab-cdef-0123-456789abcdef",
		href: "#",
	},
]

export function NavSidebar() {
	const { isMobile } = useSidebar()

	return (
		<Sidebar
			collapsible="none"
			className="hidden w-[calc(var(--sidebar-width-dock)+1px)] md:flex md:border-r"
		>
			<SidebarHeader className="h-14 px-3 py-4">
				<Link href="/" className="flex items-center justify-center">
					<Logo className="size-7" />
				</Link>
			</SidebarHeader>
			<SidebarSeparator className="hidden sm:block" />
			<SidebarContent className="mask-none">
				<SidebarSectionGroup>
					<SidebarSection className="p-2! *:data-[slot=sidebar-section-inner]:gap-y-2">
						<SidebarItem
							href="/"
							aria-label="Home"
							className="size-9 justify-items-center"
							tooltip={{
								children: "Home",
								hidden: isMobile,
							}}
						>
							<IconDashboard className="size-5" />
						</SidebarItem>
						<SidebarItem
							href="/"
							aria-label="Chat"
							className="size-9 justify-items-center"
							tooltip={{
								children: "Chat",
								hidden: isMobile,
							}}
						>
							<IconMsgs className="size-5" />
						</SidebarItem>
					</SidebarSection>
				</SidebarSectionGroup>
			</SidebarContent>
		</Sidebar>
	)
}
