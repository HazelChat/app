import { useAuth } from "clerk-solidjs"
import { For, type JSX, Show, Suspense, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { twMerge } from "tailwind-merge"
import { tv } from "tailwind-variants"
import { IconLoader } from "../icons/loader"
import { IconCirclePlusSolid } from "../icons/solid/circle-plus-solid"
import { IconCircleXSolid } from "../icons/solid/circle-x-solid"
import { IconDocument } from "../icons/document"
import { ChatInput } from "../markdown-input/chat-input"
import { Button } from "../ui/button"

import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { createMutation, insertAtTop } from "~/lib/convex"
import { convexQuery } from "~/lib/convex-query"
import { useChat } from "../chat-state/chat-store"
import { createPresence } from "../chat-state/create-presence"
import { setElementAnchorAndFocus } from "../markdown-input/utils"
import { useUploadFile } from "~/lib/convex-r2"

const createGlobalEditorFocus = (props: {
	editorRef: () => HTMLDivElement | undefined
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

type Attachment = {
	id: string
	file: File
	status: "uploading" | "success" | "error"
	key?: string // Server-generated key after successful upload
	error?: string // Error message on failure
}

export function FloatingBar() {
	const auth = useAuth()

	const { state, setState } = useChat()
	const { trackTyping } = createPresence()

	const meQuery = useQuery(() => ({
		...convexQuery(api.me.getUser, { serverId: state.serverId }),
	}))

	const uploadFile = useUploadFile(api.attachments)
	const [selectedFiles, setSelectedFiles] = createSignal<Attachment[]>([])

	const handleFileChange = async (e: Event) => {
		const file = (e.target as HTMLInputElement).files?.[0]
		if (file) {
			const id = crypto.randomUUID()
			setSelectedFiles([
				...selectedFiles(),
				{
					id,
					file,
					status: "uploading",
				},
			])
			// // Sleep 3 seconds
			// await new Promise((resolve) => setTimeout(resolve, 500))

			uploadFile(file)
				.then((key) => {
					setSelectedFiles(
						selectedFiles().map((attachment) => {
							if (attachment.id === id) {
								return { ...attachment, key, status: "success" }
							}
							return attachment
						}),
					)
				})
				.catch((error) => {
					setSelectedFiles(
						selectedFiles().map((attachment) => {
							if (attachment.id === id) {
								return { ...attachment, status: "error", error: error.message }
							}
							return attachment
						}),
					)
				})
		}
	}

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
					// TODO: handle url somehow
					attachedFiles: args.attachedFiles.map((file) => ({
						...file,
						url: "",
					})),
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

	const [editorRef, setEditorRef] = createSignal<HTMLDivElement>()
	const [fileInputRef, setFileInputRef] = createSignal<HTMLInputElement>()

	createGlobalEditorFocus({ editorRef })

	async function handleSubmit(text: string) {
		const userId = auth.userId()
		if (!userId) return

		console.log(selectedFiles())

		if (text.trim().length === 0) return
		if (selectedFiles().some((file) => file.status === "uploading")) return

		const successFiles = selectedFiles().filter((file) => file.status === "success")

		const content = text.trim()

		createMessage({
			content: content,
			replyToMessageId: state.replyToMessageId || undefined,
			attachedFiles: successFiles.map((file) => ({
				key: file.key!,
				fileName: file.file.name,
			})),
			serverId: state.serverId,
			channelId: state.channelId,
		})

		setState("replyToMessageId", null)
		setSelectedFiles([])
		if (fileInputRef()) {
			fileInputRef()!.value = ""
		}

		setState("inputText", "")
		trackTyping(false)
	}

	return (
		<div>
			<Show when={selectedFiles().length > 0}>
				<div class="flex flex-wrap gap-2 rounded-sm rounded-b-none border border-border/90 border-b-0 bg-secondary/90 p-3 transition hover:border-border/90">
					<For each={selectedFiles()}>
						{(attachment) => (
							<AttachmentPreview
								attachment={attachment}
								onRemove={() => {
									setSelectedFiles(selectedFiles().filter((f) => f.id !== attachment.id))
								}}
							/>
						)}
					</For>
				</div>
			</Show>
			<Show when={state.replyToMessageId}>
				<ReplyInfo showAttachmentArea={selectedFiles().length > 0} />
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
					onClick={() => {
						const fileInput = document.querySelector('input[type="file"]')
						if (fileInput) {
							;(fileInput as HTMLInputElement).click()
						}
					}}
					disabled={selectedFiles().some((file) => file.status === "uploading")}
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
						trackTyping(true)
						setState("inputText", value)
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault()
							queueMicrotask(() => handleSubmit(state.inputText))
						}
					}}
				/>

				<div class="ml-auto flex flex-shrink-0 items-center gap-3 px-3">
					<input
						type="file"
						multiple
						onChange={handleFileChange}
						ref={setFileInputRef}
						accept="image/*"
						class="hidden"
						// disabled={isUploading()}
					/>
				</div>
			</div>
		</div>
	)
}

function ReplyInfo(props: {
	showAttachmentArea: boolean
}) {
	const { setState, state } = useChat()
	const replyToMessageId = createMemo(() => state.replyToMessageId!)

	const channelId = createMemo(() => state.channelId)

	const messageQuery = useQuery(() => ({
		...convexQuery(api.messages.getMessage, {
			id: replyToMessageId(),
			channelId: channelId(),
			serverId: state.serverId,
		}),
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

function AttachmentPreview(props: {
	attachment: Attachment
	onRemove: () => void
}) {
	const isImage = () => props.attachment.file.type.startsWith("image/")
	const [imageUrl, setImageUrl] = createSignal<string>()

	createEffect(() => {
		if (isImage()) {
			const url = URL.createObjectURL(props.attachment.file)
			setImageUrl(url)
			onCleanup(() => URL.revokeObjectURL(url))
		}
	})

	return (
		<div class="group relative pb-6">
			<div
				class={twMerge(
					"flex h-20 w-20 items-center justify-center rounded-lg border-2 transition-colors",
					props.attachment.status === "uploading" && "border-muted-foreground/50 bg-muted/50",
					props.attachment.status === "success" && "border-green-500/50 bg-green-50/50",
					props.attachment.status === "error" && "border-red-500/50 bg-red-50/50",
				)}
			>
				<Show
					when={isImage() && imageUrl()}
					fallback={
						<div class="flex flex-col items-center gap-1">
							<IconDocument class="h-8 w-8 text-muted-foreground" />
							<span class="w-full truncate px-1 text-center text-muted-foreground text-xs">
								{props.attachment.file.name.split(".").pop()?.toUpperCase()}
							</span>
						</div>
					}
				>
					<img
						src={imageUrl()}
						alt={props.attachment.file.name}
						class="h-full w-full rounded-md object-cover"
					/>
				</Show>

				<Show when={props.attachment.status === "uploading"}>
					<div class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
						<IconLoader class="h-4 w-4 animate-spin text-white" />
					</div>
				</Show>
			</div>

			<Button
				size="icon"
				intent="icon"
				class="-right-2 -top-2 absolute h-6 w-6 rounded-full bg-red-500 opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
				onClick={props.onRemove}
			>
				<IconCircleXSolid class="h-4 w-4 text-white" />
			</Button>

			<div class="absolute right-0 bottom-0 left-0 text-center">
				<span class="block truncate px-1 text-muted-foreground text-xs">
					{props.attachment.file.name}
				</span>
			</div>
		</div>
	)
}
