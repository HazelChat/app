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
 * Atom that periodically checks for new app versions
 * Checks immediately on load, then polls /version.json every 1 minute
 */
export const versionCheckAtom = Atom.make((get) =>
	Stream.fromSchedule(Schedule.fixed(VERSION_CHECK_INTERVAL)).pipe(
		Stream.mapEffect(() =>
			Effect.gen(function* () {
				const latestVersion = yield* fetchVersion

				const storedVersion = get(currentVersionAtom)

				// On first load, store the current version as baseline
				if (!storedVersion) {
					get.set(currentVersionAtom, latestVersion)
					return {
						current: latestVersion,
						latest: latestVersion,
						isUpdateAvailable: false,
						shouldShowToast: false,
					}
				}

				// Check if there's a new version by comparing buildTimes
				const isUpdateAvailable = latestVersion.buildTime > storedVersion.buildTime

				// Always show toast when update is available (simplified!)
				if (isUpdateAvailable) {
					console.log("[Version Check] 🎉 New version detected!")
				}

				return {
					current: storedVersion,
					latest: latestVersion,
					isUpdateAvailable,
					shouldShowToast: isUpdateAvailable,
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

	// Read stored version from atom
	const storedVersion = yield* Atom.get(currentVersionAtom)

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

	return {
		current: storedVersion,
		latest: latestVersion,
		isUpdateAvailable,
		shouldShowToast: isUpdateAvailable,
	}
})
