"use client"

import {
  ChatBubbleOvalLeftEllipsisIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from "@heroicons/react/20/solid"
import { BellSlashIcon } from "@heroicons/react/24/outline"
import { Button as PrimitiveButton } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { SidebarTrigger } from "~/components/ui/sidebar"

export function AppNav({ openCmd }: { openCmd: (open: boolean) => void }) {
  return (
    <nav className="sticky top-0 flex items-center justify-between border-b bg-bg px-5 py-1.5">
      <div className="flex items-center gap-2 font-semibold text-sm/6">
        <SidebarTrigger className="sm:-ml-0.5 -ml-2" />
        <Separator className="mr-1.5 h-4" orientation="vertical" />
        <ChatBubbleOvalLeftEllipsisIcon className="hidden size-4 sm:inline" /> General
      </div>
      <div className="flex items-center gap-x-1.5">
        <Button onPress={() => openCmd(true)} aria-label="Search...">
          <MagnifyingGlassIcon />
        </Button>
        <Button aria-label="Threads">
          <ChatBubbleOvalLeftEllipsisIcon />
        </Button>
        <Button aria-label="Turn off notifications">
          <BellSlashIcon />
        </Button>
        <Button aria-label="Members">
          <UsersIcon />
        </Button>
      </div>
    </nav>
  )
}

export function Button(props: React.ComponentProps<typeof PrimitiveButton>) {
  return <PrimitiveButton intent="plain" size="sq-sm" isCircle {...props} />
}
