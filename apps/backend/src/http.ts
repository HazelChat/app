import { HttpLayerRouter } from "@effect/platform"
import { Layer } from "effect"
import { HazelApi } from "./api"
import { HttpAttachmentLive } from "./routes/attachments.http"
import { HttpAuthLive } from "./routes/auth.http"
import { HttpChannelLive } from "./routes/channels.http"
import { HttpMockDataLive } from "./routes/mock-data.http"
import { HttpPresenceLive, HttpPresencePublicLive } from "./routes/presence.http"
import { HttpRootLive } from "./routes/root.http"
import { HttpTypingIndicatorLive } from "./routes/typing-indicators.http"
import { HttpUserLive } from "./routes/users.http"
import { HttpWebhookLive } from "./routes/webhooks.http"

export const HttpApiRoutes = HttpLayerRouter.addHttpApi(HazelApi).pipe(
	Layer.provide(HttpRootLive),
	Layer.provide(HttpAuthLive),
	Layer.provide(HttpChannelLive),
	Layer.provide(HttpUserLive),
	Layer.provide(HttpAttachmentLive),
	Layer.provide(HttpTypingIndicatorLive),
	Layer.provide(HttpPresenceLive),
	Layer.provide(HttpPresencePublicLive),
	Layer.provide(HttpWebhookLive),
	Layer.provide(HttpMockDataLive),
)
