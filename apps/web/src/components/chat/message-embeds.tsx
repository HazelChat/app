import type { Message } from "@hazel/domain/models"
import { Embed } from "~/components/embeds"

// Extract embed type from the Message model
type MessageEmbedType = NonNullable<typeof Message.Model.Type.embeds>[number]

interface MessageEmbedsProps {
	embeds: typeof Message.Model.Type.embeds
}

export function MessageEmbeds({ embeds }: MessageEmbedsProps) {
	if (!embeds?.length) return null

	return (
		<div className="mt-2 flex flex-col gap-2">
			{embeds.map((embed, index) => (
				<MessageEmbedCard key={index} embed={embed} />
			))}
		</div>
	)
}

function MessageEmbedCard({ embed }: { embed: MessageEmbedType }) {
	// Convert integer color to hex string
	const accentColor = embed.color ? `#${embed.color.toString(16).padStart(6, "0")}` : undefined

	return (
		<Embed accentColor={accentColor} url={embed.url}>
			{/* Author row */}
			{embed.author && (
				<Embed.Author iconUrl={embed.author.iconUrl} name={embed.author.name} url={embed.author.url} />
			)}

			{/* Body with thumbnail */}
			{(embed.title || embed.description) && (
				<div className="relative">
					<Embed.Body
						title={embed.title || ""}
						titleUrl={embed.url}
						description={embed.description}
						className={embed.thumbnail ? "pr-20" : undefined}
					/>
					{embed.thumbnail && <Embed.Thumbnail src={embed.thumbnail.url} />}
				</div>
			)}

			{/* Fields grid */}
			{embed.fields && embed.fields.length > 0 && (
				<Embed.Fields
					fields={embed.fields.map((f) => ({
						name: f.name,
						value: f.value,
						inline: f.inline,
					}))}
				/>
			)}

			{/* Full-width image */}
			{embed.image && <Embed.Image src={embed.image.url} />}

			{/* Footer with timestamp */}
			{(embed.footer || embed.timestamp) && (
				<Embed.Footer
					iconUrl={embed.footer?.iconUrl}
					text={embed.footer?.text}
					timestamp={embed.timestamp ? new Date(embed.timestamp) : undefined}
				/>
			)}
		</Embed>
	)
}
