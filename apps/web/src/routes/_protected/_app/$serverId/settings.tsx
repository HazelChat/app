import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { Show, Suspense, createSignal } from "solid-js"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { SelectNative } from "~/components/ui/select-native"
import { convexQuery } from "~/lib/convex-query"
import { useTheme } from "~/lib/theme"
import { useKeyboardSounds } from "~/lib/keyboard-sounds"

export const Route = createFileRoute("/_protected/_app/$serverId/settings")({
	component: RouteComponent,
})

function RouteComponent() {
	const notificationStatusQuery = useQuery(() => convexQuery(api.expo.getStatusForUser, {}))
	const [showOnline, setShowOnline] = createSignal(true)
	const [videoEnabled, setVideoEnabled] = createSignal(false)
	const [callingEnabled, setCallingEnabled] = createSignal(false)
	const { theme, setTheme } = useTheme()
	const { enabled, soundType, volume, setEnabled, setSoundType, setVolume } = useKeyboardSounds()

	return (
		<div class="space-y-4 px-4 py-2">
			<Card>
				<Card.Header>
					<Card.Title>Notifications</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2">
					<Suspense>
						<Show when={notificationStatusQuery.data} keyed>
							{(status) => (
								<>
									<div class="flex items-center justify-between">
										<span class="text-muted-foreground text-sm">
											{status.paused ? "Paused" : "Active"}
										</span>
										<Button size="small">{status.paused ? "Resume" : "Pause"}</Button>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-muted-foreground text-sm">
											{status.hasToken ? "Registered" : "Not Registered"}
										</span>
										<Button size="small">
											{status.hasToken ? "Unregister" : "Register"}
										</Button>
									</div>
								</>
							)}
						</Show>
					</Suspense>
				</Card.Content>
			</Card>
			<Card>
				<Card.Header>
					<Card.Title>Appearance</Card.Title>
				</Card.Header>
				<Card.Content class="max-w-xs">
					<SelectNative
						label="Theme"
						value={theme()}
						onInput={(e) => setTheme(e.currentTarget.value as any)}
					>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
					</SelectNative>
				</Card.Content>
			</Card>
			<Card>
				<Card.Header>
					<Card.Title>Privacy</Card.Title>
				</Card.Header>
				<Card.Content>
					<label class="flex items-center justify-between gap-2">
						<span>Show Online Status</span>
						<input
							type="checkbox"
							checked={showOnline()}
							onChange={() => setShowOnline(!showOnline())}
							class="size-4"
						/>
					</label>
				</Card.Content>
			</Card>
			<Card>
				<Card.Header>
					<Card.Title>Audio</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<label class="flex items-center justify-between gap-2">
						<span>Keyboard Sounds</span>
						<input
							type="checkbox"
							checked={enabled()}
							onChange={() => setEnabled(!enabled())}
							class="size-4"
						/>
					</label>
					<Show when={enabled()}>
						<div class="space-y-2">
							<SelectNative
								label="Sound Type"
								value={soundType()}
								onInput={(e) => setSoundType(e.currentTarget.value as any)}
							>
								<option value="cherry-mx-blue">Cherry MX Blue</option>
								<option value="cherry-mx-brown">Cherry MX Brown</option>
								<option value="cherry-mx-red">Cherry MX Red</option>
								<option value="topre">Topre</option>
								<option value="alps-blue">Alps Blue</option>
							</SelectNative>
							<div class="space-y-1">
								<label class="text-sm text-muted-foreground">Volume</label>
								<input
									type="range"
									min="0"
									max="100"
									value={volume()}
									onInput={(e) => setVolume(Number(e.currentTarget.value))}
									class="w-full"
								/>
								<div class="text-xs text-muted-foreground text-right">{volume()}%</div>
							</div>
						</div>
					</Show>
				</Card.Content>
			</Card>
			<Card>
				<Card.Header>
					<Card.Title>Voice &amp; Video</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-2">
					<label class="flex items-center justify-between gap-2">
						<span>Enable Video Chat (Coming Soon)</span>
						<input
							type="checkbox"
							checked={videoEnabled()}
							onChange={() => setVideoEnabled(!videoEnabled())}
							disabled
							class="size-4"
						/>
					</label>
					<label class="flex items-center justify-between gap-2">
						<span>Enable Voice Calls (Coming Soon)</span>
						<input
							type="checkbox"
							checked={callingEnabled()}
							onChange={() => setCallingEnabled(!callingEnabled())}
							disabled
							class="size-4"
						/>
					</label>
				</Card.Content>
			</Card>
		</div>
	)
}
