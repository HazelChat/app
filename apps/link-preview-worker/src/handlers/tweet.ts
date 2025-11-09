import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { getTweet } from "react-tweet/api"
import { MyHttpApi } from "../api"
import { TweetError } from "../declare"

export const HttpTweetLive = HttpApiBuilder.group(MyHttpApi, "tweet", (handlers) =>
	handlers.handle(
		"get",
		Effect.fn(function* ({ urlParams }) {
			const tweetId = urlParams.id

			yield* Effect.log(`Fetching tweet data for ID: ${tweetId}`)

			// Fetch tweet data using react-tweet API
			const tweet = yield* Effect.tryPromise({
				try: async () => {
					const data = await getTweet(tweetId)
					if (!data) {
						throw new Error("Tweet not found")
					}
					return data
				},
				catch: (error) =>
					new TweetError({
						message: `Failed to fetch tweet: ${error}`,
					}),
			})

			yield* Effect.log(`Successfully fetched tweet: ${tweetId}`)

			// Return the tweet data as-is (react-tweet already provides structured data)
			return tweet
		}),
	),
)
