# @hazel/bot-sdk

Official SDK for building bots for Hazel. Built with Effect-TS for type-safe, composable bot development with Electric SQL real-time event streaming.

## Features

- ⚡ **Real-time Events**: Subscribe to database changes via Electric SQL shape streams
- 📨 **Event Queue**: Built-in Effect.Queue for efficient event processing
- 🤖 **Event Handlers**: onMessage, onMessageUpdate, onMessageDelete, and more
- 🔐 **Secure Auth**: Bearer token authentication with Electric proxy
- 🎯 **Effect-TS**: Fully Effect-based for composability and error handling
- 📝 **TypeScript**: Complete type safety throughout

## Installation

```bash
bun add @hazel/bot-sdk
```

## Quick Start

```typescript
import { createBotRuntime, BotClient } from "@hazel/bot-sdk"
import { Effect } from "effect"

// Create bot runtime
const runtime = createBotRuntime({
	electricUrl: "http://localhost:8787/v1/shape",
	botToken: process.env.BOT_TOKEN!,
	organizationId: "org_123",
})

// Define your bot program
const program = Effect.gen(function* () {
	const bot = yield* BotClient

	// Register message handler
	yield* bot.onMessage((message) =>
		Effect.gen(function* () {
			yield* Effect.log(`Received message: ${message.content}`)

			// Echo the message back (you would use RPC client here)
			yield* Effect.log(`Would echo to channel: ${message.channelId}`)
		}),
	)

	// Start the bot
	yield* bot.start
	yield* Effect.log("Bot is running!")
})

// Run the bot
runtime.runFork(Effect.scoped(program))
```

## How It Works

The bot SDK uses **Electric SQL** to subscribe to real-time database changes and queue them for processing:

1. **Shape Streams**: Subscribe to Electric SQL shape streams (messages, channels, etc.)
2. **Event Queue**: Events are pushed to in-memory Effect queues
3. **Event Dispatcher**: Registered handlers consume events from queues
4. **Handler Execution**: Handlers run with retry logic and error handling

```
Database Changes → Electric SQL → Shape Stream → Event Queue → Your Handlers
```

## API Reference

### BotClient

Main client service that provides event subscription methods.

#### Event Handler Methods

##### `onMessage(handler: MessageHandler)`

Register a handler for new messages.

```typescript
yield* bot.onMessage((message) =>
	Effect.gen(function* () {
		yield* Effect.log("New message:", message.content)
		yield* Effect.log("Channel:", message.channelId)
		yield* Effect.log("Author:", message.authorId)
	}),
)
```

##### `onMessageUpdate(handler: MessageUpdateHandler)`

Register a handler for message updates.

```typescript
yield* bot.onMessageUpdate((message) =>
	Effect.gen(function* () {
		yield* Effect.log("Message updated:", message.id)
	}),
)
```

##### `onMessageDelete(handler: MessageDeleteHandler)`

Register a handler for message deletes.

```typescript
yield* bot.onMessageDelete((message) =>
	Effect.gen(function* () {
		yield* Effect.log("Message deleted:", message.id)
	}),
)
```

##### `onChannelCreated(handler: ChannelCreatedHandler)`

Register a handler for new channels.

```typescript
yield* bot.onChannelCreated((channel) =>
	Effect.gen(function* () {
		yield* Effect.log("New channel:", channel.name)
	}),
)
```

##### `onChannelUpdated(handler: ChannelUpdatedHandler)`

Register a handler for channel updates.

```typescript
yield* bot.onChannelUpdated((channel) =>
	Effect.gen(function* () {
		yield* Effect.log("Channel updated:", channel.id)
	}),
)
```

##### `onChannelDeleted(handler: ChannelDeletedHandler)`

Register a handler for channel deletes.

```typescript
yield* bot.onChannelDeleted((channel) =>
	Effect.gen(function* () {
		yield* Effect.log("Channel deleted:", channel.id)
	}),
)
```

##### `onChannelMemberAdded(handler: ChannelMemberAddedHandler)`

Register a handler for new channel members.

```typescript
yield* bot.onChannelMemberAdded((member) =>
	Effect.gen(function* () {
		yield* Effect.log("New member added:", member.userId)
	}),
)
```

##### `onChannelMemberRemoved(handler: ChannelMemberRemovedHandler)`

Register a handler for removed channel members.

```typescript
yield* bot.onChannelMemberRemoved((member) =>
	Effect.gen(function* () {
		yield* Effect.log("Member removed:", member.userId)
	}),
)
```

#### Control Methods

