import { useAuth } from "clerk-solidjs"
import {
	type Accessor,
	For,
	type JSX,
	Show,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
} from "solid-js"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"
import { IconLoader } from "../icons/loader"
import { IconCirclePlusSolid } from "../icons/solid/circle-plus-solid"
import { IconCircleXSolid } from "../icons/solid/circle-x-solid"
import { ChatInput } from "../markdown-input/chat-input"
import { Button } from "../ui/button"

import type { MessageId } from "@maki-chat/api-schema/schema/message.js"
import { api } from "convex-hazel/_generated/api"
import type { Id } from "convex-hazel/_generated/dataModel"
import { Option } from "effect"
import {
	createMutation,
	createQuery,
	insertAtBottomIfLoaded,
	insertAtTop,
	optimisticallyUpdateValueInPaginatedQuery,
} from "~/lib/convex"
import { useChat } from "../chat-state/chat-store"
import { createPresence } from "../chat-state/create-presence"
import { setElementAnchorAndFocus } from "../markdown-input/utils"

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

		// TODO: Readd
		// const newAttachments: Attachment[] = imageFiles.map((file) => ({
		// 	id: newId("attachment"),
		// 	file: file,
		// 	status: "pending",
		// }))

		// setAttachments((prev) => [...prev, ...newAttachments])
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
				const uploadUrl = `${import.meta.env.VITE_BACKEND_URL}/upload?filename=${encodeURIComponent(
					attachment.file.name,
				)}`
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
	setInput: (value: string) => void
	input: Accessor<string>
}) => {
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

			const isPrintableKey = event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey

			if (isPrintableKey) {
				event.preventDefault()

				const content = props.input() + event.key
				props.setInput(content)

				ref.focus()

				try {
					setElementAnchorAndFocus(props.editorRef()!, {
						anchor: props.input().length,
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

	const { state, setState } = useChat()
	const { trackTyping } = createPresence()

	const currentUser = createQuery(api.me.getUser, {
		serverId: state.serverId,
	})

	const createMessage = createMutation(api.messages.createMessage).withOptimisticUpdate(
		(localStore, args) => {
			const author = currentUser()
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

	const [input, setInput] = createSignal("")
	const [editorRef, setEditorRef] = createSignal<HTMLDivElement>()

	createGlobalEditorFocus({ editorRef, setInput, input })

	const isUploading = createMemo(() => attachments().some((att) => att.status === "uploading"))
	const successfulKeys = createMemo(() =>
		attachments()
			.filter((att) => att.status === "success" && att.key)
			.map((att) => att.key as string),
	)
	const showAttachmentArea = createMemo(() => successfulKeys().length > 0)

	async function handleSubmit(text: string) {
		const userId = auth.userId()
		if (!userId) return

		setTimeout(async () => {
			if (isUploading()) {
				console.warn("Upload in progress. Please wait.")
				return
			}

			if (text.trim().length === 0 && successfulKeys().length === 0) return

			const content = text.trim()

			await createMessage({
				content: content,
				replyToMessageId: state.replyToMessageId || undefined,
				attachedFiles: successfulKeys(),
				serverId: state.serverId,
				channelId: state.channelId,
			})

			setInput("")
			setState("replyToMessageId", null)
			trackTyping(false)
		}, 0)
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
					value={input}
					onValueChange={(value) => {
						trackTyping(true)
						setInput(value)
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault()
							queueMicrotask(() => handleSubmit(input()))
						}
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

function ReplyInfo(props: {
	showAttachmentArea: boolean
}) {
	const { setState, state } = useChat()
	const replyToMessageId = createMemo(() => state.replyToMessageId!)

	const channelId = createMemo(() => state.channelId)

	const message = createQuery(api.messages.getMessage, {
		id: replyToMessageId(),
		channelId: channelId(),
		serverId: state.serverId,
	})

	return (
		<Show when={message()} keyed>
			{(message) => (
				<div
					class={twMerge(
						"flex items-center justify-between gap-2 rounded-sm rounded-b-none border border-border/90 border-b-0 bg-secondary/90 px-2 py-1 text-muted-fg text-sm transition hover:border-border/90",
						props.showAttachmentArea && "rounded-t-none",
					)}
				>
					<p>
						Replying to <span class="font-semibold text-fg">{message.author.displayName}</span>
					</p>
					<Button size="icon" intent="icon" onClick={() => setState("replyToMessageId", null)}>
						<IconCircleXSolid />
					</Button>
				</div>
			)}
		</Show>
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
