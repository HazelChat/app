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
                "dark-mode fade-in slide-in-from-bottom-0.5 zoom-in-95 z-10 flex origin-bottom animate-in flex-wrap gap-0.5 rounded-xl bg-primary p-1.5 shadow-lg ring-1 ring-secondary ring-inset duration-100 md:flex-nowrap",
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
