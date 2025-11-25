// Types
export * from "./types"

// Components
export { AutocompleteList } from "./autocomplete-list"
export { AutocompleteListBox } from "./autocomplete-listbox"
export { EditorAutocomplete } from "./editor-autocomplete"

// Slate plugin
export {
	type AutocompleteEditor,
	cancelAutocomplete,
	DEFAULT_TRIGGERS,
	insertAutocompleteResult,
	withAutocomplete,
} from "./slate-autocomplete-plugin"

// Triggers
export { COMMANDS, CommandTrigger, getCommandById, useCommandOptions } from "./triggers/command-trigger"
export { EmojiTrigger, useEmojiOptions } from "./triggers/emoji-trigger"
export { MentionTrigger, useMentionOptions } from "./triggers/mention-trigger"

// Hooks
export { type UseEditorAutocompleteReturn, useEditorAutocomplete } from "./use-editor-autocomplete"
export { useSlateAutocomplete } from "./use-slate-autocomplete"
