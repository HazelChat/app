import { twMerge } from "tailwind-merge"
import type { User } from "~/lib/schema"

export function UserTag(props: { user: User, className?: string }) {
    return <span class={twMerge(props.className, "text-muted-foreground text-sm hover:underline")}>@{props.user.tag}</span>   
}