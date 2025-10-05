import {
	RealtimeKitProvider,
	useRealtimeKitClient,
	useRealtimeKitMeeting,
	useRealtimeKitSelector,
} from "@cloudflare/realtimekit-react"
import {
	provideRtkDesignSystem,
	RtkButton,
	RtkControlbar,
	RtkDialogManager,
	RtkEndedScreen,
	RtkHeader,
	RtkMeeting,
	RtkNotifications,
	RtkParticipantsAudio,
	RtkUiProvider,
} from "@cloudflare/realtimekit-react-ui"
import { createFileRoute } from "@tanstack/react-router"
import React, { useEffect, useRef } from "react"
import { Button } from "~/components/base/buttons/button"

export const Route = createFileRoute("/_app/$orgSlug/call")({
	component: React.memo(RouteComponent),
})

function RouteComponent() {
	const [meeting, initMeeting] = useRealtimeKitClient()

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		initMeeting({
			authToken:
				"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdJZCI6Ijg1NmZhZGIyLTE1ZjctNGU4NC1hNWY0LTgzYzFhMzdhZmY2NiIsIm1lZXRpbmdJZCI6ImJiYmQxYzhhLWFhNzQtNGM2Yi1iNjFlLTNiMmJmMDVjNWE3ZiIsInBhcnRpY2lwYW50SWQiOiJhYWE2NGQ4MC1mZjI1LTRhOGYtOTg4Mi1iYTk0OWQ2Y2MwYjIiLCJwcmVzZXRJZCI6ImViODY1MDY1LTU2MDgtNDBhNC04MWUzLThkYWQ4NGI3MWFhMSIsImlhdCI6MTc1NTEyNDg3OSwiZXhwIjoxNzYzNzY0ODc5fQ.HJe7NQiBmqD5jkZu0QVwbgn9e4PqRnKgUo14KwawATnBzLFE5kry-Lp1B1cuCKX4pjKscC_FTKM5-49PrNP-gm3SkhVy6sAhYtR2966IvNfwxsDB1RaA1qBxqDPjFE7eMP5046ghz948aBnxvolM--vmT-trFWkWGNwDExCzU3GfqTngI5Diz8NI9nXTufqpHdnZNF-RD-wJNWlnTa1KRfoxxctcAPxJDXkqm-G8r4vpeRvvI8lUNzHMhkBoh_-HFi1dR1l454O5pGRSj4H2SdLDgw537BYie9yLGK3WOPQB2F9ZS54FLpOZb8ScmZsd3RUUY0uTp1y5ETDL99ZavA",
			defaults: {
				audio: false,
				video: false,
			},
		})
	}, [])

	return (
		<RealtimeKitProvider value={meeting}>
			<MyMeeting />
		</RealtimeKitProvider>
	)
}

function MyMeeting() {
	const { meeting } = useRealtimeKitMeeting()
	const roomState = useRealtimeKitSelector((m) => m.self.roomState)

	return (
		<RtkUiProvider meeting={meeting}>
			<div style={{ height: "100vh" }}>
				{roomState === "init" && <CustomMeetingPreview />}

				<RtkParticipantsAudio />
				{/* <RtkNotifications /> */}
				<RtkDialogManager />

				{roomState === "joined" && (
					<RtkMeeting mode="fill" meeting={meeting} showSetupScreen={false} />

					// <div className="flex h-full w-full flex-col">
					// 	<header>
					// 		<RtkHeader meeting={meeting} />
					// 	</header>

					// 	        <RtkMeeting mode="fill" meeting={meeting} showSetupScreen={false} />

					// 	<RtkDialogManager meeting={meeting} />

					// 	<footer className="flex w-full overflow-visible">
					// 		<RtkControlbar meeting={meeting} />
					// 	</footer>
					// </div>
				)}
				{roomState === "ended" && <RtkEndedScreen meeting={meeting} />}
			</div>
		</RtkUiProvider>
	)
}

function CustomMeetingPreview() {
	const { meeting } = useRealtimeKitMeeting()

	return (
		<div className="flex h-full w-full flex-col items-center justify-center bg-primary">
			<div className="flex flex-col items-center">
				<p>Joining as {meeting.self.name}</p>
			</div>
			<Button onClick={async () => await meeting.join()}>Join</Button>
		</div>
	)
}
