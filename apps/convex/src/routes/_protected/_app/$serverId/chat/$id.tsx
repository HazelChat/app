import { createFileRoute } from "@tanstack/solid-router"
import { Show, createMemo } from "solid-js"
import { ChatTopbar } from "~/components/chat-ui/chat-topbar"

import { api } from "convex-hazel/_generated/api"
import type { Id } from "convex-hazel/_generated/dataModel"
import { ChatProvider, useChat } from "~/components/chat-state/chat-store"
import { ImageViewerModal } from "~/components/chat-ui/image-viewer-modal"
import { IconX } from "~/components/icons/x"
import { Button } from "~/components/ui/button"
import { createQuery } from "~/lib/convex"
import { Channel } from "./-components/channel"
// import { Channel } from "./-components/channel"

export const Route = createFileRoute("/_protected/_app/$serverId/chat/$id")({
	component: Root,
})

function Root() {
	const params = Route.useParams()

	return (
		<ChatProvider channelId={params().id as Id<"channels">} serverId={params().serverId as Id<"servers">}>
			<RouteComponent />
		</ChatProvider>
	)
}

function RouteComponent() {
	const { state } = useChat()

	const params = Route.useParams()
	const serverId = createMemo(() => params().serverId as Id<"servers">)
	const channelId = createMemo(() => params().id as Id<"channels">)

	return (
		<div class="flex h-screen flex-col">
			<ChatTopbar />
			<div class="flex flex-1">
				<Channel channelId={channelId} serverId={serverId} />
				<Show when={state.openThreadId}>
					<ThreadChannel channelId={state.openThreadId!} serverId={serverId()} />
				</Show>
			</div>
			<ChatImageViewerModal />
		</div>
	)
}

function ChatImageViewerModal() {
	const { state, setState } = useChat()

	const messageId = createMemo(() => state.imageDialog.messageId!)

	const message = createMemo(() => {
		if (!messageId()) return null

		const { data } = createQuery(api.messages.getMessage, {
			id: messageId(),
			channelId: state.channelId,
			serverId: state.serverId,
		})

		return data()
	})

	const availableImages = createMemo(() => message()?.attachedFiles ?? [])
	const defaultImage = createMemo(() => state.imageDialog.selectedImage!)

	return (
		<Show when={message() && defaultImage()}>
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
				author={message()!.author}
				createdAt={message()!._creationTime!}
				bucketUrl={import.meta.env.VITE_BUCKET_URL}
			/>
		</Show>
	)
}

function ThreadChannel(props: { channelId: Id<"channels">; serverId: Id<"servers"> }) {
	const { setState } = useChat()

	const channelId = createMemo(() => props.channelId)
	const serverId = createMemo(() => props.serverId)

	return (
		<div class="flex flex-1 flex-col border-l">
			<div class="flex items-center justify-between border-b bg-sidebar p-4">
				<p>Thread</p>
				<Button intent="ghost" size="icon-small" onClick={() => setState("openThreadId", null)}>
					<IconX class="size-4" />
				</Button>
			</div>
			<Channel channelId={channelId} serverId={serverId} />
		</div>
	)
}
