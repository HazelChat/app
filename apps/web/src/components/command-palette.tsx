"use client"
import { useState } from "react"
import {
  CommandMenu,
  CommandMenuItem, CommandMenuLabel,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
  CommandMenuShortcut,
} from "~/components/ui/command-menu"
import IconSettings01Stroke from "~/components/icons/IconSettings01Stroke";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <CommandMenu shortcut="k" isOpen={isOpen} onOpenChange={setIsOpen}>
      <CommandMenuSearch placeholder="Quick search..." />
      <CommandMenuList>
        <CommandMenuSection>
          <CommandMenuItem href="#" textValue="home">
            <IconSettings01Stroke/>
            <CommandMenuLabel>Settings</CommandMenuLabel>
          </CommandMenuItem>
          <CommandMenuItem href="#" textValue="orders">
            <CommandMenuLabel>Orders</CommandMenuLabel>
            <CommandMenuShortcut keys="⌘o" />
          </CommandMenuItem>
          <CommandMenuItem href="#" textValue="products">
            <CommandMenuLabel>Products</CommandMenuLabel>
            <CommandMenuShortcut keys="⌘p" />
          </CommandMenuItem>
          <CommandMenuItem href="#" textValue="collections">
            <CommandMenuLabel>Collections</CommandMenuLabel>
            <CommandMenuShortcut keys="⌘⇧c" />
          </CommandMenuItem>
        </CommandMenuSection>
      </CommandMenuList>
    </CommandMenu>
  )
}
