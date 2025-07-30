// This extension is a modified version of the original character count extension.
// It removes the limit and trim functionality and only counts characters and words.
//
// SOURCE: https://tiptap.dev/api/extensions/character-count
import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

interface CharacterCountOptions {
    /**
     * The mode by which the size is calculated. If set to `textSize`, the textContent of the document is used.
     * If set to `nodeSize`, the nodeSize of the document is used.
     * @default 'textSize'
     * @example 'textSize'
     */
    mode: "textSize" | "nodeSize";
    /**
     * The text counter function to use. Defaults to a simple character count.
     * @default (text) => text.length
     * @example (text) => [...new Intl.Segmenter().segment(text)].length
     */
    textCounter: (text: string) => number;
    /**
     * The word counter function to use. Defaults to a simple word count.
     * @default (text) => text.split(' ').filter(word => word !== '').length
     * @example (text) => text.split(/\s+/).filter(word => word !== '').length
     */
    wordCounter: (text: string) => number;
}

interface CharacterCountStorage {
    /**
     * Get the number of characters for the current document.
     * @param options The options for the character count. (optional)
     * @param options.node The node to get the characters from. Defaults to the current document.
     * @param options.mode The mode by which the size is calculated. If set to `textSize`, the textContent of the document is used.
     */
    characters: (options?: { node?: ProseMirrorNode; mode?: "textSize" | "nodeSize" }) => number;

    /**
     * Get the number of words for the current document.
     * @param options The options for the character count. (optional)
     * @param options.node The node to get the words from. Defaults to the current document.
     */
    words: (options?: { node?: ProseMirrorNode }) => number;
}

/**
 * This extension allows you to count the characters and words of your document.
 * @see https://tiptap.dev/api/extensions/character-count
 */
export const CharacterCount = Extension.create<CharacterCountOptions, CharacterCountStorage>({
    name: "characterCount",

    addOptions() {
        return {
            limit: null,
            mode: "textSize",
            textCounter: (text) => text.length,
            wordCounter: (text) => text.split(" ").filter((word) => word !== "").length,
        };
    },

    addStorage() {
        return {
            characters: () => 0,
            words: () => 0,
        };
    },

    onBeforeCreate() {
        this.storage.characters = (options) => {
            const node = options?.node || this.editor.state.doc;
            const mode = options?.mode || this.options.mode;

            if (mode === "textSize") {
                const text = node.textBetween(0, node.content.size, undefined, " ");

                return this.options.textCounter(text);
            }

            return node.nodeSize;
        };

        this.storage.words = (options) => {
            const node = options?.node || this.editor.state.doc;
            const text = node.textBetween(0, node.content.size, " ", " ");

            return this.options.wordCounter(text);
        };
    },
});
