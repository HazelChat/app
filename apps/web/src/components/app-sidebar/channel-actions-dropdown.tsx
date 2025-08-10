"use client"

import { useState } from "react"
import { ButtonUtility } from "~/components/base/buttons/button-utility"
import { Dropdown } from "~/components/base/dropdown/dropdown"
import IconAddSquareStroke from "~/components/icons/IconAddSquareStroke"
import IconHashtagStroke from "~/components/icons/IconHashtagStroke"
import IconPlusStroke from "~/components/icons/IconPlusStroke"
import { JoinChannelModal } from "../application/modals/join-channel-modal"
import { NewChannelModalWrapper } from "../application/modals/new-channel-modal-wrapper"

export const ChannelActionsDropdown = () => {
	const [modalType, setModalType] = useState<"create" | "join" | null>(null)

	return (
		<>
			<Dropdown>
				<Dropdown.Trigger>
					<ButtonUtility
						tooltip="Channel options"
						variant="ghost"
						size="sm"
						aria-label="Channel options"
						className="p-1 text-primary hover:text-secondary"
					>
						<IconPlusStroke />
					</ButtonUtility>
				</Dropdown.Trigger>
				<Dropdown.Content align="end">
					<Dropdown.Item onAction={() => setModalType("create")}>
						<IconAddSquareStroke className="h-4 w-4" />
						<span>Create New Channel</span>
					</Dropdown.Item>
					<Dropdown.Item onAction={() => setModalType("join")}>
						<IconHashtagStroke className="h-4 w-4" />
						<span>Join Existing Channel</span>
					</Dropdown.Item>
				</Dropdown.Content>
			</Dropdown>

			{modalType === "create" && (
				<NewChannelModalWrapper isOpen={true} setIsOpen={(isOpen) => !isOpen && setModalType(null)} />
			)}

			{modalType === "join" && (
				<JoinChannelModal isOpen={true} setIsOpen={(isOpen) => !isOpen && setModalType(null)} />
			)}
		</>
	)
}
