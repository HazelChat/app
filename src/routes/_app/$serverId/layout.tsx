import { Outlet, createFileRoute } from "@tanstack/solid-router"
import { Sidebar } from "~/components/sidebar"

export const Route = createFileRoute("/_app/$serverId")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div>
			<div class="fixed inset-y-0 border-r bg-background pb-4 lg:left-0 lg:z-50 lg:block lg:w-14 lg:overflow-y-auto">
				<nav class="mt-8">
					{/* <ul role="list" class="flex flex-col items-center space-y-1">
						{navigation.map((item) => (
							<li key={item.name}>
								<a
									href={item.href}
									class={classs(
										item.current
											? "bg-gray-800 text-white"
											: "text-gray-400 hover:bg-gray-800 hover:text-white",
										"group flex gap-x-3 rounded-md p-3 text-sm/6 font-semibold",
									)}
								>
									<item.icon aria-hidden="true" class="size-6 shrink-0" />
									<span class="sr-only">{item.name}</span>
								</a>
							</li>
						))}
					</ul> */}
				</nav>
			</div>
			<main class="pl-14">
				<div class="pl-62">
					<Outlet />
				</div>
			</main>
			<aside class="fixed inset-y-0 left-14 block w-62 overflow-y-auto border-border border-r">
				<Sidebar />
			</aside>
		</div>
	)
}
