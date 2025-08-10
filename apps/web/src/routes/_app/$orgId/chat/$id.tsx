import type { Id } from "@hazel/backend"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { ChatHeader } from "~/components/chat/chat-header"
import { MessageComposer, type MessageComposerRef } from "~/components/chat/message-composer"
import { MessageList } from "~/components/chat/message-list"
import { ThreadPanel } from "~/components/chat/thread-panel"
import { TypingIndicator } from "~/components/chat/typing-indicator"
import { useChat } from "~/hooks/use-chat"
import { ChatProvider } from "~/providers/chat-provider"

export const Route = createFileRoute("/_app/$orgId/chat/$id")({
	component: RouteComponent,
})

function ChatContent() {
	const { activeThreadChannelId, activeThreadMessageId, closeThread, organizationId } = useChat()
	const messageComposerRef = useRef<MessageComposerRef>(null)

	useEffect(() => {
		const handleGlobalKeyDown = (event: KeyboardEvent) => {
			// Check if the event target is an input, textarea, or contenteditable element
			const target = event.target as HTMLElement
			const isInputElement =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.contentEditable === "true" ||
				target.closest('[contenteditable="true"]')

			// Skip if user is already typing in an input field
			if (isInputElement) {
				return
			}

			// Check if user is interacting with overlay elements (modals, popovers, dropdowns, etc.)
			const isInOverlay =
				// Check for modal/dialog elements
				target.closest('[role="dialog"]') ||
				target.closest('[aria-modal="true"]') ||
				// Check for dropdown menus
				target.closest('[role="menu"]') ||
				target.closest('[role="listbox"]') ||
				// Check for tooltips
				target.closest('[role="tooltip"]') ||
				// Check for popovers
				target.closest('[role="presentation"]') ||
				// Check for combobox/select dropdowns
				target.closest('[role="combobox"]') ||
				// Check for overlay classes used by react-aria-components
				target.closest(".z-50") || // Common z-index for overlays in this codebase
				// Check for modal overlay backdrop
				target.closest("[data-overlay]") ||
				target.closest("[data-popover]") ||
				// Check if any parent has data attributes indicating overlay state
				target.closest('[data-state="open"]') ||
				target.closest('[data-open="true"]')

			// Skip if user is interacting with overlay elements
			if (isInOverlay) {
				return
			}

			// Skip if user is pressing modifier keys
			if (event.ctrlKey || event.altKey || event.metaKey) {
				return
			}

			// Check if it's a printable character or space
			const isPrintableChar = event.key.length === 1

			if (isPrintableChar) {
				event.preventDefault()
				messageComposerRef.current?.focusAndInsertText(event.key)
			}
		}

		document.addEventListener("keydown", handleGlobalKeyDown)

		return () => {
			document.removeEventListener("keydown", handleGlobalKeyDown)
		}
	}, [])

	return (
		<div className="flex h-[100dvh] overflow-hidden">
			{/* Main Chat Area */}
			<div className="flex min-h-0 flex-1 flex-col">
				<ChatHeader />
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<MessageList />
				</div>
				<div className="flex-shrink-0 px-4 pt-2">
					<MessageComposer ref={messageComposerRef} />
					<TypingIndicator />
				</div>
			</div>

			{/* Thread Panel - Slide in from right */}
			{activeThreadChannelId && activeThreadMessageId && (
				<div className="slide-in-from-right w-[480px] animate-in duration-200">
					<ThreadPanel
						threadChannelId={activeThreadChannelId}
						originalMessageId={activeThreadMessageId}
						organizationId={organizationId}
						onClose={closeThread}
					/>
				</div>
			)}
		</div>
	)
}

function RouteComponent() {
	const { orgId, id } = Route.useParams()
	const organizationId = orgId as Id<"organizations">

	return (
		<ChatProvider channelId={id as Id<"channels">} organizationId={organizationId}>
			<ChatContent />
		</ChatProvider>
	)
}
