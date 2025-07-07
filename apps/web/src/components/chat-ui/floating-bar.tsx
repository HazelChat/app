import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { useAuth } from "authkit-solidjs"
import { createEffect, createMemo, createSignal, For, type JSX, onCleanup, Show, Suspense } from "solid-js"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"
import { createMutation, insertAtTop } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"
import { useHotkey, useLayer } from "~/lib/hotkey-manager"
import { useKeyboardSounds } from "~/lib/keyboard-sounds"
import { useChat } from "../chat-state/chat-store"
import { IconLoader } from "../icons/loader"
import { IconCirclePlusSolid } from "../icons/solid/circle-plus-solid"
import { IconCircleXSolid } from "../icons/solid/circle-x-solid"
import { ChatInput } from "../markdown-input/chat-input"
import { setElementAnchorAndFocus } from "../markdown-input/utils"
import { Button } from "../ui/button"

// Type for individual attachment state
type Attachment = {
	id: string
	file: File
	status: "pending" | "uploading" | "success" | "error"
	key?: string // Server-generated key after successful upload
	error?: string // Error message on failure
}

const useFileAttachment = () => {
	const [attachments, setAttachments] = createSignal<Attachment[]>([])
	const [fileInputRef, setFileInputRef] = createSignal<HTMLInputElement>()

	// Function to add new files, filters for images
	const addFiles = (files: FileList | File[]) => {
		const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))

		if (imageFiles.length === 0) {
			// Optionally show an error if non-images were selected/pasted
			console.warn("No valid image files selected.")
			return
		}

		const newAttachments: Attachment[] = imageFiles.map((file) => ({
			id: "XD",
			file: file,
			status: "pending",
		}))

		setAttachments((prev) => [...prev, ...newAttachments])
	}

	// Effect to process pending uploads
	createEffect(() => {
		const pendingAttachments = attachments().filter((att) => att.status === "pending")

		if (pendingAttachments.length === 0) {
			return
		}

		// Set status to uploading immediately
		setAttachments((prev) =>
			prev.map((att) =>
				pendingAttachments.some((p) => p.id === att.id) ? { ...att, status: "uploading" } : att,
			),
		)

		const uploadPromises = pendingAttachments.map(async (attachment) => {
			try {
				const uploadUrl = `${import.meta.env.VITE_CONVEX_URL}/store`
				const response = await fetch(uploadUrl, {
					method: "PUT",
					body: attachment.file,
					headers: {
						"Content-Type": attachment.file.type,
					},
				})

				if (!response.ok) {
					const errorText = await response.text()
					throw new Error(`Upload failed: ${response.statusText} - ${errorText}`)
				}

				const result = await response.json()
				if (!result || typeof result.key !== "string") {
					throw new Error("Invalid response received after upload.")
				}

				return { id: attachment.id, status: "success" as const, key: result.key }
			} catch (error: any) {
				console.error("Error uploading file:", attachment.file.name, error)
				return {
					id: attachment.id,
					status: "error" as const,
					error: error.message || "An unknown error occurred.",
				}
			}
		})

		// Process results using for...of loop
		Promise.allSettled(uploadPromises).then((results) => {
			setAttachments((prev) => {
				const updatedAttachments = [...prev]
				for (const result of results) {
					if (result.status === "fulfilled") {
						const { id, status, key, error } = result.value
						const index = updatedAttachments.findIndex((att) => att.id === id)
						if (index !== -1) {
							updatedAttachments[index] = {
								...updatedAttachments[index],
								status: status,
								key: key,
								error: error,
							}
						}
					}
				}
				return updatedAttachments
			})
		})
	})

	const handleFileChange: JSX.ChangeEventHandlerUnion<HTMLInputElement, Event> = (e) => {
		if (e.currentTarget.files) {
			addFiles(e.currentTarget.files)
		}
		// Clear input value to allow selecting the same file again
		if (e.currentTarget) e.currentTarget.value = ""
	}

	const openFileSelector = () => {
		fileInputRef()?.click()
	}

	// Function to remove a specific attachment by its ID
	const removeAttachment = (idToRemove: string) => {
		setAttachments((prev) => prev.filter((att) => att.id !== idToRemove))
		// Note: This doesn't cancel ongoing uploads for the removed file.
		// Cancellation would require AbortController integration.
	}

	// Function to clear all attachments
	const clearAttachments = () => {
		setAttachments([])
		if (fileInputRef()) {
			fileInputRef()!.value = ""
		}
	}

	const handlePaste = (e: ClipboardEvent) => {
		const items = e.clipboardData?.items
		if (!items) return

		const filesToPaste: File[] = []
		for (let i = 0; i < items.length; i++) {
			if (items[i].kind === "file") {
				const file = items[i].getAsFile()
				if (file) {
					filesToPaste.push(file)
				}
			}
		}

		if (filesToPaste.length > 0) {
			e.preventDefault() // Prevent default paste only if files are found
			addFiles(filesToPaste)
		}
	}

	createEffect(() => {
		window.addEventListener("paste", handlePaste)
		onCleanup(() => {
			window.removeEventListener("paste", handlePaste)
		})
	})

	return {
		attachments,
		setFileInputRef,
		handleFileChange,
		openFileSelector,
		removeAttachment,
		clearAttachments,
	}
}

