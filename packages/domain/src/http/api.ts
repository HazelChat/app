import { HttpApi, OpenApi } from "@effect/platform"
import { AttachmentGroup } from "./attachments"
import { AuthGroup } from "./auth"
import { IncomingWebhookGroup } from "./incoming-webhooks"
import { IntegrationCommandGroup } from "./integration-commands"
import { IntegrationResourceGroup } from "./integration-resources"
import { IntegrationGroup } from "./integrations"
import { MockDataGroup } from "./mock-data"
import { PresencePublicGroup } from "./presence"
import { RootGroup } from "./root"
import { WebhookGroup } from "./webhooks"

export class HazelApi extends HttpApi.make("HazelApp")
	.add(AttachmentGroup)
	.add(PresencePublicGroup)
	.add(RootGroup)
	.add(AuthGroup)
	.add(IntegrationGroup)
	.add(IntegrationCommandGroup)
	.add(IntegrationResourceGroup)
	.add(IncomingWebhookGroup)
	.add(WebhookGroup)
	.add(MockDataGroup)
	.annotateContext(
		OpenApi.annotations({
			title: "Hazel Chat API",
			description: "API for the Hazel chat application",
			version: "1.0.0",
		}),
	) {}
