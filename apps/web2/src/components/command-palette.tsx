import {
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/20/solid"
import { Avatar } from "~/components/ui/avatar"
import {
  CommandMenu,
  CommandMenuItem,
  CommandMenuLabel,
  CommandMenuList,
  type CommandMenuProps,
  CommandMenuSearch,
  CommandMenuSection,
} from "~/components/ui/command-menu"
import { selectedServer } from "~/components/channels-sidebar"
import { servers } from "~/components/server-sidebar"

export function CommandPalette(props: Pick<CommandMenuProps, "isOpen" | "onOpenChange">) {
  return (
    <CommandMenu className="bg-zinc-100 p-1 dark:bg-zinc-900" shortcut="k" {...props}>
      <CommandMenuSearch placeholder="Quick search..." />
      <CommandMenuList className="inset-ring inset-ring-border rounded-[calc(var(--radius-xl)-1px)] border-t-0 bg-bg shadow-xs">
        {selectedServer.map((group) => (
          <CommandMenuSection
            className="first:pt-2"
            label={group.name}
            id={group.id}
            key={group.id}
          >
            {group.items.map((item) => (
              <CommandMenuItem
                key={item.id}
                href={item.href}
                textValue={`${group.name} ${item.name}`}
              >
                {group.id === "text" ? (
                  <ChatBubbleOvalLeftEllipsisIcon />
                ) : group.id === "forum" ? (
                  <ChatBubbleLeftRightIcon />
                ) : (
                  <SpeakerWaveIcon />
                )}
                <CommandMenuLabel>{item.name}</CommandMenuLabel>
              </CommandMenuItem>
            ))}
          </CommandMenuSection>
        ))}

        <CommandMenuSection label="Other servers" items={servers}>
          {(item) => (
            <CommandMenuItem href="#" textValue={item.name}>
              <Avatar isSquare src={item.avatar} />
              <CommandMenuLabel>{item.name}</CommandMenuLabel>
            </CommandMenuItem>
          )}
        </CommandMenuSection>
      </CommandMenuList>
    </CommandMenu>
  )
}
