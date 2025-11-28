import { HttpApi, OpenApi } from "@effect/platform"
import { AttachmentGroup } from "./attachments"
import { AuthGroup } from "./auth"
import { MessageHttpGroup } from "./messages"
import { MockDataGroup } from "./mock-data"
import { PresencePublicGroup } from "./presence"
import { RootGroup } from "./root"
import { WebhookGroup } from "./webhooks"

export class HazelApi extends HttpApi.make("HazelApp")
	.add(AttachmentGroup)
	.add(PresencePublicGroup)
	.add(RootGroup)
	.add(AuthGroup)
	.add(MessageHttpGroup)
	.add(WebhookGroup)
	.add(MockDataGroup)
	.annotateContext(
		OpenApi.annotations({
			title: "Hazel Chat API",
			description: "API for the Hazel chat application",
			version: "1.0.0",
		}),
	) {}
