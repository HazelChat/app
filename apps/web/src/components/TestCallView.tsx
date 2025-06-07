import { Show, createSignal } from "solid-js"

import { Button } from "~/components/ui/button"
import { Dialog } from "~/components/ui/dialog"
// import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, XIcon, PhoneOffIcon } from "lucide-solid";

// TODO: Import 100ms SDK elements: useHMSStore, HMSReactiveStore
// import { selectIsLocalAudioEnabled, selectIsLocalVideoEnabled, selectPeers } from "@100mslive/hms-video-store";

export interface TestCallViewProps {
	// Renamed interface for clarity
	isOpen: boolean
	onClose: () => void
	roomId: string
	// token: string; // Auth token for 100ms - this will likely be fetched
}

export function TestCallView(props: TestCallViewProps) {
	// const hmsStore = useHMSStore();
	// const peers = hmsStore.getState(selectPeers);
	// const localPeer = hmsStore.getLocalPeer();
	// const isLocalAudioEnabled = hmsStore.getState(selectIsLocalAudioEnabled);
	// const isLocalVideoEnabled = hmsStore.getState(selectIsLocalVideoEnabled);

	// const [hmsActions, setHmsActions] = createSignal<HMSReactiveStore["actions"] | null>(null);

	// createEffect(() => {
	//   if (props.isOpen /* && props.token && props.roomId */) { // Token check removed for now
	//     // Initialize HMS and join room
	//     // const hmsInstance = new HMSReactiveStore();
	//     // hmsInstance.triggerOnSubscribe();
	//     // setHmsActions(hmsInstance.getActions());
	//
	//     // hmsInstance.join({
	//     //   userName: "User-" + Math.random().toString(36).substring(7),
	//     //   authToken: props.token,
	//     //   settings: {
	//     //     isAudioMuted: false,
	//     //     isVideoMuted: false,
	//     //   },
	//     //   metaData: JSON.stringify({ source: "solidjs-example" }),
	//     // }, {
	//     //    roomId: props.roomId,
	//     // });
	//   } else if (!props.isOpen && hmsActions()) {
	//     // Leave room
	//     // hmsActions()?.leave();
	//     // setHmsActions(null);
	//   }
	// });

	// const toggleAudio = async () => { /* ... */ };
	// const toggleVideo = async () => { /* ... */ };
	// const leaveCall = async () => { props.onClose(); /* ... */ };

	return (
		<Show when={props.isOpen}>
			<Dialog
				open={props.isOpen}
				onOpenChange={(detail: { open: boolean }) => {
					if (!detail.open) props.onClose()
				}}
				modal
			>
				{/* Dialog.Backdrop and Dialog.Positioner are part of Dialog.Content from ui/dialog.tsx */}
				<Dialog.Content class="flex h-[80vh] w-[90vw] max-w-4xl flex-col p-0">
					<Dialog.Title class="border-b p-4 font-semibold text-lg">Video Call</Dialog.Title>
					<div class="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
						<div class="relative flex aspect-video items-center justify-center rounded-lg bg-muted">
							<p class="text-muted-foreground">Local Video</p>
							{/* Video elements and logic will go here */}
						</div>
						<div class="relative flex aspect-video items-center justify-center rounded-lg bg-muted">
							<p class="text-muted-foreground">Remote Video</p>
							{/* Video elements and logic will go here */}
						</div>
					</div>
					<div class="flex items-center justify-center gap-2 border-t p-4 sm:gap-4">
						<Button intent="outline">Mute</Button>
						<Button intent="outline">Video Off</Button>
						<Button intent="destructive" onClick={props.onClose}>
							End Call
						</Button>
					</div>
					<Dialog.CloseTrigger class="absolute top-2 right-2 sm:top-4 sm:right-4">
						{/* <XIcon /> */} Close
					</Dialog.CloseTrigger>
				</Dialog.Content>
			</Dialog>
		</Show>
	)
}
