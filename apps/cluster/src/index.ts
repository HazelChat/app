import { ClusterWorkflowEngine } from "@effect/cluster"
import {
	FetchHttpClient,
	HttpApi,
	HttpApiBuilder,
	HttpApiClient,
	HttpApiEndpoint,
	HttpApiGroup,
	HttpMiddleware,
	HttpServer,
} from "@effect/platform"
import { BunClusterSocket, BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { PgClient } from "@effect/sql-pg"
import { Workflow, WorkflowProxy, WorkflowProxyServer } from "@effect/workflow"
import { Effect, Layer, Logger, Redacted, Schema } from "effect"

const EmailWorkflow = Workflow.make({
	name: "EmailWorkflow",
	payload: {
		id: Schema.String,
		to: Schema.String,
	},
	idempotencyKey: ({ id }) => id,
})

const workflows = [EmailWorkflow] as const

export class WorkflowApi extends HttpApi.make("api")
	.add(WorkflowProxy.toHttpApiGroup("workflows", workflows))
	.add(HttpApiGroup.make("health").add(HttpApiEndpoint.get("ok")`/health`.addSuccess(Schema.String))) {}

const WorkflowEngineLayer = ClusterWorkflowEngine.layer.pipe(
	Layer.provideMerge(BunClusterSocket.layer()),
	Layer.provideMerge(
		PgClient.layer({
			database: "postgres",
			username: "user",
			password: Redacted.make("password"),
			port: 5432,
			host: "postgres.app.orb.local",
		}),
	),
)

const HealthLive = HttpApiBuilder.group(WorkflowApi, "health", (handlers) =>
	handlers.handle("ok", () => Effect.succeed("ok")),
)

const WorkflowApiLive = HttpApiBuilder.api(WorkflowApi).pipe(
	Layer.provide(WorkflowProxyServer.layerHttpApi(WorkflowApi, "workflows", workflows)),
	Layer.provide(HealthLive),
	HttpServer.withLogAddress,
)

const port = 3020

const ServerLayer = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
	Layer.provide(WorkflowApiLive),
	Layer.provide(Logger.pretty),
	Layer.provide(BunHttpServer.layer({ port })),
	Layer.provide(FetchHttpClient.layer),
)

ServerLayer.pipe(Layer.provide(WorkflowEngineLayer)).pipe(Layer.launch, BunRuntime.runMain)

export class WorkflowClient extends Effect.Service<WorkflowClient>()("WorkflowClient", {
	dependencies: [FetchHttpClient.layer],
	effect: HttpApiClient.make(WorkflowApi, {
		baseUrl: `http://localhost:3020`,
	}),
}) {}
