import { BubbleMenu } from "@tiptap/react/menus";
import { cx } from "~/utils/cx";
import { useEditorContext } from "./text-editor";
import { TextEditorAlignCenter, TextEditorAlignLeft, TextEditorBold, TextEditorItalic, TextEditorLink, TextEditorUnderline } from "./text-editor-extensions";

interface TextEditorTooltipProps {
    className?: string;
}

export const TextEditorTooltip = ({ className }: TextEditorTooltipProps) => {
    const { editor } = useEditorContext();

    return (
        <BubbleMenu
            editor={editor}
            className={cx(
                "dark-mode z-10 flex origin-bottom flex-wrap gap-0.5 rounded-xl bg-primary p-1.5 shadow-lg ring-1 ring-secondary duration-100 animate-in fade-in ring-inset slide-in-from-bottom-0.5 zoom-in-95 md:flex-nowrap",
                className,
            )}
        >
            <TextEditorBold />
            <TextEditorItalic />
            <TextEditorUnderline />
            <TextEditorAlignLeft />
            <TextEditorAlignCenter />
            <TextEditorLink />
        </BubbleMenu>
    );
};
