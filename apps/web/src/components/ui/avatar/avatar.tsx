import { type FC, type ReactNode, useState } from "react"
import IconCircleDottedUser from "~/components/icons/icon-circle-dotted-user"
import { cx } from "~/utils/cx"
import { AvatarOnlineIndicator, VerifiedTick } from "./base-components"

type AvatarSize =
	| "xxs"
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl"
	| "5xl"
	| "6xl"
	| "7xl"
	| "8xl"
	| "9xl"

export interface AvatarProps {
	size?: AvatarSize
	className?: string
	src?: string | null
	alt?: string
	/**
	 * Display a contrast border around the avatar.
	 */
	contrastBorder?: boolean
	/**
	 * Display a badge (i.e. company logo).
	 */
	badge?: ReactNode
	/**
	 * Display a status indicator.
	 */
	status?: "online" | "offline"
	/**
	 * Display a verified tick icon.
	 *
	 * @default false
	 */
	verified?: boolean

	/**
	 * The initials of the user to display if no image is available.
	 */
	initials?: string
	/**
	 * An icon to display if no image is available.
	 */
	placeholderIcon?: FC<{ className?: string }>
	/**
	 * A placeholder to display if no image is available.
	 */
	placeholder?: ReactNode

	/**
	 * Whether the avatar should show a focus ring when the parent group is in focus.
	 * For example, when the avatar is wrapped inside a link.
	 *
	 * @default false
	 */
	focusable?: boolean

	/**
	 * Whether the avatar should be square instead of circular.
	 *
	 * @default false
	 */
	isSquare?: boolean
}

const styles = {
	xxs: {
		root: "size-4 outline-[0.5px] -outline-offset-[0.5px]",
		initials: "text-xs font-semibold",
		icon: "size-3",
	},
	xs: {
		root: "size-6 outline-[0.5px] -outline-offset-[0.5px]",
		initials: "text-xs font-semibold",
		icon: "size-4",
	},
	sm: {
		root: "size-8 outline-[0.75px] -outline-offset-[0.75px]",
		initials: "text-sm font-semibold",
		icon: "size-5",
	},
	md: { root: "size-10 outline-1 -outline-offset-1", initials: "text-md font-semibold", icon: "size-6" },
	lg: { root: "size-12 outline-1 -outline-offset-1", initials: "text-lg font-semibold", icon: "size-7" },
	xl: { root: "size-14 outline-1 -outline-offset-1", initials: "text-xl font-semibold", icon: "size-8" },
	"2xl": {
		root: "size-16 outline-1 -outline-offset-1",
		initials: "text-display-xs font-semibold",
		icon: "size-8",
	},
	"3xl": {
		root: "size-20 outline-1 -outline-offset-1",
		initials: "text-display-sm font-semibold",
		icon: "size-10",
	},
	"4xl": {
		root: "size-24 outline-1 -outline-offset-1",
		initials: "text-display-md font-semibold",
		icon: "size-12",
	},
	"5xl": {
		root: "size-28 outline-1 -outline-offset-1",
		initials: "text-display-lg font-semibold",
		icon: "size-14",
	},
	"6xl": {
		root: "size-32 outline-1 -outline-offset-1",
		initials: "text-display-xl font-semibold",
		icon: "size-16",
	},
	"7xl": {
		root: "size-36 outline-1 -outline-offset-1",
		initials: "text-display-2xl font-semibold",
		icon: "size-18",
	},
	"8xl": {
		root: "size-40 outline-1 -outline-offset-1",
		initials: "text-display-2xl font-semibold",
		icon: "size-20",
	},
	"9xl": {
		root: "size-44 outline-1 -outline-offset-1",
		initials: "text-display-2xl font-semibold",
		icon: "size-24",
	},
}

export const Avatar = ({
	contrastBorder = false,
	size = "md",
	src,
	alt,
	initials,
	placeholder,
	placeholderIcon: PlaceholderIcon,
	badge,
	status,
	verified,
	focusable = false,
	isSquare = true,
	className,
}: AvatarProps) => {
	const [isFailed, setIsFailed] = useState(false)

	const renderMainContent = () => {
		if (src && !isFailed) {
			return (
				<img
					data-avatar-img
					className={cx("size-full object-cover", isSquare ? "rounded-xl" : "rounded-full")}
					style={{
						// @ts-expect-error
						cornerShape: "squircle",
					}}
					src={src}
					alt={alt}
					onError={() => setIsFailed(true)}
				/>
			)
		}

		if (initials) {
			return <span className={cx("text-quaternary", styles[size].initials)}>{initials}</span>
		}

		if (PlaceholderIcon) {
			return <PlaceholderIcon className={cx("text-muted-fg", styles[size].icon)} />
		}

		return placeholder || <IconCircleDottedUser className={cx("text-muted-fg", styles[size].icon)} />
	}

	const renderBadgeContent = () => {
		if (status) {
			return <AvatarOnlineIndicator status={status} size={size === "xxs" ? "xs" : size} />
		}

		if (verified) {
			return (
				<VerifiedTick
					size={size === "xxs" ? "xs" : size}
					className={cx(
						"absolute right-0 bottom-0",
						(size === "xxs" || size === "xs") && "-right-px -bottom-px",
					)}
				/>
			)
		}

		return badge
	}

	return (
		<div
			data-avatar
			data-slot="avatar"
			className={cx(
				"relative inline-flex shrink-0 items-center justify-center bg-muted outline-transparent",
				isSquare ? "rounded-xl" : "rounded-full",
				// Focus styles
				focusable && "ring-ring group-focus-visible:outline-2 group-focus-visible:outline-offset-2",
				contrastBorder && "outline outline-border",
				styles[size].root,
				className,
			)}
			style={{
				// @ts-expect-error
				cornerShape: "squircle",
			}}
		>
			{renderMainContent()}
			{renderBadgeContent()}
		</div>
	)
}
