import { AlertCircle, CheckCircle, InfoCircle } from "@untitledui/icons"
import type { FC } from "react"
import { Avatar } from "~/components/base/avatar/avatar"
import { Button } from "~/components/base/buttons/button"
import { CloseButton } from "~/components/base/buttons/close-button"
import { ProgressBar } from "~/components/base/progress-indicators/progress-indicators"
import { FeaturedIcon } from "~/components/foundations/featured-icon/featured-icons"
import { cx } from "~/utils/cx"

const iconMap = {
	default: InfoCircle,
	brand: InfoCircle,
	gray: InfoCircle,
	error: AlertCircle,
	warning: AlertCircle,
	success: CheckCircle,
}

interface IconNotificationProps {
	title: string
	description: string
	confirmLabel?: string
	dismissLabel?: string
	hideDismissLabel?: boolean
	icon?: FC<{ className?: string }>
	color?: "default" | "brand" | "gray" | "error" | "warning" | "success"
	progress?: number
	onClose?: () => void
	onConfirm?: () => void
}

export const IconNotification = ({
	title,
	description,
	confirmLabel,
	dismissLabel = "Dismiss",
	hideDismissLabel,
	icon,
	progress,
	onClose,
	onConfirm,
	color = "default",
}: IconNotificationProps) => {
	const showProgress = typeof progress === "number"

	return (
		<div className="relative z-[var(--z-index)] flex xs:w-[var(--width)] max-w-full xs:flex-row flex-col gap-4 rounded-xl bg-primary_alt p-4 shadow-lg ring ring-secondary_alt">
			<FeaturedIcon
				icon={icon || iconMap[color]}
				color={color === "default" ? "gray" : color}
				theme={color === "default" ? "modern" : "outline"}
				size="md"
			/>

			<div
				className={cx(
					"flex flex-1 flex-col gap-3 md:pr-8",
					color !== "default" && "md:pt-0.5",
					showProgress && "gap-4",
				)}
			>
				<div className="flex flex-col gap-1">
					<p className="font-semibold text-fg-primary text-sm">{title}</p>
					<p className="text-fg-secondary text-sm">{description}</p>
				</div>

				{showProgress && (
					<ProgressBar
						labelPosition="bottom"
						value={progress}
						valueFormatter={(value) => `${value}% uploaded...`}
					/>
				)}

				<div className="flex gap-3">
					{!hideDismissLabel && (
						<Button onClick={onClose} size="sm" color="link-gray">
							{dismissLabel}
						</Button>
					)}
					{confirmLabel && (
						<Button onClick={onConfirm} size="sm" color="link-color">
							{confirmLabel}
						</Button>
					)}
				</div>
			</div>

			<div className="absolute top-2 right-2 flex items-center justify-center">
				<CloseButton onClick={onClose} size="sm" label="Dismiss" />
			</div>
		</div>
	)
}

interface AvatarNotificationProps {
	name: string
	content: string
	avatar: string
	date: string
	confirmLabel: string
	dismissLabel?: string
	hideDismissLabel?: boolean
	icon?: FC<{ className?: string }>
	color?: "default" | "brand" | "gray" | "error" | "warning" | "success"
	onClose?: () => void
	onConfirm?: () => void
}

export const AvatarNotification = ({
	name,
	content,
	avatar,
	confirmLabel,
	dismissLabel = "Dismiss",
	hideDismissLabel,
	date,
	onClose,
	onConfirm,
}: AvatarNotificationProps) => {
	return (
		<div className="relative z-[var(--z-index)] flex xs:w-[var(--width)] max-w-full xs:flex-row flex-col items-start gap-4 rounded-xl bg-primary_alt p-4 shadow-lg ring ring-secondary_alt">
			<Avatar size="md" src={avatar} alt={name} status="online" />

			<div className="flex flex-col gap-3 pr-8">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<p className="font-semibold text-fg-primary text-sm">{name}</p>
						<span className="text-fg-quaternary text-sm">{date}</span>
					</div>
					<p className="text-fg-secondary text-sm">{content}</p>
				</div>

				<div className="flex gap-3">
					{!hideDismissLabel && (
						<Button onClick={onClose} size="sm" color="link-gray">
							{dismissLabel}
						</Button>
					)}
					{confirmLabel && (
						<Button onClick={onConfirm} size="sm" color="link-color">
							{confirmLabel}
						</Button>
					)}
				</div>
			</div>

			<div className="absolute top-2 right-2 flex items-center justify-center">
				<CloseButton onClick={onClose} size="sm" label="Dismiss" />
			</div>
		</div>
	)
}

interface ImageNotificationProps {
	title: string
	description: string
	confirmLabel: string
	dismissLabel?: string
	hideDismissLabel?: boolean
	imageMobile: string
	imageDesktop: string
	onClose?: () => void
	onConfirm?: () => void
}

export const ImageNotification = ({
	title,
	description,
	confirmLabel,
	dismissLabel = "Dismiss",
	hideDismissLabel,
	imageMobile,
	imageDesktop,
	onClose,
	onConfirm,
}: ImageNotificationProps) => {
	return (
		<div
			style={
				{
					"--width": "496px",
				} as React.CSSProperties
			}
			className="relative z-[var(--z-index)] flex xs:w-[var(--width)] max-w-full xs:flex-row flex-col gap-3 xs:gap-0 rounded-xl bg-primary_alt p-4 shadow-lg max-md:ring max-md:ring-secondary_alt md:p-0"
		>
			<div className="-my-px -outline-offset-1 hidden w-40 shrink-0 overflow-hidden rounded-l-xl outline-1 outline-black/10 md:block">
				<img
					aria-hidden="true"
					src={imageMobile}
					alt="Image Mobile"
					className="t size-full object-cover"
				/>
			</div>

			<div className="flex flex-col gap-4 rounded-r-xl bg-primary_alt md:gap-3 md:p-4 md:pl-5 md:ring md:ring-secondary_alt">
				<div className="flex flex-col gap-1 pr-8">
					<p className="font-semibold text-fg-primary text-sm">{title}</p>
					<p className="text-fg-secondary text-sm">{description}</p>
				</div>

				<div className="h-40 w-full overflow-hidden rounded-md bg-secondary md:hidden">
					<img src={imageDesktop} alt="Image Desktop" className="size-full object-cover" />
				</div>

				<div className="flex gap-3">
					{!hideDismissLabel && (
						<Button onClick={onClose} size="sm" color="link-gray">
							{dismissLabel}
						</Button>
					)}
					{confirmLabel && (
						<Button onClick={onConfirm} size="sm" color="link-color">
							{confirmLabel}
						</Button>
					)}
				</div>
			</div>

			<div className="absolute top-2 right-2 flex items-center justify-center">
				<CloseButton onClick={onClose} size="sm" label="Dismiss" />
			</div>
		</div>
	)
}
