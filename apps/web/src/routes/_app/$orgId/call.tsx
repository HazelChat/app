import {
	RealtimeKitProvider,
	useRealtimeKitClient,
	useRealtimeKitMeeting,
} from "@cloudflare/realtimekit-react"
import { RtkMeeting } from "@cloudflare/realtimekit-react-ui"
import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

let isFirstCall = true

export const Route = createFileRoute("/_app/$orgId/call")({
	component: RouteComponent,
})

function RouteComponent() {
	const isFirstRender = useRef(true)
	const [meeting, initMeeting] = useRealtimeKitClient()

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		console.log(meeting)
		console.log("initMeeting", isFirstRender.current)
		if (isFirstCall) {
			initMeeting({
				authToken:
					"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdJZCI6Ijg1NmZhZGIyLTE1ZjctNGU4NC1hNWY0LTgzYzFhMzdhZmY2NiIsIm1lZXRpbmdJZCI6ImJiYmQxYzhhLWFhNzQtNGM2Yi1iNjFlLTNiMmJmMDVjNWE3ZiIsInBhcnRpY2lwYW50SWQiOiJhYWE2NGQ4MC1mZjI1LTRhOGYtOTg4Mi1iYTk0OWQ2Y2MwYjIiLCJwcmVzZXRJZCI6ImViODY1MDY1LTU2MDgtNDBhNC04MWUzLThkYWQ4NGI3MWFhMSIsImlhdCI6MTc1NTEyNDg3OSwiZXhwIjoxNzYzNzY0ODc5fQ.HJe7NQiBmqD5jkZu0QVwbgn9e4PqRnKgUo14KwawATnBzLFE5kry-Lp1B1cuCKX4pjKscC_FTKM5-49PrNP-gm3SkhVy6sAhYtR2966IvNfwxsDB1RaA1qBxqDPjFE7eMP5046ghz948aBnxvolM--vmT-trFWkWGNwDExCzU3GfqTngI5Diz8NI9nXTufqpHdnZNF-RD-wJNWlnTa1KRfoxxctcAPxJDXkqm-G8r4vpeRvvI8lUNzHMhkBoh_-HFi1dR1l454O5pGRSj4H2SdLDgw537BYie9yLGK3WOPQB2F9ZS54FLpOZb8ScmZsd3RUUY0uTp1y5ETDL99ZavA",
				defaults: {
					audio: false,
					video: false,
				},
			})

			isFirstCall = true
			return
		}
	}, [])

	return (
		<RealtimeKitProvider value={meeting}>
			<MyMeetingUI />
		</RealtimeKitProvider>
	)
}

function MyMeetingUI() {
	const { meeting } = useRealtimeKitMeeting()
	return (
		<div style={{ height: "480px" }}>
			<RtkMeeting mode="fill" meeting={meeting} showSetupScreen={false} />
		</div>
	)
}