const createGlobalEditorFocus = (props: {
	editorRef: () => HTMLDivElement | undefined
	playSound: () => void
}) => {
	const { setState, state } = useChat()
	const input = createMemo(() => state.inputText)

	// Track mouse position
	const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 })

	createEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setMousePosition({ x: event.clientX, y: event.clientY })
		}

		document.addEventListener("mousemove", handleMouseMove)

		onCleanup(() => {
			document.removeEventListener("mousemove", handleMouseMove)
		})
	})

	createEffect(() => {
		const ref = props.editorRef()
		if (!ref) {
			return
		}

		const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.ctrlKey || event.altKey || event.metaKey) {
				return
			}

			if (document.querySelector('[data-aria-modal="true"]')) {
				return
			}

			const activeElement = document.activeElement
			if (activeElement) {
				const isInputContext = activeElement.closest(
					'input, textarea, select, [contenteditable="true"], [contenteditable=""]',
				)
				if (isInputContext) {
					return
				}
			}

			// Find the closest chat input to the mouse cursor
			const chatInputs = document.querySelectorAll("#chat-input-editor")
			const mouse = mousePosition()

			if (chatInputs.length > 1) {
				const distances = [...chatInputs].map((input) => {
					const center = getElementCenter(input)
					return {
						input,
						distance: calculateDistance(mouse.x, mouse.y, center.x, center.y),
					}
				})

				// Sort by distance and get the closest one
				distances.sort((a, b) => a.distance - b.distance)
				const closestChatInput = distances[0]?.input

				// If the current ref is not the closest chat input, don't focus it
				if (closestChatInput && closestChatInput !== ref) {
					return
				}
			}

			const isPrintableKey = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey

			if (isPrintableKey) {
				event.preventDefault()

				props.playSound()

				const content = input() + event.key

				setState("inputText", content)

				ref.focus()

				try {
					setElementAnchorAndFocus(props.editorRef()!, {
						anchor: input().length,
					})
				} catch (error) {
					console.error(error)
				}
			}
		}

		document.addEventListener("keydown", handleGlobalKeyDown)

		onCleanup(() => {
			document.removeEventListener("keydown", handleGlobalKeyDown)
		})
	})
}

export function FloatingBar() {
	const auth = useAuth()
	const { playSound } = useKeyboardSounds()

	const { state, setState } = useChat()

	const meQuery = useQuery(() => ({
		...convexQuery(api.me.getUser, { serverId: state.serverId }),
	}))

	const stopTyping = createMutation(api.typingIndicator.stop)

	const createMessage = createMutation(api.messages.createMessage).withOptimisticUpdate(
		(localStore, args) => {
			const author = meQuery.data
			// If Current User is not loaded, dont optimistically update
			if (!author) return

			return insertAtTop({
				paginatedQuery: api.messages.getMessages,
				argsToMatch: { channelId: args.channelId, serverId: args.serverId },
				localQueryStore: localStore,
				item: {
					_id: crypto.randomUUID() as Id<"messages">,
					...args,
					author: author,
					_creationTime: Date.now(),
					updatedAt: Date.now(),
					authorId: author._id,
					reactions: [],
					threadMessages: [],
				},
			})
		},
	)

	const {
		attachments,
		setFileInputRef,
		handleFileChange,
		openFileSelector,
		removeAttachment,
		clearAttachments,
	} = useFileAttachment()

	useLayer("chat-input", 200)

	useHotkey("chat-input", {
		key: "Enter",
		shift: false,
		description: "Submit message",
		preventDefault: true,
		handler: () => {
			queueMicrotask(() => handleSubmit(state.inputText))
		},
	})

	const [editorRef, setEditorRef] = createSignal<HTMLDivElement>()

	createGlobalEditorFocus({ editorRef, playSound })

	const isUploading = createMemo(() => attachments().some((att) => att.status === "uploading"))
	const successfulKeys = createMemo(() =>
		attachments()
			.filter((att) => att.status === "success" && att.key)
			.map((att) => att.key as string),
	)
	const showAttachmentArea = createMemo(() => successfulKeys().length > 0)

	async function handleSubmit(text: string) {
		if (!auth.user?.id) return

		if (isUploading()) {
			console.warn("Upload in progress. Please wait.")
			return
		}

		if (text.trim().length === 0 && successfulKeys().length === 0) return

		const content = text.trim()

		stopTyping({
			channelId: state.channelId,
		})

		createMessage({
			content: content,
			replyToMessageId: state.replyToMessageId || undefined,
			attachedFiles: successfulKeys(),
			serverId: state.serverId,
			channelId: state.channelId,
		})

		setState("replyToMessageId", null)

		setState("inputText", "")
	}

	return (
		<div>
			<Show when={showAttachmentArea()}>
				<div class="flex flex-col gap-0 rounded-sm rounded-b-none border border-border/90 border-b-0 bg-secondary/90 px-2 py-1 transition hover:border-border/90">
					<For each={attachments()}>
						{(attachment) => (
							<Attachment attachment={attachment} removeAttachment={removeAttachment} />
						)}
					</For>
				</div>
			</Show>
			<Show when={state.replyToMessageId}>
				<ReplyInfo showAttachmentArea={showAttachmentArea()} />
			</Show>
			<div
				class={twMerge(
					"group flex w-full items-start rounded-sm border border-border bg-sidebar transition duration-300 ease-in hover:border-muted-foreground/70",
				)}
			>
				<Button
					size="icon"
					class="my-3 mr-3 ml-2"
					intent="icon"
					onClick={openFileSelector}
					disabled={isUploading()}
				>
					<IconCirclePlusSolid class="size-5!" />
				</Button>

				<ChatInput
					ref={(ref) => {
						setEditorRef(ref)
					}}
					id="chat-input-editor"
					value={() => state.inputText}
					onValueChange={(value) => {
						setState("inputText", value)
					}}
				/>

				<div class="ml-auto flex flex-shrink-0 items-center gap-3 px-3">
					<input
						type="file"
						multiple
						ref={setFileInputRef}
						onChange={handleFileChange}
						accept="image/*"
						class="hidden"
						disabled={isUploading()}
					/>
				</div>
			</div>
		</div>
	)
}

