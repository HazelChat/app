import { HttpLayerRouter } from "@effect/platform"
import { Layer } from "effect"
import { HazelApi } from "./api"
import { HttpChannelLive } from "./routes/channels.http"
import { HttpMessageLive } from "./routes/messages.http"
import { HttpMockDataLive } from "./routes/mock-data.http"
import { HttpRootLive } from "./routes/root.http"
import { HttpWebhookLive } from "./routes/webhooks.http"

export const HttpApiRoutes = HttpLayerRouter.addHttpApi(HazelApi, {
	openapiPath: "/docs/openapi.json",
}).pipe(
	Layer.provide(HttpRootLive),
	Layer.provide(HttpChannelLive),
	Layer.provide(HttpMessageLive),
	Layer.provide(HttpWebhookLive),
	Layer.provide(HttpMockDataLive),
)
