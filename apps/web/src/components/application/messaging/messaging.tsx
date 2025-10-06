import { FileIcon } from "@untitledui/file-icons"
import { DownloadCloud02, Link03, RefreshCcw02 } from "@untitledui/icons"
import type { ComponentPropsWithRef, ReactNode } from "react"
import { Button as AriaButton } from "react-aria-components"
import { Avatar } from "~/components/base/avatar/avatar"
import { Tooltip } from "~/components/base/tooltip/tooltip"
import IconCopy from "~/components/icons/icon-copy"
import IconEdit from "~/components/icons/icon-edit"
import IconStar from "~/components/icons/icon-star"
import { cx } from "~/utils/cx"

export type Message = {
	id: string
	sentAt?: string
	readAt?: string
	typing?: boolean
	status?: "sent" | "read" | "failed"
	user?: {
		name?: string
		avatarUrl?: string
		status?: "online" | "offline"
		me?: boolean
	}
	text?: ReactNode
	audio?: {
		duration: string
	}
	image?: {
		src: string
		alt: string
		name: string
		size: string
	}
	video?: {
		src: string
		alt: string
	}
	reply?: {
		text: ReactNode
	}
	urlPreview?: {
		title: string
		description: string
	}
	reactions?: {
		content: string
		count: number
	}[]
	attachment?: {
		name: string
		size: string
		type: "jpg" | "txt" | "pdf" | "mp4"
	}
}

interface MessageStatusProps {
	status: "sent" | "read" | "failed"
	readAt?: string
}

export const MessageStatus = ({ status, readAt }: MessageStatusProps) => {
	return (
		<Tooltip
			title={
				status === "sent"
					? "Unread"
					: status === "read"
						? `Read${readAt ? ` ${readAt}` : ""}`
						: "Failed"
			}
		>
			<AriaButton className="focus:outline-hidden">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					{status === "sent" && (
						<path
							d="M13 5L7 11L4 8"
							className="stroke-fg-quaternary"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					)}
					{status === "read" && (
						<path
							d="M10.5 5L4.5 11L1.5 8M14.5 5L8.5 11L6.5 9"
							className="stroke-fg-brand-secondary"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					)}
					{status === "failed" && (
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14ZM7.25 5C7.25 4.58579 7.58579 4.25 8 4.25C8.41421 4.25 8.75 4.58579 8.75 5V8.5C8.75 8.91421 8.41421 9.25 8 9.25C7.58579 9.25 7.25 8.91421 7.25 8.5V5ZM8 11.75C8.41421 11.75 8.75 11.4142 8.75 11C8.75 10.5858 8.41421 10.25 8 10.25C7.58579 10.25 7.25 10.5858 7.25 11C7.25 11.4142 7.58579 11.75 8 11.75Z"
							className="fill-fg-error-primary"
						/>
					)}
				</svg>
			</AriaButton>
		</Tooltip>
	)
}

interface MessageItemProps extends ComponentPropsWithRef<"li"> {
	msg: Message
	showUserLabel?: boolean
}

