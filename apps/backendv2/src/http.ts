import { HttpLayerRouter } from "@effect/platform"
import { Layer } from "effect"
import { HazelApi } from "./api"
import { HttpAttachmentLive } from "./routes/attachments.http"
import { HttpChannelMemberLive } from "./routes/channel-members.http"
import { HttpChannelLive } from "./routes/channels.http"
import { HttpDirectMessageParticipantLive } from "./routes/direct-message-participants.http"
import { HttpInvitationLive } from "./routes/invitations.http"
import { HttpMessageReactionLive } from "./routes/message-reactions.http"
import { HttpMessageLive } from "./routes/messages.http"
import { HttpMockDataLive } from "./routes/mock-data.http"
import { HttpNotificationLive } from "./routes/notifications.http"
import { HttpOrganizationMemberLive } from "./routes/organization-members.http"
import { HttpOrganizationLive } from "./routes/organizations.http"
import { HttpPinnedMessageLive } from "./routes/pinned-messages.http"
import { HttpRootLive } from "./routes/root.http"
import { HttpUserLive } from "./routes/users.http"
import { HttpWebhookLive } from "./routes/webhooks.http"

export const HttpApiRoutes = HttpLayerRouter.addHttpApi(HazelApi, {
	openapiPath: "/docs/openapi.json",
}).pipe(
	Layer.provide(HttpRootLive),
	Layer.provide(HttpChannelLive),
	Layer.provide(HttpChannelMemberLive),
	Layer.provide(HttpMessageLive),
	Layer.provide(HttpOrganizationLive),
	Layer.provide(HttpInvitationLive),
	Layer.provide(HttpMessageReactionLive),
	Layer.provide(HttpPinnedMessageLive),
	Layer.provide(HttpNotificationLive),
	Layer.provide(HttpUserLive),
	Layer.provide(HttpOrganizationMemberLive),
	Layer.provide(HttpAttachmentLive),
	Layer.provide(HttpDirectMessageParticipantLive),
	Layer.provide(HttpWebhookLive),
	Layer.provide(HttpMockDataLive),
)
