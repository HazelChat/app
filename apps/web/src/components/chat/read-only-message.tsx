import {
	BlockquotePlugin,
	BoldPlugin,
	CodePlugin,
	H1Plugin,
	H2Plugin,
	H3Plugin,
	ItalicPlugin,
	LinkPlugin,
	ListPlugin,
	ParagraphPlugin,
	StrikethroughPlugin,
	UnderlinePlugin,
} from "platejs"
import { Plate, PlateContent, usePlateEditor } from "platejs/react"
import type { ComponentProps, HTMLAttributes, ReactNode, Ref } from "react"
import { createContext, useContext, useEffect, useId } from "react"
import { HintText } from "~/components/base/input/hint-text"
import { Label } from "~/components/base/input/label"
import { cx } from "~/utils/cx"

type EditorContextType = {
	editor: any
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

interface TextEditorRootProps {
	className?: string
	limit?: number
	placeholder?: string
	children?: ReactNode | ((item: any) => ReactNode)
	inputClassName?: string
	ref?: Ref<HTMLDivElement>
	content?: any
	editable?: boolean
	onCreate?: (editor: any) => void
	onUpdate?: (editor: any) => void
}

const TextEditorRoot = ({
	className,
	children,
	limit,
	placeholder = "Write something...",
	content,
	editable = false,
	onCreate,
	onUpdate,
}: TextEditorRootProps) => {
	const id = useId()
	const editorId = `editor-${id}`

	const editor = usePlateEditor(
		{
			editor: {
				editable,
			},
			value: content,
			plugins: [
				ParagraphPlugin,
				BoldPlugin,
				ItalicPlugin,
				UnderlinePlugin,
				StrikethroughPlugin,
				CodePlugin,
				BlockquotePlugin.configure({
					node: {
						props: {
							className: "my-3.5 border-l-4 border-secondary pl-4",
						},
					},
				}),
				H1Plugin,
				H2Plugin,
				H3Plugin,
				ListPlugin.configure({
					options: {
						bulletList: {
							props: {
								className: "list-disc ml-7",
							},
						},
						orderedList: {
							props: {
								className: "list-decimal ml-7",
							},
						},
					},
				}),
				LinkPlugin.configure({
					node: {
						props: {
							className: "text-primary underline cursor-pointer",
						},
					},
				}),
			],
		},
		[content],
	)

	// Update editor content when the content prop changes
	useEffect(() => {
		if (editor && content) {
			editor.tf.reset()
			editor.children = content
		}
	}, [editor, content])

	// Call onCreate when editor is ready
	useEffect(() => {
		if (editor && onCreate) {
			onCreate(editor)
		}
	}, [editor, onCreate])

	// Call onUpdate when editor changes
	useEffect(() => {
		if (editor && onUpdate) {
			onUpdate(editor)
		}
	}, [editor, onUpdate])

	if (!editor) {
		return null
	}

	return (
		<EditorContext.Provider value={{ editor, limit, editorId }}>
			<div className={cx("flex w-full flex-col gap-3", className)}>
				<Plate editor={editor}>{typeof children === "function" ? children(editor) : children}</Plate>
			</div>
		</EditorContext.Provider>
	)
}

interface TextEditorContentProps {
	ref?: Ref<HTMLDivElement>
	className?: string
}

const TextEditorContent = ({ className, ...props }: TextEditorContentProps) => {
	const { isDisabled } = useEditorContext()
	return (
		<PlateContent
			{...props}
			className={cx(
				"w-full overflow-y-auto text-md text-primary leading-[1.5] caret-fg-brand-primary shadow-xs ring-inset transition duration-100 ease-linear selection:bg-fg-brand-primary/10 placeholder:text-placeholder autofill:rounded-lg autofill:text-primary focus:outline-hidden focus:ring-2 focus:ring-brand",
				className,
			)}
			disabled={isDisabled}
		/>
	)
}

interface TextEditorLabelProps extends ComponentProps<typeof Label> {}

const TextEditorLabel = ({ children, ...props }: TextEditorLabelProps) => {
	const { editor, editorId } = useEditorContext()

	return (
		<Label
			{...props}
			id={`${editorId}-label`}
			onClick={() => {
				if (editor) {
					editor.tf.focus()
				}
			}}
		>
			{children}
		</Label>
	)
}

interface TextEditorHintTextProps extends HTMLAttributes<HTMLElement> {}

const TextEditorHintText = ({ children, ...props }: TextEditorHintTextProps) => {
	const { editorId, limit, isInvalid } = useEditorContext()

	if (!children && !limit) return null

	// For now, we don't have character count in Plate, so default to 0
	const charactersLeft = typeof limit === "number" ? limit : 0
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
	Content: TextEditorContent,
	Label: TextEditorLabel,
	HintText: TextEditorHintText,
}

export { useEditorContext }
