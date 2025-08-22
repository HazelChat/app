"use client"

import { useState } from "react"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import IconPlusStroke from "~/components/icons/IconPlusStroke"
import { JoinChannelModal } from "../application/modals/join-channel-modal"
import { NewChannelModalWrapper } from "../application/modals/new-channel-modal-wrapper"
import IconPlusSquareStroke from "../icons/IconPlusSquareStroke"

export const ChannelActionsDropdown = () => {
	const [modalType, setModalType] = useState<"create" | "join" | null>(null)

	return (
		<>
			<Dropdown.Root>
				<ButtonUtility
					tooltip="Channel options"
					icon={IconPlusStroke}
					size="xs"
					color="tertiary"
					className="p-1 text-primary hover:text-secondary"
				/>
				<Dropdown.Popover>
					<Dropdown.Menu>
						<Dropdown.Item
							onAction={() => setModalType("create")}
							icon={IconPlusStroke}
							label="Create new channel"
						/>
						<Dropdown.Item
							onAction={() => setModalType("join")}
							icon={IconHashtagStroke}
							label="Join existing channel"
						/>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown.Root>

			{modalType === "create" && (
				<NewChannelModalWrapper isOpen={true} setIsOpen={(isOpen) => !isOpen && setModalType(null)} />
			)}

			{modalType === "join" && (
				<JoinChannelModal isOpen={true} setIsOpen={(isOpen) => !isOpen && setModalType(null)} />
			)}
		</>
	)
}