export const MessageItem = ({ msg, showUserLabel = true, ...props }: MessageItemProps) => {
	const renderActions = () => (
		<div className="dark-mode -bottom-5 absolute right-2 z-1 flex gap-1.5 rounded-lg bg-primary_alt px-2 py-1.5 opacity-0 shadow-xl transition duration-100 ease-linear group-hover/msg:opacity-100">
			<button
				title="Generate with AI"
				aria-label="Generate with AI"
				className="cursor-pointer rounded p-0.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
			>
				<IconStar className="size-4" />
			</button>

			{(msg.text || msg.attachment || msg.audio || msg.image) && (
				<button
					title={msg.text ? "Edit message" : "Download"}
					aria-label={msg.text ? "Edit message" : "Download"}
					className="cursor-pointer rounded p-0.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
				>
					{msg.text ? <IconEdit className="size-4" /> : <DownloadCloud02 className="size-4" />}
				</button>
			)}

			<button
				title="Reply"
				aria-label="Reply"
				className="cursor-pointer rounded p-0.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
			>
				<RefreshCcw02 className="size-4" />
			</button>
			<button
				title="Copy"
				aria-label="Copy"
				className="cursor-pointer rounded p-0.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
			>
				<IconCopy className="size-4" />
			</button>
		</div>
	)

	return (
		<li
			key={msg.id}
			{...props}
			className={cx(
				"relative flex items-start gap-3",
				msg.user?.me ? "self-end pl-10" : "pr-8 lg:pr-10",
				props.className,
			)}
		>
			{msg.user && !msg.user.me && (
				<Avatar src={msg.user.avatarUrl} alt={msg.user.name!} size="md" status={msg.user.status} />
			)}

			<article className="flex min-w-0 flex-1 flex-col gap-1.5">
				{((msg.user && showUserLabel) || msg.sentAt || msg.status) && (
					<header className="flex items-center gap-2">
						{/* User label */}
						{msg.user && showUserLabel && (
							<cite className="flex-1 truncate font-medium text-secondary text-sm not-italic">
								{msg.user.me ? "You" : msg.user.name}
							</cite>
						)}

						{/* Sent at and status */}
						{(msg.sentAt || msg.status) && (
							<div className="flex items-center gap-0.5">
								{msg.sentAt && (
									<time className="text-tertiary text-xs" dateTime={msg.sentAt}>
										{msg.sentAt}
									</time>
								)}
								{msg.status && <MessageStatus status={msg.status} readAt={msg.readAt} />}
							</div>
						)}
					</header>
				)}

				{msg.text ? (
					<div
						className={cx(
							"group/msg relative inset-ring inset-ring-secondary rounded-lg px-3 py-2 text-md text-primary",
							msg.user?.me ? "rounded-tr-none bg-primary pr-4" : "rounded-tl-none bg-secondary",
							// Link styles
							"[&_a]:rounded-sm [&_a]:text-brand-secondary [&_a]:underline [&_a]:underline-offset-2 [&_a]:outline-focus-ring [&_a]:transition [&_a]:duration-100 [&_a]:ease-linear [&_a]:hover:text-brand-secondary_hover [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2",
						)}
					>
						{msg.reply && (
							<blockquote className="relative inset-ring inset-ring-secondary mb-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-tertiary before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border-brand before:border-l-[3px]">
								{msg.reply.text}
							</blockquote>
						)}

						{msg.image && (
							<figure className="mt-1 mb-1.5">
								<img
									src={msg.image.src}
									alt={msg.image.alt}
									className="-outline-offset-[0.5px] w-full rounded-md object-cover outline-1 outline-black/10"
								/>
							</figure>
						)}

						{msg.urlPreview && (
							<aside className="inset-ring inset-ring-secondary mt-1 mb-1.5 flex items-start gap-1.5 rounded-lg bg-primary p-2 pr-3">
								<Link03 className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
								<div className="min-w-0 flex-1">
									<p className="w-full truncate font-medium text-secondary text-sm">
										{msg.urlPreview.title}
									</p>
									<p className="w-full truncate text-sm text-tertiary">
										{msg.urlPreview.description}
									</p>
								</div>
							</aside>
						)}

						{msg.text}

						{renderActions()}
					</div>
				) : msg.image ? (
					<figure className="flex flex-col gap-1.5">
						<div className="group/msg relative">
							<img
								src={msg.image.src}
								alt={msg.image.alt}
								className="-outline-offset-[0.5px] w-full rounded-md object-cover outline-1 outline-black/10"
							/>
							{renderActions()}
						</div>
						<figcaption className="flex items-center gap-1">
							<span className="min-w-0 flex-1 truncate font-medium text-secondary text-sm">
								{msg.image.name}
							</span>
							<span className="text-sm text-tertiary">{msg.image.size}</span>
						</figcaption>
					</figure>
				) : msg.audio ? (
					<div className="group/msg relative flex items-center gap-2 rounded-lg rounded-tl-none bg-primary p-3 ring ring-secondary">
						<button
							aria-label="Play audio message"
							className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-fg-brand-primary_alt outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
						>
							<svg
								width="12.8"
								height="14"
								viewBox="0 0 16 16"
								fill="none"
								className="translate-x-[1px] text-fg-white"
							>
								<path
									d="M2.19995 2.86327C2.19995 1.61155 3.57248 0.844595 4.63851 1.50061L12.9856 6.63731C14.0009 7.26209 14.0009 8.73784 12.9856 9.36262L4.63851 14.4993C3.57247 15.1553 2.19995 14.3884 2.19995 13.1367V2.86327Z"
									fill="currentColor"
								/>
							</svg>
						</button>

						<svg
							width="206"
							height="34"
							viewBox="0 0 206 34"
							fill="none"
							className="flex-1 text-fg-brand-primary_alt"
						>
							<path
								d="M1 15V19M5 15V19M9 15V19M13 15V19M17 9.00005V25M21 5.00005V29M25 1.00005V33M29 1.00005V33M33 5.00005V29M37 13V21M41 9.00005V25M45 13V21M49 5.00005V29M53 5.00005V29M57 9.00005V25M61 9.00005V25M65 1.00005V33M69 1.00005V33M73 5.00005V29M77 1.00005V33M81 9.00005V25M85 13V21M89 15V19.0001M93 15V19.0001M97 13V21.0001M101 13V21.0001M105 9V25.0001M109 5V29.0001M113 1V33.0001M117 5V29.0001M121 5V29.0001M125 5V29.0001M129 9V25.0001M133 13V21.0001M137 9V25.0001M141 13V21.0001M145 9V25.0001M149 5V29.0001M153 5V29.0001M157 9V25.0001M161 1V33.0001M165 5V29.0001M169 9V25.0001M173 13V21.0001M177 15V19.0001M181 9V25.0001M185 5V29.0001M189 5V29.0001M193 9V25.0001M197 15V19.0001M201 15V19.0001M205 15V19.0001"
								stroke="currentColor"
								strokeLinecap="round"
							/>
						</svg>

						<p className="text-tertiary text-xs">{msg.audio.duration}</p>

						{renderActions()}
					</div>
				) : null}

				{msg.attachment && (
					<div className="group/msg relative flex gap-3 rounded-lg rounded-tl-none bg-primary px-3.5 py-2.5 ring ring-secondary">
						<FileIcon type={msg.attachment.type} theme="light" className="size-10 dark:hidden" />
						<FileIcon
							type={msg.attachment.type}
							theme="dark"
							className="not-dark:hidden size-10"
						/>

						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-secondary text-sm">
								{msg.attachment.name}
							</p>
							<p className="text-sm text-tertiary">{msg.attachment.size}</p>
						</div>

						{renderActions()}
					</div>
				)}

				{msg.reactions && msg.reactions.length > 0 && (
					<ul className="flex justify-end gap-1">
						{msg.reactions?.map((reaction) => (
							<li
								key={reaction.content}
								className="inset-ring inset-ring-secondary flex h-6 items-center gap-1 rounded-2xl bg-secondary px-2 py-0.5"
							>
								{reaction.content}

								{reaction.count > 1 && (
									<span className="font-medium text-secondary text-sm">
										{reaction.count}
									</span>
								)}
							</li>
						))}
					</ul>
				)}

				{/* Typing status indicator */}
				{msg.typing && (
					<div className="inset-ring inset-ring-secondary flex h-7 w-10 items-center justify-center gap-1 self-start rounded-lg rounded-tl-none bg-secondary text-md text-primary">
						<div className="size-1 animate-bounce rounded-full bg-fg-tertiary [animation-delay:-0.3s]" />
						<div className="size-1 animate-bounce rounded-full bg-fg-quaternary [animation-delay:-0.15s]" />
						<div className="size-1 animate-bounce rounded-full bg-fg-tertiary" />
					</div>
				)}
			</article>
		</li>
	)
}
