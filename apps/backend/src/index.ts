import { OtlpTracer } from "@effect/opentelemetry"
import {
	FetchHttpClient,
	HttpApiScalar,
	HttpLayerRouter,
	HttpMiddleware,
	HttpServerResponse,
} from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { RpcSerialization, RpcServer } from "@effect/rpc"
import { S3 } from "@effect-aws/client-s3"
import { MultipartUpload } from "@effect-aws/s3"
import { Config, Layer } from "effect"
import { HazelApi } from "./api"
import { HttpApiRoutes } from "./http"
import { AttachmentPolicy } from "./policies/attachment-policy"
import { ChannelMemberPolicy } from "./policies/channel-member-policy"
import { ChannelPolicy } from "./policies/channel-policy"
import { InvitationPolicy } from "./policies/invitation-policy"
import { MessagePolicy } from "./policies/message-policy"
import { MessageReactionPolicy } from "./policies/message-reaction-policy"
import { NotificationPolicy } from "./policies/notification-policy"
import { OrganizationMemberPolicy } from "./policies/organization-member-policy"
import { OrganizationPolicy } from "./policies/organization-policy"
import { PinnedMessagePolicy } from "./policies/pinned-message-policy"
import { TypingIndicatorPolicy } from "./policies/typing-indicator-policy"
import { UserPolicy } from "./policies/user-policy"
import { UserPresenceStatusPolicy } from "./policies/user-presence-status-policy"
import { AttachmentRepo } from "./repositories/attachment-repo"
import { ChannelMemberRepo } from "./repositories/channel-member-repo"
import { ChannelRepo } from "./repositories/channel-repo"
import { InvitationRepo } from "./repositories/invitation-repo"
import { MessageReactionRepo } from "./repositories/message-reaction-repo"
import { MessageRepo } from "./repositories/message-repo"
import { NotificationRepo } from "./repositories/notification-repo"
import { OrganizationMemberRepo } from "./repositories/organization-member-repo"
import { OrganizationRepo } from "./repositories/organization-repo"
import { PinnedMessageRepo } from "./repositories/pinned-message-repo"
import { TypingIndicatorRepo } from "./repositories/typing-indicator-repo"
import { UserPresenceStatusRepo } from "./repositories/user-presence-status-repo"
import { UserRepo } from "./repositories/user-repo"

import { AllRpcs, RpcServerLive } from "./rpc/server"
import { AuthorizationLive } from "./services/auth"
import { DatabaseLive } from "./services/database"
import { MockDataGenerator } from "./services/mock-data-generator"
import { SessionManager } from "./services/session-manager"
import { WorkOS } from "./services/workos"
import { WorkOSSync } from "./services/workos-sync"
import { WorkOSWebhookVerifier } from "./services/workos-webhook"

export { HazelApi }

// Export RPC groups for frontend consumption
export { InvitationRpcs } from "./rpc/groups/invitations"
export { MessageRpcs } from "./rpc/groups/messages"
export { NotificationRpcs } from "./rpc/groups/notifications"
export { AuthMiddleware } from "./rpc/middleware/auth"

const HealthRouter = HttpLayerRouter.use((router) =>
	router.add("GET", "/health", HttpServerResponse.text("OK")),
)

const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
	api: HazelApi,
	path: "/docs",
})

const RpcRoute = RpcServer.layerHttpRouter({
	group: AllRpcs,
	path: "/rpc",
	protocol: "http",
}).pipe(Layer.provide(RpcSerialization.layerJson), Layer.provide(RpcServerLive))

const AllRoutes = Layer.mergeAll(HttpApiRoutes, HealthRouter, DocsRoute, RpcRoute).pipe(
	Layer.provide(
		HttpLayerRouter.cors({
			allowedOrigins: ["http://localhost:3000", "https://app.hazel.sh"],
			allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	),
)

const TracerLive = OtlpTracer.layer({
	url: "http://localhost:4318/v1/traces",
	resource: {
		serviceName: "hazel-backend",
	},
}).pipe(Layer.provide(FetchHttpClient.layer))

const RepoLive = Layer.mergeAll(
	MessageRepo.Default,
	ChannelRepo.Default,
	ChannelMemberRepo.Default,
	UserRepo.Default,
	OrganizationRepo.Default,
	OrganizationMemberRepo.Default,
	InvitationRepo.Default,
	PinnedMessageRepo.Default,
	AttachmentRepo.Default,
	NotificationRepo.Default,
	TypingIndicatorRepo.Default,
	MessageReactionRepo.Default,
	UserPresenceStatusRepo.Default,
)

const PolicyLive = Layer.mergeAll(
	OrganizationPolicy.Default,
	ChannelPolicy.Default,
	MessagePolicy.Default,
	InvitationPolicy.Default,
	AttachmentPolicy.Default,
	OrganizationMemberPolicy.Default,
	ChannelMemberPolicy.Default,
	MessageReactionPolicy.Default,
	UserPolicy.Default,
	AttachmentPolicy.Default,
	PinnedMessagePolicy.Default,
	TypingIndicatorPolicy.Default,
	NotificationPolicy.Default,
	UserPresenceStatusPolicy.Default,
)

const MainLive = Layer.mergeAll(
	RepoLive,
	PolicyLive,
	MockDataGenerator.Default,
	SessionManager.Default,
	WorkOS.Default,
	WorkOSSync.Default,
	WorkOSWebhookVerifier.Default,
	DatabaseLive,
	MultipartUpload.layerWithoutS3Service,
).pipe(
	Layer.provide(
		S3.layer({
			region: "auto",
			endpoint: process.env.R2_ENDPOINT!,
			credentials: {
				accessKeyId: process.env.R2_ACCESS_KEY_ID!,
				secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
			},
		}),
	),
)

HttpLayerRouter.serve(AllRoutes).pipe(
	HttpMiddleware.withTracerDisabledWhen(
		(request) => request.url === "/health" || request.method === "OPTIONS",
	),
	Layer.provide(MainLive),
	Layer.provide(TracerLive),
	Layer.provide(
		AuthorizationLive.pipe(
			Layer.provideMerge(SessionManager.Default),
			Layer.provideMerge(UserRepo.Default),
			Layer.provideMerge(WorkOS.Default),
		),
	),
	Layer.provide(
		BunHttpServer.layerConfig(
			Config.all({
				port: Config.number("PORT").pipe(Config.withDefault(3003)),
				idleTimeout: Config.succeed(120),
			}),
		),
	),
	Layer.launch,
	BunRuntime.runMain,
)