##### `start`

Start the bot client (begins listening to events).

```typescript
yield* bot.start
```

**Note**: This returns a scoped effect, so you must run it within `Effect.scoped()`.

##### `getAuthContext`

Get the bot's authentication context.

```typescript
const context = yield* bot.getAuthContext
console.log("Bot ID:", context.botId)
console.log("Organization:", context.organizationId)
```

### Configuration

#### BotConfig

Configuration for creating a bot runtime.

```typescript
import { createBotConfig } from "@hazel/bot-sdk"

const config = createBotConfig({
	// Required: Electric proxy URL
	electricUrl: "http://localhost:8787/v1/shape",

	// Required: Bot authentication token
	botToken: "bot_token_123",

	// Required: Organization ID the bot belongs to
	organizationId: "org_123",

	// Optional: Custom table subscriptions
	subscriptions: [
		{
			table: "messages",
			where: `"organizationId" = 'org_123'`,
			startFromNow: true, // Only receive new events
		},
		{
			table: "channels",
			where: `"organizationId" = 'org_123'`,
		},
	],

	// Optional: Queue configuration
	queueConfig: {
		capacity: 1000,
		backpressureStrategy: "sliding", // "drop-oldest" | "drop-newest" | "sliding"
	},

	// Optional: Dispatcher configuration
	dispatcherConfig: {
		maxRetries: 3,
		retryBaseDelay: 100, // milliseconds
	},
})
```

#### Helper Functions

##### `createBotRuntime(options)`

Simplified function to create a bot runtime.

```typescript
const runtime = createBotRuntime({
	electricUrl: "http://localhost:8787/v1/shape",
	botToken: process.env.BOT_TOKEN!,
	organizationId: "org_123",
})
```

##### `makeBotRuntime(config)`

Advanced function to create a bot runtime with full configuration.

```typescript
import { makeBotRuntime, createBotConfig } from "@hazel/bot-sdk"

const config = createBotConfig({
	electricUrl: process.env.ELECTRIC_URL!,
	botToken: process.env.BOT_TOKEN!,
	organizationId: process.env.ORG_ID!,
	queueConfig: {
		capacity: 5000,
		backpressureStrategy: "drop-oldest",
	},
})

const runtime = makeBotRuntime(config)
```

### Event Types

All event handlers receive typed data from the domain package:

```typescript
import type { Message, Channel, ChannelMember } from "@hazel/domain"

// Message events
type MessageHandler = (message: Message.Model.Json) => Effect.Effect<void, HandlerError>

// Channel events
type ChannelCreatedHandler = (channel: Channel.Model.Json) => Effect.Effect<void, HandlerError>

// Channel member events
type ChannelMemberAddedHandler = (
	member: ChannelMember.Model.Json,
) => Effect.Effect<void, HandlerError>
```

## Examples

### Echo Bot

```typescript
import { createBotRuntime, BotClient } from "@hazel/bot-sdk"
import { Effect } from "effect"

const runtime = createBotRuntime({
	electricUrl: "http://localhost:8787/v1/shape",
	botToken: process.env.BOT_TOKEN!,
	organizationId: "org_123",
})

const echoBot = Effect.gen(function* () {
	const bot = yield* BotClient

	yield* bot.onMessage((message) =>
		Effect.gen(function* () {
			// Only echo if message starts with "!echo"
			if (!message.content.startsWith("!echo ")) {
				return
			}

			const textToEcho = message.content.slice(6)
			yield* Effect.log(`Would echo: ${textToEcho}`)

			// In a real bot, you would send via RPC:
			// const rpc = yield* HazelRpcClient
			// yield* rpc("message.create", {
			//   channelId: message.channelId,
			//   content: `Echo: ${textToEcho}`
			// })
		}),
	)

	yield* bot.start
	yield* Effect.log("Echo bot is running!")
})

runtime.runFork(Effect.scoped(echoBot))
```

### Auto-Moderator Bot

```typescript
import { createBotRuntime, BotClient } from "@hazel/bot-sdk"
import { Effect } from "effect"

const runtime = createBotRuntime({
	electricUrl: process.env.ELECTRIC_URL!,
	botToken: process.env.BOT_TOKEN!,
	organizationId: process.env.ORG_ID!,
})

const moderatorBot = Effect.gen(function* () {
	const bot = yield* BotClient

	const bannedWords = ["spam", "badword"]

	yield* bot.onMessage((message) =>
		Effect.gen(function* () {
			const hasbannedWord = bannedWords.some((word) =>
				message.content.toLowerCase().includes(word),
			)

			if (hasbannedWord) {
				yield* Effect.log(`Detected banned word in message: ${message.id}`)

				// In a real bot, you would delete the message:
				// const rpc = yield* HazelRpcClient
				// yield* rpc("message.delete", { id: message.id })
			}
		}),
	)

	yield* bot.start
	yield* Effect.log("Moderator bot is running!")
})

runtime.runFork(Effect.scoped(moderatorBot))
```

