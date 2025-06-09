import type { HMSPeer, HMSScreenVideoTrack, HMSVideoTrack } from "@100mslive/hms-video-store"
import { Toggle } from "@ark-ui/solid"
import type { Id } from "@hazel/backend"
import { createFileRoute } from "@tanstack/solid-router"
import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js"
import { IconCallCancel } from "~/components/icons/call-cancel"
import { IconMic } from "~/components/icons/mic"
import { IconMicOff } from "~/components/icons/mic-off"
import { IconShareScreen } from "~/components/icons/share-screen"
import { IconVideo } from "~/components/icons/video"
import { IconVideoOff } from "~/components/icons/video-off"
import { Button, buttonVariants } from "~/components/ui/button"
import { TextField } from "~/components/ui/text-field"
import { hmsActions, useCallManager } from "~/lib/hms/use-video-manager"
export const Route = createFileRoute("/_protected/_app/$serverId/video")({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const { store, joinCall, leaveCall, setLocalAudio, setLocalVideo, toggleScreenShare } = useCallManager({
		serverId: params().serverId as Id<"servers">,
	})
	const [roomCode, setRoomCode] = createSignal("ahf-hxjo-caw")

	const handleJoinCall = async () => {
		if (roomCode()) {
			await joinCall({ roomCode: roomCode() })
		}
	}

	return (
		<div class="flex min-h-screen flex-col">
			<Show when={!store.isConnected}>
				<div class="flex items-center gap-2 border-b p-4">
					<TextField
						type="text"
						placeholder="Room Code"
						value={roomCode()}
						onInput={(e) => setRoomCode(e.currentTarget.value)}
					/>

					<Button onClick={handleJoinCall} disabled={!roomCode() || store.isConnected}>
						Join Call
					</Button>
				</div>
			</Show>
			<div class="border-b p-4">
				<h1 class="font-semibold text-lg">Video Call - {roomCode()}</h1>
				<p>Status: {store.isConnected ? "Connected" : "Disconnected"}</p>
			</div>

			<div class="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-3">
				<div class="grid gap-4 md:col-span-2 md:grid-cols-2">
					<Show
						when={store.peers.length > 0}
						fallback={
							<>
								<div class="relative flex aspect-video items-center justify-center rounded-lg bg-muted">
									<p class="text-muted-foreground">Local Video</p>
									{/* Video elements and logic will go here */}
								</div>
								<div class="relative flex aspect-video items-center justify-center rounded-lg bg-muted">
									<p class="text-muted-foreground">Remote Video</p>
									{/* Video elements and logic will go here */}
								</div>
							</>
						}
					>
						<For each={store.peers}>{(peer) => <VideoComponent peer={peer} />}</For>
					</Show>
					<For each={store.screenshares}>
						{(track) => <ScreenShareComponent videoTrack={track} />}
					</For>
				</div>
				<div class="border-l p-4">
					<h3 class="mb-2 font-semibold">Peers ({store.peers.length})</h3>
					<ul class="space-y-1 text-sm">
						<For each={store.peers}>
							{(peer) => (
								<li>
									{peer.name} ({peer.isLocal ? "You" : "Remote"})
								</li>
							)}
						</For>
					</ul>
				</div>
			</div>
			<div class="flex items-center justify-center gap-2 border-t p-4 sm:gap-4">
				<Toggle.Root
					class={buttonVariants({
						intent: "outline",
					})}
					pressed={store.local.audio}
					onPressedChange={setLocalAudio}
					disabled={!store.isConnected}
				>
					<Show when={store.local.audio} fallback={<IconMicOff />}>
						<IconMic />
					</Show>
				</Toggle.Root>
				<Toggle.Root
					class={buttonVariants({
						intent: "outline",
					})}
					pressed={store.local.video}
					onPressedChange={setLocalVideo}
					disabled={!store.isConnected}
				>
					<Show when={store.local.video} fallback={<IconVideoOff />}>
						<IconVideo />
					</Show>
				</Toggle.Root>
				<Button onClick={toggleScreenShare} disabled={!store.isConnected}>
					<IconShareScreen />
				</Button>

				<Button intent="destructive" onClick={leaveCall} disabled={!store.isConnected}>
					<IconCallCancel />
					Leave Call
				</Button>
			</div>
		</div>
	)
}

const VideoComponent = (props: { peer: HMSPeer & { track: HMSVideoTrack | null } }) => {
	const [isSpeaking, setIsSpeaking] = createSignal(false)
	let videoElement: HTMLVideoElement | undefined

	const isEnabled = createMemo(() => !!props.peer.track?.enabled)

	createEffect(
		on(isEnabled, (enabled) => {
			if (!videoElement) return

			if (!props.peer.track) {
				return
			}

			if (enabled) {
				console.log("Attaching video...")
				hmsActions.attachVideo(props.peer.track!.id, videoElement)
			} else {
				hmsActions.detachVideo(props.peer.track!.id, videoElement)
			}
		}),
	)

	// createEffect(() => {
	// 	console.log(props.peer.track)
	// })

	return (
		<div
			class="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted"
			classList={{ "ring-2 ring-green-500": isSpeaking() }}
		>
			<div class="absolute inset-0 flex items-center justify-center text-muted-foreground">
				{props.peer.name}
			</div>
			<video ref={videoElement} class="z-10 h-full w-full" muted playsinline autoplay />
		</div>
	)
}

const ScreenShareComponent = (props: { videoTrack: HMSScreenVideoTrack }) => {
	let videoElement: HTMLVideoElement | undefined
	createEffect(() => {
		if (!videoElement) return

		if (props.videoTrack.enabled) {
			hmsActions.attachVideo(props.videoTrack.id, videoElement)
		} else {
			hmsActions.detachVideo(props.videoTrack.id, videoElement)
		}
	})

	return (
		<div class="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted">
			<video ref={videoElement} class="z-10 h-full w-full" muted playsinline autoplay />
		</div>
	)
}