function Attachment(props: { attachment: Attachment; removeAttachment: (id: string) => void }) {
	function getStatusText() {
		if (props.attachment.status === "uploading") {
			return "Uploading..."
		}
		if (props.attachment.status === "error") {
			return `${props.attachment.file.name} - Error: ${props.attachment.error?.substring(0, 30) || "Failed"}${props.attachment.error && props.attachment.error.length > 30 ? "..." : ""}`
		}
		return props.attachment.file.name
	}

	return (
		<div class="flex items-center justify-between gap-2 py-0.5">
			<div class={attachmentStatusStyles({ status: props.attachment.status })}>
				<Show when={props.attachment.status === "uploading"}>
					<IconLoader class="size-4 flex-shrink-0 animate-spin" />
				</Show>
				<Show when={props.attachment.status === "error"}>
					<IconCircleXSolid class="size-4 flex-shrink-0 text-red-500" />
				</Show>
				<span class="truncate font-medium text-sm">{getStatusText()}</span>
			</div>
			<Button size="icon" intent="icon" onClick={() => props.removeAttachment(props.attachment.id)}>
				<IconCircleXSolid class="size-4" />
			</Button>
		</div>
	)
}

function ReplyInfo(props: { showAttachmentArea: boolean }) {
	const { setState, state } = useChat()
	const replyToMessageId = createMemo(() => state.replyToMessageId!)

	const channelId = createMemo(() => state.channelId)

	const messageQuery = useQuery(() => ({
		...convexQuery(
			api.messages.getMessage,
			!replyToMessageId()
				? "skip"
				: {
						id: replyToMessageId(),
						channelId: channelId(),
						serverId: state.serverId,
					},
		),
		enabled: !!replyToMessageId(),
	}))

	createEffect(() => {
		if (messageQuery.error) {
			setState("replyToMessageId", null)
		}
	})

	return (
		<Suspense
			fallback={
				<div
					class={twMerge(
						"flex items-center justify-between gap-2 rounded-sm rounded-b-none border border-border/90 border-b-0 bg-secondary/90 px-2 py-1 text-muted-fg text-sm transition hover:border-border/90",
						props.showAttachmentArea && "rounded-t-none",
					)}
				>
					<IconLoader class="animate-spin" />
				</div>
			}
		>
			<div
				class={twMerge(
					"flex items-center justify-between gap-2 rounded-sm rounded-b-none border border-border/90 border-b-0 bg-secondary/90 px-2 py-1 text-muted-fg text-sm transition hover:border-border/90",
					props.showAttachmentArea && "rounded-t-none",
				)}
			>
				<p>
					Replying to{" "}
					<span class="font-semibold text-fg">{messageQuery.data?.author.displayName}</span>
				</p>
				<Button size="icon" intent="icon" onClick={() => setState("replyToMessageId", null)}>
					<IconCircleXSolid />
				</Button>
			</div>
		</Suspense>
	)
}

const attachmentStatusStyles = tv({
	base: "flex min-w-0 items-center gap-2",
	variants: {
		status: {
			pending: "text-muted-fg",
			uploading: "text-muted-fg",
			success: "text-fg",
			error: "text-red-500",
		},
	},
})

// Helper function to calculate distance between two points
const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
	return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Helper function to get the center point of an element
const getElementCenter = (element: Element) => {
	const rect = element.getBoundingClientRect()
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
	}
}
