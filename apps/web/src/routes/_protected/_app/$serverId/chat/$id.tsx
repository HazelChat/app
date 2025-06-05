import { createFileRoute } from "@tanstack/solid-router"
import { Show, createMemo } from "solid-js"
import { ChatTopbar } from "~/components/chat-ui/chat-topbar"

import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { ChatProvider, useChat } from "~/components/chat-state/chat-store"
import { ImageViewerModal } from "~/components/chat-ui/image-viewer-modal"
import { IconX } from "~/components/icons/x"
import { Button } from "~/components/ui/button"
import { convexQuery } from "~/lib/convex-query"
import { Channel } from "./-components/channel"

export const Route = createFileRoute("/_protected/_app/$serverId/chat/$id")({
	component: Root,
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(
			convexQuery(api.channels.getChannel, {
				channelId: params.id as Id<"channels">,
				serverId: params.serverId as Id<"servers">,
			}),
		),
})

function Root() {
	const params = Route.useParams()

	const serverId = createMemo(() => params().serverId as Id<"servers">)
	const channelId = createMemo(() => params().id as Id<"channels">)

	return (
		<ChatProvider channelId={channelId} serverId={serverId}>
			<RouteComponent />
		</ChatProvider>
	)
}

function RouteComponent() {
	const { state, setState } = useChat()
	const openThreadId = createMemo(() => state.openThreadId!)

	const params = Route.useParams()
	const serverId = createMemo(() => params().serverId as Id<"servers">)
	const channelId = createMemo(() => params().id as Id<"channels">)

	return (
		<div class="flex h-screen flex-col">
			<ChatTopbar />
			<div class="flex flex-1">
				<Channel channelId={channelId} serverId={serverId} isThread={false} />
				<Show when={openThreadId()}>
					<ChatProvider channelId={openThreadId} serverId={serverId}>
						<ThreadChannel
							channelId={openThreadId()}
							serverId={serverId()}
							closeThread={() => setState("openThreadId", null)}
						/>
					</ChatProvider>
				</Show>
			</div>
			<ChatImageViewerModal />
		</div>
	)
}

function ChatImageViewerModal() {
	const { state, setState } = useChat()

	const messageId = createMemo(() => state.imageDialog.messageId!)

	const messageQuery = useQuery(() => ({
		...convexQuery(api.messages.getMessage, {
			id: messageId(),
			channelId: state.channelId,
			serverId: state.serverId,
		}),
		enabled: !!messageId(),
	}))

	const availableImages = createMemo(() => messageQuery.data?.attachedFiles ?? [])
	const defaultImage = createMemo(() => state.imageDialog.selectedImage!)

	return (
		<Show when={messageQuery.data && defaultImage()}>
			<ImageViewerModal
				availableImages={availableImages}
				defaultImage={defaultImage}
				onOpenChange={() =>
					setState("imageDialog", (prev) => ({
						...prev,
						open: false,
						messageId: null,
						selectedImage: null,
					}))
				}
				author={messageQuery.data!.author}
				createdAt={messageQuery.data!._creationTime!}
				bucketUrl={import.meta.env.VITE_BUCKET_URL}
			/>
		</Show>
	)
}

function ThreadChannel(props: {
	channelId: Id<"channels">
	serverId: Id<"servers">
	closeThread: () => void
}) {
	const { setState } = useChat()

	const channelId = createMemo(() => props.channelId)
	const serverId = createMemo(() => props.serverId)

	return (
		<div class="flex flex-1 flex-col border-l">
			<div class="flex items-center justify-between border-b bg-sidebar p-4">
				<p>Thread</p>
				<Button intent="ghost" size="icon-small" onClick={props.closeThread}>
					<IconX class="size-4" />
				</Button>
			</div>
			<Channel channelId={channelId} serverId={serverId} isThread={true} />
		</div>
	)
}
