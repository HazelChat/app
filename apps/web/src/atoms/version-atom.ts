import { FetchHttpClient, HttpClient, HttpClientResponse } from "@effect/platform"
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
 * Polling interval for checking new versions (1 minute)
 */
const VERSION_CHECK_INTERVAL = Duration.seconds(60)

/**
 * Current app version built into the bundle at build time
 */
const CURRENT_VERSION: VersionInfo = {
	buildTime: __BUILD_TIME__,
	version: __APP_VERSION__,
}

/**
 * Effect to fetch version info from /version.json using HttpClient
 */
const fetchVersion = Effect.gen(function* () {
	const response = yield* HttpClient.get(`/version.json?t=${Date.now()}`)
	return yield* HttpClientResponse.schemaBodyJson(VersionInfo)(response)
}).pipe(Effect.provide(FetchHttpClient.layer))

/**
 * Atom that periodically checks for new app versions
 * Checks immediately on load, then polls /version.json every 1 minute
 */
export const versionCheckAtom = Atom.make(() =>
	Stream.fromSchedule(Schedule.fixed(VERSION_CHECK_INTERVAL)).pipe(
		Stream.mapEffect(() =>
			Effect.gen(function* () {
				const latestVersion = yield* fetchVersion

				// Check if there's a new version by comparing buildTimes
				const isUpdateAvailable = latestVersion.buildTime > CURRENT_VERSION.buildTime

				if (isUpdateAvailable) {
					console.log("[Version Check] 🎉 New version detected!")
				}

				return {
					current: CURRENT_VERSION,
					latest: latestVersion,
					isUpdateAvailable,
					shouldShowToast: isUpdateAvailable,
				}
			}),
		),
		Stream.catchAll(() =>
			Stream.succeed({
				current: CURRENT_VERSION,
				latest: CURRENT_VERSION,
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

	const isUpdateAvailable = latestVersion.buildTime > CURRENT_VERSION.buildTime

	return {
		current: CURRENT_VERSION,
		latest: latestVersion,
		isUpdateAvailable,
		shouldShowToast: isUpdateAvailable,
	}
})
