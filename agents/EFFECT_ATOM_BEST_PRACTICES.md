# Effect Atom Best Practices

A comprehensive guide to using `@effect-atom/atom-react` for reactive state management in Effect-based applications.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Creating Atoms](#creating-atoms)
3. [React Integration](#react-integration)
4. [Working with Effects](#working-with-effects)
5. [Derived State](#derived-state)
6. [Atom Families](#atom-families)
7. [Integration Patterns](#integration-patterns)
8. [Performance Optimization](#performance-optimization)
9. [Common Patterns](#common-patterns)
10. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

## Core Concepts

Effect Atom is a reactive state management library that integrates seamlessly with Effect-TS. It provides:

- **Atoms**: Reactive state containers that automatically track dependencies
- **Result Type**: Handles async/effectful computations with loading, success, and failure states
- **Automatic Cleanup**: Built-in finalizers for resource management
- **Type Safety**: Full TypeScript support with Effect's type system

## Creating Atoms

### Basic Atoms

Use `Atom.make` to create a simple reactive state container:

```tsx
import { Atom } from "@effect-atom/atom-react"

// Simple value atom
const countAtom = Atom.make(0)

// Atom with keepAlive to persist state when unmounted
const persistentCountAtom = Atom.make(0).pipe(Atom.keepAlive)
```

**Best Practice:** Use `Atom.keepAlive` for global state that should persist across component lifecycles.

### Atoms with Side Effects

Atoms can manage side effects like event listeners:

```tsx
// Track window scroll position
const scrollYAtom = Atom.make((get) => {
	const onScroll = () => {
		get.setSelf(window.scrollY)
	}

	window.addEventListener("scroll", onScroll)
	get.addFinalizer(() => window.removeEventListener("scroll", onScroll))

	return window.scrollY
})
```

**Key Points:**
- Use `get.setSelf` to update the atom's own value
- Always add finalizers to clean up side effects
- Finalizers run when the atom is rebuilt or no longer needed

### Atoms with Resources

For managing resources like audio elements:

```tsx
const audioElementAtom = Atom.make<HTMLAudioElement | null>((get) => {
	const settings = get(settingsAtom)
	if (typeof window === "undefined") return null

	const audio = new Audio(`/sounds/${settings.soundFile}.mp3`)
	audio.volume = settings.volume

	get.addFinalizer(() => {
		audio.pause()
		audio.src = ""
	})

	return audio
}).pipe(Atom.keepAlive)
```

**From:** `apps/web/src/hooks/use-notification-sound.tsx:38`

## React Integration

### Reading Atom Values

Use `useAtomValue` to read atom state:

```tsx
import { useAtomValue } from "@effect-atom/atom-react"

function Counter() {
	const count = useAtomValue(countAtom)
	return <h1>{count}</h1>
}
```

### Updating Atom Values

Use `useAtomSet` to get a setter function:

```tsx
import { useAtomSet } from "@effect-atom/atom-react"

function CounterButton() {
	const setCount = useAtomSet(countAtom)
	return (
		<button onClick={() => setCount((count) => count + 1)}>
			Increment
		</button>
	)
}
```

### Reading and Writing Together

Use `useAtom` when you need both:

```tsx
import { useAtom } from "@effect-atom/atom-react"

function CounterControl() {
	const [count, setCount] = useAtom(countAtom)
	return (
		<div>
			<p>Count: {count}</p>
			<button onClick={() => setCount(count + 1)}>+1</button>
		</div>
	)
}
```

### Mounting Side-Effect Atoms

Use `useAtomMount` to mount atoms that perform side effects without reading their value:

```tsx
import { useAtomMount } from "@effect-atom/atom-react"

function ThemeProvider({ children }) {
	// Mount the atom to activate side effects
	useAtomMount(applyThemeAtom)
	useAtomMount(applyBrandColorAtom)

	return <>{children}</>
}
```

**From:** `apps/web/src/components/theme-provider.tsx:108`

## Working with Effects

### Effectful Atoms Return Results

When atoms use Effects, they return a `Result` type:

```tsx
import { Atom, Result } from "@effect-atom/atom-react"
import { Effect } from "effect"

const userAtom: Atom<Result<User>> = Atom.make(
	Effect.gen(function* () {
		const response = yield* fetchUser()
		return response
	})
)
```

### Handling Result Types

Use `Result` utilities to handle different states:

```tsx
import { Result } from "@effect-atom/atom-react"

function UserProfile() {
	const userResult = useAtomValue(userAtom)

	return Result.match(userResult, {
		onInitial: () => <div>Loading...</div>,
		onFailure: (error) => <div>Error: {Cause.pretty(error.cause)}</div>,
		onSuccess: (user) => <div>Hello, {user.name}!</div>,
	})
}
```

**Alternative:** Use `Result.getOrElse` for default values:

```tsx
const user = Result.getOrElse(userResult, () => null)
```

### Accessing Result Values in Atoms

Use `get.result` to unwrap Result values inside effectful atoms:

```tsx
const userProfileAtom = Atom.make(
	Effect.fnUntraced(function* (get: Atom.Context) {
		const user = yield* get.result(userAtom)
		const posts = yield* fetchUserPosts(user.id)
		return { user, posts }
	})
)
```

## Derived State

### Using get Function

Create derived state by reading other atoms:

```tsx
const countAtom = Atom.make(0)

// Derived atom using get function
const doubleCountAtom = Atom.make((get) => get(countAtom) * 2)
```

### Using Atom.map

For simple transformations:

```tsx
const tripleCountAtom = Atom.map(countAtom, (count) => count * 3)
```

### Using Atom.transform

For atoms that need to update themselves based on other atoms:

```tsx
export const resolvedThemeAtom = Atom.transform(themeAtom, (get) => {
	const theme = get(themeAtom)
	if (theme !== "system") return theme

	const matcher = window.matchMedia("(prefers-color-scheme: dark)")

	matcher.addEventListener("change", onChange)
	get.addFinalizer(() => matcher.removeEventListener("change", onChange))

	return matcher.matches ? "dark" : "light"

	function onChange() {
		get.setSelf(matcher.matches ? "dark" : "light")
	}
})
```

**From:** `apps/web/src/components/theme-provider.tsx:50`

### Complex Derived State

Combine multiple atoms and Results:

```tsx
export const processedMessagesByChannelAtomFamily = Atom.family((channelId: ChannelId) =>
	Atom.make((get) => {
		// Read from another atom
		const messagesResult = get(messagesByChannelAtomFamily(channelId))
		const messages = Result.getOrElse(messagesResult, () => [])

		// Process and return derived data
		return messages.map((message, index) => ({
			message,
			isGroupStart: /* logic */,
			isGroupEnd: /* logic */,
		}))
	})
)
```

**From:** `apps/web/src/atoms/chat-query-atoms.ts:71`

## Atom Families

Use `Atom.family` to create sets of atoms dynamically:

### Per-Resource State

```tsx
import { Atom } from "@effect-atom/atom-react"
import type { ChannelId } from "@hazel/db/schema"

// Create a family of atoms, one per channel
export const replyToMessageAtomFamily = Atom.family((channelId: ChannelId) =>
	Atom.make<MessageId | null>(null).pipe(Atom.keepAlive)
)

// Usage in components
function ChannelView({ channelId }: { channelId: ChannelId }) {
	const replyTo = useAtomValue(replyToMessageAtomFamily(channelId))
	// ...
}
```

**From:** `apps/web/src/atoms/chat-atoms.ts:8`

### Modal State Management

```tsx
export type ModalType = "create-dm" | "new-channel" | "join-channel"

interface ModalState {
	type: ModalType
	isOpen: boolean
	metadata?: Record<string, unknown>
}

export const modalAtomFamily = Atom.family((type: ModalType) =>
	Atom.make<ModalState>({
		type,
		isOpen: false,
		metadata: undefined,
	}).pipe(Atom.keepAlive)
)
```

**From:** `apps/web/src/atoms/modal-atoms.ts:29`

**Key Points:**
- Atom families ensure stable references for each key
- Always use `Atom.keepAlive` if state should persist
- Great for per-entity state (users, channels, modals, etc.)

## Integration Patterns

### localStorage Integration

Use `Atom.kvs` for automatic persistence:

```tsx
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Atom } from "@effect-atom/atom-react"
import { Schema } from "effect"

// Create a runtime with localStorage
const localStorageRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

// Define schema for validation
const ThemeSchema = Schema.Literal("dark", "light", "system")

// Create persisted atom
export const themeAtom = Atom.kvs({
	runtime: localStorageRuntime,
	key: "hazel-ui-theme",
	schema: Schema.NullOr(ThemeSchema),
	defaultValue: () => "system" as const,
})
```

**From:** `apps/web/src/components/theme-provider.tsx:36`

**Best Practices:**
- Define schemas for type safety and validation
- Use a shared runtime instance for all localStorage atoms
- Provide sensible defaults with `defaultValue`

### HttpApi Integration

Use `AtomHttpApi.Tag` for HTTP API clients:

```tsx
import { AtomHttpApi } from "@effect-atom/atom-react"
import { HazelApi } from "@hazel/backend/api"

export class HazelApiClient extends AtomHttpApi.Tag<HazelApiClient>()("HazelApiClient", {
	api: HazelApi,
	httpClient: CustomFetchLive,
	baseUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:3003",
}) {}
```

**From:** `apps/web/src/lib/services/common/atom-client.ts:5`

#### Using Queries

```tsx
// Define query atom
const userQueryAtom = HazelApiClient.query("users", "getById", {
	payload: { id: "123" },
	reactivityKeys: ["user:123"],
})

// Use in component
function UserProfile() {
	const userResult = useAtomValue(userQueryAtom)
	const user = Result.getOrElse(userResult, () => null)
	// ...
}
```

#### Using Mutations

```tsx
// Define mutation
const updatePresenceMutation = HazelApiClient.mutation("presence", "updateStatus")

// Use in component
function PresenceControl() {
	const updateStatus = useAtomSet(updatePresenceMutation, { mode: "promiseExit" })

	const handleStatusChange = async (status: string) => {
		await updateStatus({
			payload: { status },
			reactivityKeys: ["presence"],
		})
	}

	// ...
}
```

**From:** `apps/web/src/hooks/use-presence.ts:206`

### TanStack DB Integration

Use `makeQuery` from `@hazel/tanstack-db-atom` for reactive database queries:

```tsx
import { Atom, Result } from "@effect-atom/atom-react"
import { makeQuery } from "@hazel/tanstack-db-atom"
import { eq } from "@tanstack/db"

export const messagesByChannelAtomFamily = Atom.family((channelId: ChannelId) =>
	makeQuery((q) =>
		q
			.from({ message: messageCollection })
			.leftJoin({ author: userCollection }, ({ message, author }) =>
				eq(message.authorId, author.id)
			)
			.where(({ message }) => eq(message.channelId, channelId))
			.select(({ message, author }) => ({
				...message,
				author: author,
			}))
			.orderBy(({ message }) => message.createdAt, "desc")
			.limit(50)
	)
)
```

**From:** `apps/web/src/atoms/chat-query-atoms.ts:45`

**Key Points:**
- Queries automatically update when database changes
- Use atom families for parameterized queries
- Returns `Result` type for loading/error states

### Effect Services Integration

Create runtime atoms for services:

```tsx
import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"

class Users extends Effect.Service<Users>()("app/Users", {
	effect: Effect.gen(function* () {
		const findById = (id: string) => Effect.succeed({ id, name: "John Doe" })
		return { findById } as const
	}),
}) {}

// Create runtime from service layer
const runtimeAtom = Atom.runtime(Users.Default)

// Use runtime to create atoms with service access
export const userAtom = Atom.family((id: string) =>
	runtimeAtom.atom(
		Effect.gen(function* () {
			const users = yield* Users
			return yield* users.findById(id)
		})
	)
)
```

## Performance Optimization

### Use Atom.keepAlive

For global state that should persist:

```tsx
// Without keepAlive - resets when no components use it
const tempCountAtom = Atom.make(0)

// With keepAlive - persists across unmounts
const persistentCountAtom = Atom.make(0).pipe(Atom.keepAlive)
```

**When to use:**
- Global application state
- Modal state
- User preferences
- Authentication state
- Frequently accessed derived state

**From:** `apps/web/src/atoms/modal-atoms.ts:34`

### Atom.batch for Multiple Updates

Use `Atom.batch` to batch multiple updates:

```tsx
const openModal = (type: ModalType, metadata?: Record<string, unknown>) => {
	Atom.batch(() => {
		Atom.update(modalAtomFamily(type), (state) => ({
			...state,
			isOpen: true,
			metadata,
		}))
	})
}
```

**From:** `apps/web/src/atoms/modal-atoms.ts:63`

### Selective Re-rendering

Only subscribe to what you need:

```tsx
// ❌ Bad - subscribes to entire state
const state = useAtomValue(appStateAtom)
const userName = state.user.name

// ✅ Good - derive focused atom
const userNameAtom = Atom.map(appStateAtom, state => state.user.name)
const userName = useAtomValue(userNameAtom)
```

### Memoize Expensive Computations

Derived atoms automatically memoize:

```tsx
// Computation only runs when dependencies change
const expensiveComputationAtom = Atom.make((get) => {
	const data = get(dataAtom)
	return expensiveTransform(data) // Memoized
})
```

## Common Patterns

### Global State with Helper Functions

```tsx
export const modalAtomFamily = Atom.family((type: ModalType) =>
	Atom.make<ModalState>({ /* ... */ }).pipe(Atom.keepAlive)
)

// Imperative helpers for outside React
export const openModal = (type: ModalType, metadata?: Record<string, unknown>) => {
	Atom.batch(() => {
		Atom.update(modalAtomFamily(type), (state) => ({
			...state,
			isOpen: true,
			metadata,
		}))
	})
}

export const closeModal = (type: ModalType) => {
	Atom.batch(() => {
		Atom.update(modalAtomFamily(type), (state) => ({
			...state,
			isOpen: false,
		}))
	})
}
```

**From:** `apps/web/src/atoms/modal-atoms.ts:62`

### Tracking All Open Modals

```tsx
export const openModalsAtom = Atom.make((get) => {
	const modalTypes: ModalType[] = [
		"create-dm",
		"new-channel",
		"join-channel",
	]

	return modalTypes
		.map((type) => get(modalAtomFamily(type)))
		.filter((modal) => modal.isOpen)
		.map((modal) => modal.type)
}).pipe(Atom.keepAlive)
```

**From:** `apps/web/src/atoms/modal-atoms.ts:41`

### Combining Multiple Atoms

```tsx
const currentUserPresenceAtom = Atom.make((get) => {
	const user = get(userAtom)
	if (!user?.id) return Result.initial(false)

	return get(currentUserPresenceAtomFamily(user.id))
})
```

**From:** `apps/web/src/hooks/use-presence.ts:192`

### Router Integration

Track route changes with atoms:

```tsx
const currentChannelIdAtom = Atom.make((get) => {
	let currentChannelId: string | null = null

	const unsubscribe = router.subscribe("onResolved", (event) => {
		const channelId = extractChannelId(event)
		if (channelId !== currentChannelId) {
			currentChannelId = channelId
			get.setSelf(channelId)
		}
	})

	get.addFinalizer(unsubscribe)

	// Return initial value
	return extractChannelId(router.state.location)
}).pipe(Atom.keepAlive)
```

**From:** `apps/web/src/hooks/use-presence.ts:125`

### Stream-Based Atoms

Use Streams for periodic updates:

```tsx
import { Duration, Schedule, Stream } from "effect"

const afkStateAtom = Atom.make((get) =>
	Stream.fromSchedule(Schedule.spaced(Duration.seconds(10))).pipe(
		Stream.map(() => {
			const lastActivity = get(lastActivityAtom)
			const now = DateTime.unsafeMake(new Date())
			const timeSinceActivity = DateTime.distance(lastActivity, now)

			return {
				isAFK: Duration.greaterThanOrEqualTo(timeSinceActivity, AFK_TIMEOUT),
				timeSinceActivity,
			}
		})
	)
).pipe(Atom.keepAlive)
```

**From:** `apps/web/src/hooks/use-presence.ts:76`

### beforeunload Integration

```tsx
const beforeUnloadAtom = Atom.make((get) => {
	const user = get(userAtom)
	if (!user?.id) return null

	const handleBeforeUnload = () => {
		const url = `${API_URL}/presence/offline`
		const blob = new Blob([JSON.stringify({ userId: user.id })], {
			type: "application/json"
		})
		navigator.sendBeacon(url, blob)
	}

	window.addEventListener("beforeunload", handleBeforeUnload)
	get.addFinalizer(() => {
		window.removeEventListener("beforeunload", handleBeforeUnload)
	})

	return user.id
})

// Mount in component
function App() {
	useAtomMount(beforeUnloadAtom)
	// ...
}
```

**From:** `apps/web/src/hooks/use-presence.ts:152`

## Anti-Patterns to Avoid

### ❌ Don't Create Atoms Inside Components

```tsx
// ❌ Bad - creates new atom on every render
function Counter() {
	const countAtom = Atom.make(0) // New atom every render!
	const count = useAtomValue(countAtom)
	return <div>{count}</div>
}

// ✅ Good - define atoms outside components
const countAtom = Atom.make(0)

function Counter() {
	const count = useAtomValue(countAtom)
	return <div>{count}</div>
}
```

### ❌ Don't Forget keepAlive for Global State

```tsx
// ❌ Bad - state resets when component unmounts
export const modalStateAtom = Atom.make({ isOpen: false })

// ✅ Good - state persists
export const modalStateAtom = Atom.make({ isOpen: false }).pipe(Atom.keepAlive)
```

### ❌ Don't Forget Finalizers

```tsx
// ❌ Bad - memory leak!
const scrollAtom = Atom.make((get) => {
	const onScroll = () => get.setSelf(window.scrollY)
	window.addEventListener("scroll", onScroll)
	return window.scrollY
})

// ✅ Good - cleanup registered
const scrollAtom = Atom.make((get) => {
	const onScroll = () => get.setSelf(window.scrollY)
	window.addEventListener("scroll", onScroll)
	get.addFinalizer(() => window.removeEventListener("scroll", onScroll))
	return window.scrollY
})
```

### ❌ Don't Ignore Result Types

```tsx
// ❌ Bad - doesn't handle loading/error states
const userResult = useAtomValue(userAtom)
return <div>Hello, {userResult.name}</div> // Type error!

// ✅ Good - properly handle Result
const userResult = useAtomValue(userAtom)
return Result.match(userResult, {
	onInitial: () => <div>Loading...</div>,
	onFailure: (error) => <div>Error: {Cause.pretty(error.cause)}</div>,
	onSuccess: (user) => <div>Hello, {user.name}</div>,
})
```

### ❌ Don't Update State During Render

```tsx
// ❌ Bad - updates during render
function Component() {
	const count = useAtomValue(countAtom)
	Atom.set(countAtom, count + 1) // Side effect during render!
	return <div>{count}</div>
}

// ✅ Good - use Effects or event handlers
function Component() {
	const count = useAtomValue(countAtom)
	const setCount = useAtomSet(countAtom)

	useEffect(() => {
		setCount(count + 1)
	}, [])

	return <div>{count}</div>
}
```

### ❌ Don't Overuse Atom Families

```tsx
// ❌ Bad - family not needed for single instance
const userAtomFamily = Atom.family(() => Atom.make<User | null>(null))
const currentUser = useAtomValue(userAtomFamily("current"))

// ✅ Good - simple atom is fine
const userAtom = Atom.make<User | null>(null)
const currentUser = useAtomValue(userAtom)
```

## Additional Resources

- [Effect Atom Documentation](https://tim-smart.github.io/effect-atom/)
- [Effect-TS Documentation](https://effect.website/)
- [Codebase Context](./.context/effect-atom/)

## Real-World Examples in Codebase

- **Modal Management**: `apps/web/src/atoms/modal-atoms.ts:1`
- **Chat State**: `apps/web/src/atoms/chat-atoms.ts:1`
- **Theme Provider**: `apps/web/src/components/theme-provider.tsx:1`
- **Presence System**: `apps/web/src/hooks/use-presence.ts:1`
- **Emoji Usage**: `apps/web/src/atoms/emoji-atoms.ts:1`
- **Notification Sounds**: `apps/web/src/hooks/use-notification-sound.tsx:1`
- **API Client**: `apps/web/src/lib/services/common/atom-client.ts:1`
- **Database Queries**: `apps/web/src/atoms/chat-query-atoms.ts:1`