### Welcome Bot

```typescript
import { createBotRuntime, BotClient } from "@hazel/bot-sdk"
import { Effect } from "effect"

const runtime = createBotRuntime({
	electricUrl: process.env.ELECTRIC_URL!,
	botToken: process.env.BOT_TOKEN!,
	organizationId: process.env.ORG_ID!,
})

const welcomeBot = Effect.gen(function* () {
	const bot = yield* BotClient

	yield* bot.onChannelMemberAdded((member) =>
		Effect.gen(function* () {
			yield* Effect.log(`New member joined: ${member.userId}`)

			// In a real bot, send a welcome message:
			// const rpc = yield* HazelRpcClient
			// yield* rpc("message.create", {
			//   channelId: member.channelId,
			//   content: `Welcome <@${member.userId}>! 👋`
			// })
		}),
	)

	yield* bot.start
	yield* Effect.log("Welcome bot is running!")
})

runtime.runFork(Effect.scoped(welcomeBot))
```

## Error Handling

The SDK provides typed errors for different failure scenarios:

```typescript
import {
	QueueError,
	ShapeStreamError,
	HandlerError,
	AuthenticationError,
	BotStartError,
} from "@hazel/bot-sdk"
import { Effect } from "effect"

const program = Effect.gen(function* () {
	const bot = yield* BotClient

	yield* bot.start.pipe(
		Effect.catchTags({
			ShapeStreamError: (error) =>
				Effect.logError(`Failed to subscribe to ${error.table}: ${error.message}`),
			AuthenticationError: (error) =>
				Effect.logError(`Auth failed: ${error.message}`),
			BotStartError: (error) => Effect.logError(`Failed to start bot: ${error.message}`),
		}),
	)
})
```

## Architecture

### Event Flow

```
1. Electric SQL detects database change
2. Shape stream broadcasts change to subscribers
3. ShapeStreamSubscriber receives change
4. Event pushed to appropriate Effect.Queue
5. EventDispatcher pulls from queue
6. Registered handlers executed in parallel
7. Failed handlers retried with exponential backoff
```

### Services

The bot SDK is composed of several Effect services:

- **ElectricEventQueue**: Manages Effect.Queue instances for each event type
- **ShapeStreamSubscriber**: Subscribes to Electric SQL shape streams
- **EventDispatcher**: Dispatches events to registered handlers
- **BotAuth**: Manages bot authentication context
- **BotClient**: Main public API for bot developers

### Queue Strategy

Events are queued with configurable backpressure strategies:

- **sliding** (default): Automatically drops oldest events when full
- **drop-oldest**: Explicitly drop oldest event when offering new one
- **drop-newest**: Ignore new events when queue is full

### Handler Execution

Handlers are executed with:

- **Parallel execution**: All registered handlers run concurrently
- **Retry logic**: Failed handlers retry with exponential backoff
- **Error isolation**: Handler errors don't crash the bot
- **Logging**: Failed handlers are logged after max retries

## Environment Variables

```bash
# Required
ELECTRIC_URL=http://localhost:8787/v1/shape
BOT_TOKEN=your_bot_token
ORG_ID=your_organization_id

# For production
ELECTRIC_URL=https://electric-proxy.example.workers.dev/v1/shape
```

## Development

### Prerequisites

- Bun runtime
- Electric SQL proxy running
- Database with Electric SQL integration
- Bot authentication token

### Testing

```bash
bun test
```

### Type Checking

```bash
bun run typecheck
```

## Roadmap

### Phase 1 (Current)

- [x] Electric SQL shape stream integration
- [x] Event queue system
- [x] Event handlers (message, channel, member)
- [x] Bearer token authentication
- [x] Retry logic with exponential backoff

### Phase 2 (Coming Soon)

- [ ] RPC client integration for sending messages
- [ ] Message operations (send, update, delete)
- [ ] Channel operations
- [ ] File upload support
- [ ] Reaction operations

### Phase 3

- [ ] Command parser utility
- [ ] Middleware system
- [ ] Rich message builder
- [ ] Rate limiting
- [ ] Metrics and observability

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## License

MIT
