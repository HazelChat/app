import {
	type HMSConfig,
	HMSReactiveStore,
	selectIsConnectedToRoom,
	selectIsLocalAudioEnabled,
	selectIsLocalScreenShared,
	selectIsLocalVideoEnabled,
	selectPeers,
	selectPeersScreenSharing,
	selectScreenShareByPeerID,
	selectVideoTrackByID,
} from "@100mslive/hms-video-store"
import type { Id } from "@hazel/backend"
import { api } from "@hazel/backend/api"
import { useQuery } from "@tanstack/solid-query"
import { createEffect, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { toaster } from "~/components/ui/toaster"
import { convexQuery } from "../convex-query"

const hms = new HMSReactiveStore()

hms.triggerOnSubscribe()
export const hmsActions = hms.getActions()
export const hmsStore = hms.getStore()

export function useCallManager(props: { serverId: Id<"servers"> }) {
	const meQuery = useQuery(() => ({
		...convexQuery(api.me.getUser, { serverId: props.serverId }),
	}))

	const [store, setStore] = createStore({
		peers: hmsStore.getState(selectPeers).map((peer) => {
			const track = hmsStore.getState(selectVideoTrackByID(peer.videoTrack))

			return { ...peer, track }
		}),
		isConnected: hmsStore.getState(selectIsConnectedToRoom),
		local: {
			audio: hmsStore.getState(selectIsLocalAudioEnabled),
			video: hmsStore.getState(selectIsLocalVideoEnabled),
		},
		screenshares: hmsStore.getState(selectPeersScreenSharing).map((peer) => {
			return hmsStore.getState(selectScreenShareByPeerID(peer.id))
		}),
	})

	const joinCall = async ({ roomCode }: { roomCode: string }) => {
		try {
			if (!meQuery.data) {
				toaster.info({
					title: "Please sign in to join a call",
				})

				return
			}
			const authToken = await hmsActions.getAuthTokenByRoomCode({ roomCode })
			const config = {
				authToken,
				userName: meQuery.data.displayName,
			} satisfies HMSConfig
			await hmsActions.join(config)
		} catch (error) {
			console.error("Error joining call:", error)
		}
	}

	const toggleScreenShare = async () => {
		try {
			const isScreenShareEnabled = hmsStore.getState(selectIsLocalScreenShared)
			await hmsActions.setScreenShareEnabled(!isScreenShareEnabled)
		} catch (error) {
			console.error("Error toggling screen share:", error)
		}
	}

	const leaveCall = async () => {
		try {
			await hmsActions.leave()
		} catch (error) {
			console.error("Error leaving call:", error)
		}
	}

	const setLocalAudio = async (enabled: boolean) => {
		try {
			await hmsActions.setLocalAudioEnabled(enabled)
		} catch (error) {
			console.error("Error setting local audio:", error)
		}
	}

	const setLocalVideo = async (enabled: boolean) => {
		try {
			await hmsActions.setLocalVideoEnabled(enabled)
		} catch (error) {
			console.error("Error setting local video:", error)
		}
	}

	createEffect(() => {
		const unsubscribe = hmsStore.subscribe((store) => {
			const localAudioEnabled = selectIsLocalAudioEnabled(store)
			const localVideoEnabled = selectIsLocalVideoEnabled(store)
			setStore(
				"local",
				reconcile({
					audio: localAudioEnabled,
					video: localVideoEnabled,
				}),
			)

			setStore("isConnected", !!selectIsConnectedToRoom(store))

			const peers = selectPeers(store).map((peer) => {
				const track = selectVideoTrackByID(peer.videoTrack)(store)

				return { ...peer, track }
			})

			setStore("peers", reconcile(peers, { key: "id" }))

			const screensharingPeers = selectPeersScreenSharing(store)

			const screenshares = screensharingPeers.map((peer) => {
				return selectScreenShareByPeerID(peer.id)(store)
			})

			setStore("screenshares", reconcile(screenshares, { key: "id" }))
		})

		onCleanup(() => {
			leaveCall()
			unsubscribe()
		})
	})

	return {
		store,

		hmsActions,

		joinCall,
		leaveCall,
		setLocalAudio,
		toggleScreenShare,
		setLocalVideo,
	}
}
