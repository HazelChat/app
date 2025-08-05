import { Image } from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyleKit } from "@tiptap/extension-text-style"
import type { Editor, EditorContentProps, EditorOptions } from "@tiptap/react"
import { EditorContent, useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import type { ComponentProps, HTMLAttributes, ReactNode, Ref } from "react"
import { createContext, useContext, useEffect, useId } from "react"
import { HintText } from "~/components/base/input/hint-text"
import { Label } from "~/components/base/input/label"
import { cx } from "~/utils/cx"
import { CharacterCount } from "./text-editor-character-count"
import { TextEditorToolbar } from "./text-editor-toolbar"
import { TextEditorTooltip } from "./text-editor-tooltip"

// Creates a data URL for an SVG resize handle with a given color.
const getResizeHandleBg = (color: string) => {
	return `url(data:image/svg+xml;base64,${btoa(`<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2L2 10" stroke="${color}" stroke-linecap="round"/><path d="M11 7L7 11" stroke="${color}" stroke-linecap="round"/></svg>`)})`
}

type EditorContextType = {
	editor: Editor
	editorId: string
	isDisabled?: boolean
	limit?: number
	isInvalid?: boolean
}

const EditorContext = createContext<EditorContextType | null>(null)

const useEditorContext = () => {
	const context = useContext(EditorContext)
	if (!context) {
		throw new Error("useEditorContext must be used within a EditorProvider")
	}
	return context
}

interface TextEditorRootProps extends Partial<Omit<EditorOptions, 'onUpdate'>> {
	className?: string
	isDisabled?: boolean
	limit?: number
	placeholder?: string
	isInvalid?: boolean
	children?: ReactNode | ((item: Editor) => ReactNode)
	inputClassName?: string
	ref?: Ref<HTMLDivElement>
	onSubmit?: (editor: Editor) => void | Promise<void>
	onUpdate?: (editor: Editor) => void
}

const TextEditorRoot = ({
	className,
	inputClassName,
	children,
	isInvalid,
	isDisabled,
	limit,
	placeholder = "Write something...",
	onSubmit,
	onUpdate,
	...editorOptions
}: TextEditorRootProps) => {
	const id = useId()
	const editorId = `editor-${id}`

	const editor = useEditor({
		...editorOptions,
		editable: !isDisabled,
		immediatelyRender: true,
		onUpdate: ({ editor }) => {
			if (onUpdate) {
				onUpdate(editor)
			}
		},
		extensions: [
			StarterKit.configure({
				blockquote: {
					HTMLAttributes: {
						class: "my-3.5 border-l-4 border-secondary pl-4",
					},
				},
				bulletList: {
					HTMLAttributes: {
						class: "list-disc ml-7",
					},
				},
				orderedList: {
					HTMLAttributes: {
						class: "list-decimal ml-7",
					},
				},
				link: {
					openOnClick: false,
					autolink: true,
					defaultProtocol: "https",
					HTMLAttributes: {
						class: "text-primary underline",
					},
				},
			}),
			TextStyleKit,
			TextAlign.configure({
				types: ["heading", "paragraph"],
			}),
			Image.configure({
				HTMLAttributes: {
					class: "my-3",
				},
			}),
			Placeholder.configure({
				placeholder: ({ node }) => {
					if (node.type.name === "bulletList" || node.type.name === "orderedList") return ""
					return placeholder
				},
				emptyEditorClass:
					"first:before:text-placeholder first:before:float-left first:before:content-[attr(data-placeholder)] first:before:pointer-events-none first:before:absolute",
			}),
			CharacterCount,
		],

		editorProps: {
			attributes: {
				id: editorId,
				"aria-labelledby": `${editorId}-label`,
				"aria-describedby": `${editorId}-hint`,
				style: `
                    --resize-handle-bg: ${getResizeHandleBg("#D5D7DA")};
                    --resize-handle-bg-dark: ${getResizeHandleBg("#373A41")};
                `,
				class: cx(
					"w-full min-h-[3rem] max-h-[18rem] scroll-py-3 overflow-y-auto rounded-lg bg-primary p-5 text-md leading-[1.5] text-primary caret-fg-brand-primary shadow-xs ring-1 ring-primary transition duration-100 ease-linear ring-inset selection:bg-fg-brand-primary/10 placeholder:text-placeholder autofill:rounded-lg autofill:text-primary focus:ring-2 focus:ring-brand focus:outline-hidden",

					isDisabled && "cursor-not-allowed bg-disabled_subtle text-disabled ring-disabled",
					isInvalid && "ring-error_subtle focus:ring-2 focus:ring-error",
					inputClassName,
				),
			},
			handleDOMEvents: {
				keydown: (_view, event) => {
					if (onSubmit && event.key === "Enter" && !event.shiftKey) {
						event.preventDefault()
						onSubmit(editor!)
						return true
					}
					return false
				},
			},
		},
	})

	useEffect(() => {
		const setLink = () => {
			if (!editor) return

			const previousUrl = editor.getAttributes("link").href
			const url = window.prompt("Please enter a link", previousUrl)

			// Cancelled.
			if (url === null) {
				return
			}

			// If empty, remove link.
			if (url === "") {
				editor.chain().focus().extendMarkRange("link").unsetLink().run()

				return
			}

			// Update link.
			editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
		}

		// Add a keyboard shortcut listener to handle link clicks
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey && event.key === "k") {
				setLink()
			}
		}

		document.addEventListener("keydown", handleKeyDown)

		return () => {
			document.removeEventListener("keydown", handleKeyDown)
		}
	}, [editor])

	if (!editor) {
		return null
	}

	return (
		<EditorContext.Provider value={{ editor, isDisabled, limit, isInvalid, editorId }}>
			<div className={cx("flex w-full flex-col gap-3", className)}>
				{typeof children === "function" ? children(editor) : children}
			</div>
		</EditorContext.Provider>
	)
}

interface TextEditorContentProps extends Omit<EditorContentProps, "editor"> {
	ref?: Ref<HTMLDivElement>
}

const TextEditorContent = ({ ...props }: TextEditorContentProps) => {
	const { editor, isDisabled } = useEditorContext()
	return <EditorContent disabled={isDisabled} {...props} editor={editor} />
}

interface TextEditorLabelProps extends ComponentProps<typeof Label> {}

const TextEditorLabel = ({ children, ...props }: TextEditorLabelProps) => {
	const { editor, editorId } = useEditorContext()

	return (
		<Label
			{...props}
			id={`${editorId}-label`}
			onClick={() => {
				editor.chain().focus().run()
			}}
		>
			{children}
		</Label>
	)
}

interface TextEditorHintTextProps extends HTMLAttributes<HTMLElement> {}

const TextEditorHintText = ({ children, ...props }: TextEditorHintTextProps) => {
	const { editor, editorId, limit, isInvalid } = useEditorContext()

	if (!children && !limit) return null

	const charactersLeft =
		typeof limit === "number" ? limit - editor.storage?.characterCount?.characters() : 0
	const exceedsLimit = charactersLeft < 0

	return (
		<HintText
			{...props}
			id={`${editorId}-hint`}
			isInvalid={isInvalid || exceedsLimit}
			className={cx(limit && "tabular-nums", props.className)}
		>
			{children ||
				`${charactersLeft.toLocaleString()} character${charactersLeft === 1 ? "" : "s"} left`}
		</HintText>
	)
}

export const TextEditor = {
	Root: TextEditorRoot,
	Toolbar: TextEditorToolbar,
	Tooltip: TextEditorTooltip,
	Content: TextEditorContent,
	Label: TextEditorLabel,
	HintText: TextEditorHintText,
}

export { useEditorContext }
