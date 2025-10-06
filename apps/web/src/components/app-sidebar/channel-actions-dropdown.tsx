"use client"

import { Plus } from "@untitledui/icons"
import { useState } from "react"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import IconHashtag from "~/components/icons/icon-hashtag"
import IconPlus from "~/components/icons/icon-plus"
import { JoinChannelModal } from "../application/modals/join-channel-modal"
import { NewChannelModalWrapper } from "../application/modals/new-channel-modal-wrapper"

export const ChannelActionsDropdown = () => {
	const [modalType, setModalType] = useState<"create" | "join" | null>(null)

	return (
		<>
			<Dropdown.Root>
				<ButtonUtility
					tooltip="Channel options"
					icon={Plus}
					size="xs"
					color="tertiary"
					className="p-1 text-primary hover:text-secondary"
				/>
				<Dropdown.Popover>
					<Dropdown.Menu>
						<Dropdown.Item
							onAction={() => setModalType("create")}
							icon={IconPlus}
							label="Create new channel"
						/>
						<Dropdown.Item
							onAction={() => setModalType("join")}
							icon={IconHashtag}
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
