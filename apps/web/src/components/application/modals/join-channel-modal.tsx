"use client"

import { type ChannelId, ChannelMemberId } from "@hazel/db/schema"
import { eq, inArray, not, useLiveQuery } from "@tanstack/react-db"
import { useParams } from "@tanstack/react-router"
import { DateTime } from "effect"
import { useState } from "react"
import { Heading as AriaHeading } from "react-aria-components"
import { toast } from "sonner"
import { v4 as uuid } from "uuid"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { Input } from "~/components/base/input/input"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import { channelCollection, channelMemberCollection } from "~/db/collections"
import { useAuth } from "~/providers/auth-provider"
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "./modal"

interface JoinChannelModalProps {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
}

export const JoinChannelModal = ({ isOpen, setIsOpen }: JoinChannelModalProps) => {
	const [searchQuery, setSearchQuery] = useState("")
	const { orgId } = useParams({ from: "/_app/$orgId" })
	const { user } = useAuth()

	const { data: userChannels } = useLiveQuery(
		(q) =>
			q
				.from({ m: channelMemberCollection })
				.where(({ m }) => eq(m.userId, user?.id))
				.select(({ m }) => ({ channelId: m.channelId })),
		[user?.id],
	)

	const { data: unjoinedChannels } = useLiveQuery(
		(q) => {
			return q
				.from({ channel: channelCollection })
				.where(({ channel }) =>
					not(
						inArray(
							channel.id,
							userChannels.map((m) => m.channelId),
						),
					),
				)
				.select(({ channel }) => ({ ...channel }))
		},
		[user?.id, orgId],
	)

	console.log("unjoinedChannels", unjoinedChannels)

	const handleJoinChannel = async (channelId: ChannelId) => {
		try {
			if (!user?.id) {
				toast.error("User not authenticated")
				return
			}

			channelMemberCollection.insert({
				id: ChannelMemberId.make(uuid()),
				channelId,
				userId: user.id,
				isHidden: false,
				isMuted: false,
				isFavorite: false,
				notificationCount: 0,
				joinedAt: new Date(),
				createdAt: new Date(),
				deletedAt: null,
				lastSeenMessageId: null,
			})

			toast.success("Successfully joined channel")
			setIsOpen(false)
			setSearchQuery("")
		} catch (error) {
			console.error("Failed to join channel:", error)
			toast.error("Failed to join channel")
		}
	}

	const filteredChannels =
		unjoinedChannels?.filter((channel) =>
			channel.name.toLowerCase().includes(searchQuery.toLowerCase()),
		) ?? []

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<ModalOverlay isDismissable>
				<Modal>
					<Dialog>
						<div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl transition-all sm:max-w-120">
							<CloseButton
								onClick={() => setIsOpen(false)}
								theme="light"
								size="lg"
								className="absolute top-3 right-3"
							/>
							<div className="flex flex-col gap-0.5 px-4 pt-5 pb-5 sm:px-6 sm:pt-6">
								<AriaHeading slot="title" className="font-semibold text-md text-primary">
									Browse Channels
								</AriaHeading>
								<p className="text-sm text-tertiary">
									Join a public channel in your organization
								</p>
							</div>

							<div className="px-4 pb-4 sm:px-6">
								<Input
									value={searchQuery}
									onChange={(value) => setSearchQuery(value)}
									placeholder="Search channels..."
									autoFocus
								/>
							</div>

							<div className="max-h-[400px] overflow-y-auto px-4 sm:px-6">
								{filteredChannels.length === 0 ? (
									<div className="py-8 text-center">
										<IconHashtagStroke className="mx-auto mb-3 h-12 w-12 text-fg-quaternary" />
										<p className="text-sm text-tertiary">
											{searchQuery
												? "No channels found matching your search"
												: unjoinedChannels?.length === 0
													? "You've already joined all available channels"
													: "No channels available to join"}
										</p>
									</div>
								) : (
									<div className="space-y-2">
										{filteredChannels.map((channel) => (
											<div
												key={channel.id}
												className="flex items-center justify-between rounded-lg border border-secondary p-3 transition-colors hover:bg-secondary"
											>
												<div className="flex items-center gap-3">
													<IconHashtagStroke className="h-5 w-5 text-fg-quaternary" />
													<div className="font-medium text-primary">
														{channel.name}
													</div>
												</div>
												<Button
													size="sm"
													color="primary"
													onClick={() => handleJoinChannel(channel.id)}
												>
													Join
												</Button>
											</div>
										))}
									</div>
								)}
							</div>

							<div className="flex justify-end p-4 pt-6 sm:px-6 sm:pt-8 sm:pb-6">
								<Button
									color="secondary"
									onClick={() => {
										setIsOpen(false)
										setSearchQuery("")
									}}
								>
									Close
								</Button>
							</div>
						</div>
					</Dialog>
				</Modal>
			</ModalOverlay>
		</DialogTrigger>
	)
}
