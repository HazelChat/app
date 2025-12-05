import { HttpLayerRouter } from "@effect/platform"
import { Layer } from "effect"
import { HazelApi } from "./api"
import { HttpAttachmentLive } from "./routes/attachments.http"
import { HttpAuthLive } from "./routes/auth.http"
import { HttpIncomingWebhookLive } from "./routes/incoming-webhooks.http"
import { HttpIntegrationCommandLive } from "./routes/integration-commands.http"
import { HttpIntegrationResourceLive } from "./routes/integration-resources.http"
import { HttpIntegrationLive } from "./routes/integrations.http"
import { HttpMockDataLive } from "./routes/mock-data.http"
import { HttpPresencePublicLive } from "./routes/presence.http"
import { HttpRootLive } from "./routes/root.http"
import { HttpWebhookLive } from "./routes/webhooks.http"

export const HttpApiRoutes = HttpLayerRouter.addHttpApi(HazelApi).pipe(
	Layer.provide(HttpRootLive),
	Layer.provide(HttpAuthLive),
	Layer.provide(HttpIntegrationLive),
	Layer.provide(HttpIntegrationCommandLive),
	Layer.provide(HttpIntegrationResourceLive),
	Layer.provide(HttpIncomingWebhookLive),
	Layer.provide(HttpAttachmentLive),
	Layer.provide(HttpPresencePublicLive),
	Layer.provide(HttpWebhookLive),
	Layer.provide(HttpMockDataLive),
)
