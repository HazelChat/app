import { FetchHttpClient, HttpClient, HttpClientResponse } from "@effect/platform"
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Atom } from "@effect-atom/atom-react"
import { Duration, Effect, Schedule, Schema, Stream } from "effect"

/**
 * Schema for version information from /version.json
 */
const VersionInfo = Schema.Struct({
	buildTime: Schema.Number,
	version: Schema.String,
})

type VersionInfo = typeof VersionInfo.Type

/**
 * Polling interval for checking new versions (1 minutes)
 */
const VERSION_CHECK_INTERVAL = Duration.seconds(60)

/**
 * Effect to fetch version info from /version.json using HttpClient
 */
const fetchVersion = Effect.gen(function* () {
	const response = yield* HttpClient.get(`/version.json?t=${Date.now()}`)
	return yield* HttpClientResponse.schemaBodyJson(VersionInfo)(response)
}).pipe(Effect.provide(FetchHttpClient.layer))

/**
 * Runtime for sessionStorage atoms using BrowserKeyValueStore
 */
const sessionStorageRuntime = Atom.runtime(BrowserKeyValueStore.layerSessionStorage)

/**
 * Atom that stores the current app version in sessionStorage
 */
const currentVersionAtom = Atom.kvs({
	runtime: sessionStorageRuntime,
	key: "app-current-version",
	schema: Schema.NullOr(VersionInfo),
	defaultValue: () => null,
})

/**
 * Atom that tracks if the update toast has been shown this session
 */
const updateToastShownAtom = Atom.kvs({
	runtime: sessionStorageRuntime,
	key: "app-update-toast-shown",
	schema: Schema.Boolean,
	defaultValue: () => false,
})

/**
 * Atom that periodically checks for new app versions
 * Uses a Stream that polls /version.json every 5 minutes
 */
export const versionCheckAtom = Atom.make((get) =>
	Stream.fromSchedule(Schedule.spaced(VERSION_CHECK_INTERVAL)).pipe(
		Stream.mapEffect(() =>
			Effect.gen(function* () {
				const latestVersion = yield* fetchVersion

				const storedVersion = get(currentVersionAtom)

				if (!storedVersion) {
					get.set(currentVersionAtom, latestVersion)
					return {
						current: latestVersion,
						latest: latestVersion,
						isUpdateAvailable: false,
						shouldShowToast: false,
					}
				}

				const isUpdateAvailable = latestVersion.buildTime > storedVersion.buildTime

				const toastShown = get(updateToastShownAtom)
				const shouldShowToast = isUpdateAvailable && !toastShown

				if (shouldShowToast) {
					get.set(updateToastShownAtom, true)
				}

				return {
					current: storedVersion,
					latest: latestVersion,
					isUpdateAvailable,
					shouldShowToast,
				}
			}),
		),
		Stream.catchAll(() =>
			Stream.succeed({
				current: null,
				latest: null,
				isUpdateAvailable: false,
				shouldShowToast: false,
			}),
		),
	),
).pipe(Atom.keepAlive)

/**
 * Manual version check effect (for immediate checking)
 */
export const checkVersionNow = Effect.gen(function* () {
	const latestVersion = yield* fetchVersion

	// Read from atoms using Atom.get
	const storedVersion = yield* Atom.get(currentVersionAtom)
	const toastShown = yield* Atom.get(updateToastShownAtom)

	if (!storedVersion) {
		yield* Atom.set(currentVersionAtom, latestVersion)
		return {
			current: latestVersion,
			latest: latestVersion,
			isUpdateAvailable: false,
			shouldShowToast: false,
		}
	}

	const isUpdateAvailable = latestVersion.buildTime > storedVersion.buildTime
	const shouldShowToast = isUpdateAvailable && !toastShown

	if (shouldShowToast) {
		yield* Atom.set(updateToastShownAtom, true)
	}

	return {
		current: storedVersion,
		latest: latestVersion,
		isUpdateAvailable,
		shouldShowToast,
	}
})
