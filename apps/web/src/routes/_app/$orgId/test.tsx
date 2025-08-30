import { useLiveQuery } from "@tanstack/react-db"
import { createFileRoute, useParams } from "@tanstack/react-router"
import { Button } from "~/components/base/buttons/button"
import { messageCollection } from "~/db/collections"

export const Route = createFileRoute("/_app/$orgId/test")({
	component: RouteComponent,
})

function RouteComponent() {
	const { data } = useLiveQuery((q) => q.from({ messages: messageCollection }))

	const addMessage = () => {
		messageCollection.insert({
			id: crypto.randomUUID(),
			channelId: crypto.randomUUID(),
			content: "XD",
			replyToMessageId: null,
			threadChannelId: null,
		})
	}

	return (
		<div>
			{data.map((message, length) => (
				<div key={message.id}>{length}</div>
			))}
			<Button onClick={() => addMessage()}>Send</Button>
		</div>
	)
}
