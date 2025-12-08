import { Embed as EmbedRoot } from "./embed"
import { EmbedAuthor } from "./embed-author"
import { EmbedBody } from "./embed-body"
import { EmbedConnectPrompt } from "./embed-connect-prompt"
import { EmbedError } from "./embed-error"
import { EmbedFields } from "./embed-fields"
import { EmbedFooter } from "./embed-footer"
import { EmbedImage } from "./embed-image"
import { EmbedSkeleton } from "./embed-skeleton"
import { EmbedThumbnail } from "./embed-thumbnail"

// Re-export types
export type { EmbedContainerVariants, EmbedProps, EmbedSectionVariants } from "./embed"
// Re-export styles
export { embedContainerStyles, embedSectionStyles } from "./embed"
export type { EmbedAuthorProps } from "./embed-author"
export type { EmbedBodyProps } from "./embed-body"
export type { EmbedConnectPromptProps } from "./embed-connect-prompt"
export type { EmbedErrorProps } from "./embed-error"
export type { EmbedField, EmbedFieldsProps } from "./embed-fields"
export type { EmbedFooterProps } from "./embed-footer"
export type { EmbedImageProps } from "./embed-image"
// Re-export standalone components
export { EmbedMarkdown, type EmbedMarkdownProps } from "./embed-markdown"
export type { EmbedSkeletonProps } from "./embed-skeleton"
export type { EmbedThumbnailProps } from "./embed-thumbnail"

// Re-export theme utilities
export {
	EMBED_THEMES,
	type EmbedProvider,
	type EmbedTheme,
	getEmbedTheme,
	getProviderIconUrl,
	useEmbedTheme,
} from "./use-embed-theme"

/**
 * Discord-style embed component with compound pattern.
 *
 * @example
 * ```tsx
 * <Embed accentColor="#5E6AD2" url="https://linear.app/...">
 *   <Embed.Author iconUrl={linearIcon} name="ENG-123" />
 *   <Embed.Body title="Fix login bug" description="Users cannot..." />
 *   <Embed.Fields fields={[
 *     { name: "Status", value: <Badge>In Progress</Badge>, inline: true },
 *     { name: "Assignee", value: "John", inline: true },
 *   ]} />
 *   <Embed.Footer text="linear.app" timestamp={new Date()} />
 * </Embed>
 * ```
 */
export const Embed = Object.assign(EmbedRoot, {
	Author: EmbedAuthor,
	Body: EmbedBody,
	Fields: EmbedFields,
	Footer: EmbedFooter,
	Thumbnail: EmbedThumbnail,
	Image: EmbedImage,
	Skeleton: EmbedSkeleton,
	Error: EmbedError,
	ConnectPrompt: EmbedConnectPrompt,
})
