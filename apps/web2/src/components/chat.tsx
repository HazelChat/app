"use client"

import {
	EllipsisHorizontalIcon,
	ExclamationTriangleIcon,
	IdentificationIcon,
	MicrophoneIcon,
	NoSymbolIcon,
	PaperClipIcon,
	UserPlusIcon,
} from "@heroicons/react/16/solid"
import { useEffect, useRef, useState } from "react"
import { Form, TextArea, TextField } from "react-aria-components"
import { twJoin } from "tailwind-merge"
import { AppNav } from "~/components/app-nav"
import { EmojiPicker } from "~/components/emoji-picker"
import { RichMessage } from "~/components/rich-message"
import { servers } from "~/components/server-sidebar"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "~/components/ui/menu"
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"

interface ChatItem {
	id: string
	name: string
	username?: string
	avatar: string
	bio?: string
	message: string
}

export function Chat({ openCmd }: { openCmd: (isOpen: boolean) => void }) {
	const [message, setMessage] = useState("")
	const [items, setItems] = useState<ChatItem[]>(chats)
	const viewportRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "auto" })
	}, [])

	useEffect(() => {
		viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" })
	}, [])

	function insertAtCursor(unicode: string) {
		const el = inputRef.current
		if (!el) {
			setMessage((m) => m + unicode)
			return
		}
		const start = el.selectionStart ?? message.length
		const end = el.selectionEnd ?? message.length
		const next = message.slice(0, start) + unicode + message.slice(end)
		setMessage(next)
		requestAnimationFrame(() => {
			const pos = start + unicode.length
			el.setSelectionRange(pos, pos)
			el.focus()
		})
	}

	function send(content: string) {
		if (!content.trim()) return
		setItems((c) => [
			...c,
			{
				id: Date.now().toString(),
				name: "Poppy Ellsworth",
				avatar: "https://design.intentui.com/images/blocks/avatar/woman.webp",
				message: content,
			},
		])
		setMessage("")
		requestAnimationFrame(() => {
			viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" })
			inputRef.current?.focus()
		})
	}

	return (
		<div className="h-screen overflow-hidden">
			<div className="flex h-full flex-col px-(--layout-gutter) [--layout-gutter:--spacing(4)] sm:[--layout-gutter:--spacing(6)]">
				<div className="-mx-(--layout-gutter) sticky top-0 z-10 bg-bg/80 backdrop-blur">
					<AppNav openCmd={openCmd} />
				</div>

				<div className="-mx-(--layout-gutter) min-h-0 flex-1">
					<div
						ref={viewportRef}
						className="h-full min-h-0 space-y-[calc(var(--y)-(--spacing(2)))] overflow-y-auto px-(--layout-gutter) pt-[calc(var(--y)-(--spacing(4)))] pb-(--y) [--y:--spacing(8)]"
					>
						{items.map((chat) => (
							<div key={chat.id} className="flex items-start gap-2 lg:gap-3">
								<Popover>
									<PopoverTrigger>
										<Avatar size="md" src={chat.avatar} />
									</PopoverTrigger>
									<PopoverContent className="min-w-72 max-w-min p-1" placement="right top">
										<div className="relative h-32">
											<div className="absolute top-1 right-2 flex items-center gap-x-2">
												<Tooltip>
													<TooltipTrigger className="touch-target p-0.5 text-black/40 hover:text-black">
														<UserPlusIcon className="size-4" />
													</TooltipTrigger>
													<TooltipContent
														inverse
														className="rounded-full font-medium text-xs"
													>
														Add to friends
													</TooltipContent>
												</Tooltip>
												<Menu>
													<Tooltip>
														<MenuTrigger className="touch-target p-0.5 text-black/40 hover:text-black">
															<EllipsisHorizontalIcon className="size-4" />
														</MenuTrigger>
														<TooltipContent
															inverse
															className="rounded-full font-medium text-xs"
														>
															More
														</TooltipContent>
													</Tooltip>
													<MenuContent
														className="min-w-40"
														popover={{
															offset: 16,
															crossOffset: -8,
														}}
														placement="right top"
													>
														<MenuItem>
															<MenuLabel>View profile</MenuLabel>
															<IdentificationIcon />
														</MenuItem>
														<MenuSeparator />
														<MenuItem>
															<MenuLabel>Ignore</MenuLabel>
														</MenuItem>
														<MenuItem intent="danger">
															<MenuLabel>Block</MenuLabel> <NoSymbolIcon />
														</MenuItem>
														<MenuItem intent="danger">
															<MenuLabel>Report</MenuLabel>{" "}
															<ExclamationTriangleIcon />
														</MenuItem>
														<MenuSeparator />
														<MenuItem>
															<MenuLabel>Copy user ID</MenuLabel>
														</MenuItem>
													</MenuContent>
												</Menu>
											</div>
											<img
												className="size-full rounded-[calc(var(--popover-radius)-(--spacing(1)))]"
												src={`https://avatars.laravel.cloud/${chat.username}@intentui.com`}
												alt={`${chat.username} crn`}
											/>
											<Avatar
												className="-mt-18 ml-4 ring-6 ring-overlay"
												size="4xl"
												src={chat.avatar}
											/>
										</div>
										<div className="p-3">
											<span className="mt-2 flex flex-col">
												<strong className="font-semibold text-base/6 text-fg">
													{chat.name}
													<span className="font-normal text-muted-fg text-sm/6">
														<span className="mx-1.5">&middot;</span>@
														{chat.username}
													</span>
												</strong>
											</span>
											<p className="text-muted-fg text-xs/4">{chat.bio}</p>
										</div>
									</PopoverContent>
								</Popover>
								<div className="flex min-w-0 flex-col gap-y-0.5">
									<div className="font-semibold text-sm">{chat.name}</div>
									<RichMessage text={chat.message} />
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="-m-3 sticky bottom-0 z-10 mb-(--layout-gutter) bg-bg/80 backdrop-blur">
					<Form
						onSubmit={(e) => {
							e.preventDefault()
							send(message)
						}}
					>
						<div className="-mb-3 relative flex w-full items-center gap-2 overflow-hidden rounded-xl border border-input bg-(--bg-field) px-3 py-2 [--bg-field:var(--color-muted)]/40">
							<TextField
								aria-label={`Message ${servers[0].name}`}
								className="flex-1"
								value={message}
								onChange={setMessage}
							>
								<TextArea
									ref={inputRef}
									autoFocus
									onKeyDown={(event) => {
										if (
											event.key === "Enter" &&
											!event.shiftKey &&
											!event.nativeEvent.isComposing
										) {
											event.preventDefault()
											send(message)
										}
									}}
									className={twJoin([
										"flex max-h-10 w-full resize-none overflow-hidden overflow-y-auto p-2 text-base outline-hidden duration-200 placeholder:text-muted-fg md:text-sm/6",
										"disabled:cursor-not-allowed disabled:opacity-50",
									])}
									placeholder={`Message ${servers[1].name}`}
								/>
							</TextField>
							<div className="flex items-center justify-end gap-px sm:gap-1">
								<Button size="sq-sm" intent="plain" isCircle>
									<MicrophoneIcon />
								</Button>
								<Button size="sq-sm" intent="plain" isCircle>
									<PaperClipIcon />
								</Button>
								<EmojiPicker onPick={insertAtCursor} />
							</div>
						</div>
					</Form>
				</div>
			</div>
		</div>
	)
}

const chats = [
	{
		id: "chat_01",
		name: "Oliver Wright",
		username: "oliver",
		avatar: "https://randomuser.me/api/portraits/women/1.jpg",
		bio: "Competitive gamer who loves strategy and late-night matches.",
		message:
			"Hey mate 😄 just wanted to say that last game was brilliant. I can’t believe we actually pulled it off in the final round!\nAlso, are you free later tonight to hop on again?",
	},
	{
		id: "chat_02",
		name: "Amelia Green",
		username: "amelia",
		avatar: "https://randomuser.me/api/portraits/women/2.jpg",
		bio: "Casual player, always up for testing new patches.",
		message:
			"Morning 🌞 I saw the patch notes and they’ve finally fixed the bug we kept complaining about.\nShall we give it a try this evening after dinner?",
	},
	{
		id: "chat_03",
		name: "Harry Johnson",
		username: "harry",
		avatar: "https://randomuser.me/api/portraits/women/3.jpg",
		bio: "Loves chaotic plays and funny in-game moments.",
		message:
			"That was hilarious 😂 I still can’t get over how we all rushed in and somehow survived.\nAnyway, let me know if you’re around tomorrow!",
	},
	{
		id: "chat_04",
		name: "Isla Thompson",
		username: "isla",
		avatar: "https://randomuser.me/api/portraits/women/4.jpg",
		bio: "Dedicated grinder always chasing skins and unlocks.",
		message:
			"Quick question ❓ Did you manage to unlock the new skin yet?\nI’ve been grinding for hours and it’s still not dropping 😩",
	},
	{
		id: "chat_05",
		name: "George Robinson",
		username: "george",
		avatar: "https://randomuser.me/api/portraits/women/5.jpg",
		bio: "Team captain who organizes practice sessions.",
		message:
			"Oi, you missed a good one last night 😜 we had a proper laugh.\nDon’t forget we’ve got the tournament practice tomorrow.",
	},
	{
		id: "chat_06",
		name: "Sophia Clark",
		username: "sophia",
		avatar: "https://randomuser.me/api/portraits/women/6.jpg",
		bio: "Tech enthusiast with the latest gaming gear.",
		message:
			"I’m so excited 🎉 finally got my new headset delivered today.\nCan’t wait to test it out later with you all!",
	},
	{
		id: "chat_07",
		name: "Alfie Lewis",
		username: "alfie",
		avatar: "https://randomuser.me/api/portraits/women/7.jpg",
		bio: "Content creator collecting funny clips.",
		message:
			"Bruv that clip you shared had me crying 🤣🤣\nWe’ve got to make a montage of all the silly moments sometime.",
	},
	{
		id: "chat_08",
		name: "Emily Walker",
		username: "emily",
		avatar: "https://randomuser.me/api/portraits/women/8.jpg",
		bio: "Organized host, always setting up lobbies for friends.",
		message:
			"I’ll set up the lobby tonight 👌 just let me know what time works best.\nOh, and don’t forget your mic this time 😅",
	},
	{
		id: "chat_09",
		name: "Charlie Hall",
		username: "charlie",
		avatar: "https://randomuser.me/api/portraits/women/9.jpg",
		bio: "Story-driven gamer who loves campaign modes.",
		message:
			"Guess what! 🎮 I finally finished the campaign mode.\nTook me ages but honestly it was worth it, the ending was mad.",
	},
	{
		id: "chat_10",
		name: "Freya Allen",
		username: "freya",
		avatar: "https://randomuser.me/api/portraits/women/10.jpg",
		bio: "Gear tester, always reviewing new controllers.",
		message:
			"New controller feels amazing 🔥 no more dodgy aim drift.\nShould be way better when we’re in ranked games.",
	},
	{
		id: "chat_11",
		name: "Jacob Young",
		username: "jacob",
		avatar: "https://randomuser.me/api/portraits/women/11.jpg",
		bio: "Always online, always ready for a quick match.",
		message: "Anyone online rn? 👀 I’ve got some time to kill.\nIf not, I’ll just grind solo for a bit.",
	},
	{
		id: "chat_12",
		name: "Poppy King",
		username: "poppy",
		avatar: "https://randomuser.me/api/portraits/women/12.jpg",
		bio: "Design lover with an eye for premium tools.",
		message:
			"Did you know? The components on design.intentui.com are absolutely outstanding. From blocks to full templates, everything feels premium. Just try it for yourself if you don’t believe me. I’m convinced this has been the best investment I’ve ever made with no regrets at all.",
	},
	{
		id: "chat_13",
		name: "Oscar Scott",
		username: "oscar",
		avatar: "https://randomuser.me/api/portraits/women/13.jpg",
		bio: "Laid-back gamer who prefers casual sessions.",
		message:
			"Yo team! 🙌 Who’s down for some casual matches later?\nI don’t feel like ranked stress today 😅",
	},
	{
		id: "chat_14",
		name: "Lily Baker",
		username: "lily",
		avatar: "https://randomuser.me/api/portraits/women/14.jpg",
		bio: "Student balancing school and gaming.",
		message:
			"Finally free from homework 📚 I can actually play tonight.\nI’ve been waiting all week for this, let’s gooo!",
	},
	{
		id: "chat_15",
		name: "Archie Adams",
		username: "archie",
		avatar: "https://randomuser.me/api/portraits/women/15.jpg",
		bio: "Rank climber focused on competitive matches.",
		message:
			"Ranked grind session tomorrow? 💪 I think we’re ready for it.\nLet’s see if we can climb properly this time.",
	},
	{
		id: "chat_16",
		name: "Grace Mitchell",
		username: "grace",
		avatar: "https://randomuser.me/api/portraits/women/16.jpg",
		bio: "Thrives in chaotic but fun gameplay.",
		message:
			"That was absolute chaos 🤯 but honestly some of the best fun we’ve had.\nWe should try that silly strat again sometime.",
	},
	{
		id: "chat_17",
		name: "Theo Carter",
		username: "theo",
		avatar: "https://randomuser.me/api/portraits/women/17.jpg",
		bio: "Night owl always hanging out in voice channels.",
		message: "Online now ⚡ hop in if you’re free.\nI’ll be chilling in voice for a bit.",
	},
	{
		id: "chat_18",
		name: "Evie Turner",
		username: "evie",
		avatar: "https://randomuser.me/api/portraits/women/18.jpg",
		bio: "Video editor capturing the funniest moments.",
		message:
			"Got the clip ready 🎥 I’ll upload it later so we can all laugh at it again.\nYou looked proper shocked in it 😂",
	},
	{
		id: "chat_19",
		name: "Leo Morris",
		username: "leo",
		avatar: "https://randomuser.me/api/portraits/women/19.jpg",
		bio: "Developer and UI enthusiast exploring new tools.",
		message:
			"I came across this React component library called Intent UI (intentui.com), and it’s seriously impressive. Once you try it out, you’ll never want to go back.",
	},
	{
		id: "chat_20",
		name: "Daisy Cooper",
		username: "daisy",
		avatar: "https://randomuser.me/api/portraits/women/20.jpg",
		bio: "Positive energy, keeps the vibes high during games.",
		message:
			"Good vibes only ✨ that last session was jokes.\nAlready looking forward to the weekend grind.",
	},
]
