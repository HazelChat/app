import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/$orgSlug/channels/$channelId/settings/")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/$orgSlug/channels/$channelId/settings/overview",
			params: {
				orgSlug: params.orgSlug,
				channelId: params.channelId,
			},
		})
	},
	component: () => null,
})
