import { OtlpTracer } from "@effect/opentelemetry"
import {
	FetchHttpClient,
	HttpApiScalar,
	HttpLayerRouter,
	HttpMiddleware,
	HttpServerResponse,
} from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { S3 } from "@effect-aws/client-s3"
import { MultipartUpload } from "@effect-aws/s3"
import { Config, Layer } from "effect"
import { HazelApi } from "./api"
import { HttpApiRoutes } from "./http"
import { AttachmentPolicy } from "./policies/attachment-policy"
import { ChannelMemberPolicy } from "./policies/channel-member-policy"
import { ChannelPolicy } from "./policies/channel-policy"
import { DirectMessageParticipantPolicy } from "./policies/direct-message-participant-policy"
import { InvitationPolicy } from "./policies/invitation-policy"
import { MessagePolicy } from "./policies/message-policy"
import { MessageReactionPolicy } from "./policies/message-reaction-policy"
import { OrganizationMemberPolicy } from "./policies/organization-member-policy"
import { OrganizationPolicy } from "./policies/organization-policy"
import { PinnedMessagePolicy } from "./policies/pinned-message-policy"
import { UserPolicy } from "./policies/user-policy"
import { AttachmentRepo } from "./repositories/attachment-repo"
import { ChannelMemberRepo } from "./repositories/channel-member-repo"
import { ChannelRepo } from "./repositories/channel-repo"
import { DirectMessageParticipantRepo } from "./repositories/direct-message-participant-repo"
import { InvitationRepo } from "./repositories/invitation-repo"
import { MessageReactionRepo } from "./repositories/message-reaction-repo"
import { MessageRepo } from "./repositories/message-repo"
import { NotificationRepo } from "./repositories/notification-repo"
import { OrganizationMemberRepo } from "./repositories/organization-member-repo"
import { OrganizationRepo } from "./repositories/organization-repo"
import { PinnedMessageRepo } from "./repositories/pinned-message-repo"
import { TypingIndicatorRepo } from "./repositories/typing-indicator-repo"
import { UserRepo } from "./repositories/user-repo"
import { AuthorizationLive } from "./services/auth"
import { DatabaseLive } from "./services/database"
import { MockDataGenerator } from "./services/mock-data-generator"
import { WorkOS } from "./services/workos"
import { WorkOSSync } from "./services/workos-sync"
import { WorkOSWebhookVerifier } from "./services/workos-webhook"

export { HazelApi }

const HealthRouter = HttpLayerRouter.use((router) =>
	router.add("GET", "/health", HttpServerResponse.text("OK")),
)

const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
	api: HazelApi,
	path: "/docs",
})

const AllRoutes = Layer.mergeAll(HttpApiRoutes, HealthRouter, DocsRoute).pipe(
	Layer.provide(
		HttpLayerRouter.cors({
			allowedOrigins: ["*"],
			allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
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
)

const PolicyLive = Layer.mergeAll(
	OrganizationPolicy.Default,
	ChannelPolicy.Default,
	MessagePolicy.Default,
	InvitationPolicy.Default,
	AttachmentPolicy.Default,
	OrganizationMemberPolicy.Default,
	ChannelMemberPolicy.Default,
	DirectMessageParticipantPolicy.Default,
	MessageReactionPolicy.Default,
	UserPolicy.Default,
	AttachmentPolicy.Default,
	PinnedMessagePolicy.Default,
	TypingIndicatorRepo.Default,
)

const MainLive = Layer.mergeAll(
	RepoLive,
	PolicyLive,
	MockDataGenerator.Default,
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
	Layer.provide(AuthorizationLive.pipe(Layer.provide(UserRepo.Default))),
	Layer.provide(BunHttpServer.layerConfig({ port: Config.number("PORT").pipe(Config.withDefault(3003)) })),
	Layer.launch,
	BunRuntime.runMain,
)
