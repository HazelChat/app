import type { Doc } from "@hazel/backend"

type AttachedFile = Doc<"messages">["attachedFiles"][number] & {
	url: string
}

export type Message = Omit<Doc<"messages">, "attachedFiles"> & {
	author: Doc<"users">
	threadMessages: (Omit<Doc<"messages">, "attachedFiles"> & { author: Doc<"users"> } & {
		attachedFiles: AttachedFile[]
	})[]
} & { attachedFiles: AttachedFile[] }
