import type { VariantProps } from "class-variance-authority"
import type { PlateStaticProps } from "platejs"
import { createPlateEditor, usePlateEditor } from "platejs/react"
import { BasicNodesKit } from "./editor/plugins/basic-nodes-kit"
import { EditorStatic, type editorVariants } from "./ui/editor-static"

const editor = createPlateEditor({
	plugins: [...BasicNodesKit],
})

export const MarkdownReadonly = (
	props: Omit<PlateStaticProps & VariantProps<typeof editorVariants>, "editor">,
) => {
	return <EditorStatic {...props} editor={editor}></EditorStatic>
}
