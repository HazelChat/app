import { ClusterWorkflowEngine } from "@effect/cluster"
import { FetchHttpClient, HttpApiBuilder, HttpMiddleware, HttpServer } from "@effect/platform"
import { BunClusterSocket, BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { PgClient } from "@effect/sql-pg"
import { WorkflowProxyServer } from "@effect/workflow"
import { Database } from "@hazel/db"
import { Cluster } from "@hazel/domain"
import { Effect, Layer, Logger, Redacted } from "effect"
import { MessageNotificationWorkflowLayer } from "./workflows/index.ts"

// PostgreSQL configuration (uses existing database)
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

// Database layer for Drizzle ORM (uses same credentials as PgClient)
const DatabaseLayer = Database.layer({
	url: Redacted.make(process.env.DATABASE_URL as string)!,
	ssl: true,
})

// Health check endpoint
const HealthLive = HttpApiBuilder.group(Cluster.WorkflowApi, "health", (handlers) =>
	handlers.handle("ok", () => Effect.succeed("ok")),
)

const AllWorkflows = MessageNotificationWorkflowLayer.pipe(Layer.provide(DatabaseLayer))

// Workflow API implementation
const WorkflowApiLive = HttpApiBuilder.api(Cluster.WorkflowApi).pipe(
	Layer.provide(WorkflowProxyServer.layerHttpApi(Cluster.WorkflowApi, "workflows", Cluster.workflows)),
	Layer.provide(HealthLive),
	HttpServer.withLogAddress,
)

const port = 3020

// Main server layer with CORS enabled
const ServerLayer = HttpApiBuilder.serve(
	HttpMiddleware.cors({
		allowedOrigins: ["http://localhost:3000", "https://app.hazel.sh"],
		credentials: true,
	}),
).pipe(
	Layer.provide(WorkflowApiLive),
	Layer.provide(AllWorkflows),
	Layer.provide(Logger.pretty),
	Layer.provide(BunHttpServer.layer({ port })),
	Layer.provide(FetchHttpClient.layer),
)

Layer.launch(ServerLayer.pipe(Layer.provide(WorkflowEngineLayer))).pipe(BunRuntime.runMain)
