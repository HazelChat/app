"use client"

import {
  AdjustmentsHorizontalIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowRightStartOnRectangleIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ChevronUpDownIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  FolderPlusIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PlusCircleIcon,
  PlusIcon,
  ShieldCheckIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid"
import { useState } from "react"
import type { Selection } from "react-aria-components"
import { Button as PrimitiveButton } from "react-aria-components"
import { twJoin } from "tailwind-merge"
import { Avatar } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import {
  ChoiceBox,
  ChoiceBoxDescription,
  ChoiceBoxItem,
  ChoiceBoxLabel,
} from "~/components/ui/choice-box"
import { Label } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Keyboard } from "~/components/ui/keyboard"
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuLabel,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "~/components/ui/menu"
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "~/components/ui/modal"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSectionGroup,
  useSidebar,
} from "~/components/ui/sidebar"
import { Strong } from "~/components/ui/text"
import { TextField } from "~/components/ui/text-field"
import { servers } from "~/components/server-sidebar"

export const selectedServer = [
  {
    id: "text",
    name: "Text channels",
    items: [
      { id: "chn_01", name: "general", href: "#" },
      { id: "chn_02", name: "memes", href: "#" },
      { id: "chn_03", name: "game-news", href: "#" },
      { id: "chn_04", name: "off-topic", href: "#" },
      { id: "chn_05", name: "tournaments", href: "#" },
    ],
  },
  {
    id: "voice",
    name: "Voice channels",
    items: [
      { id: "chn_11", name: "Lobby", href: "#" },
      { id: "chn_12", name: "Casual play", href: "#" },
      { id: "chn_13", name: "Ranked matches", href: "#" },
    ],
  },
  {
    id: "forum",
    name: "Forum",
    items: [
      { id: "chn_19", name: "announcements", href: "#" },
      { id: "chn_20", name: "patch-notes", href: "#" },
      { id: "chn_21", name: "game-strategies", href: "#" },
      { id: "chn_22", name: "modding-community", href: "#" },
    ],
  },
]

export function ChannelsSidebar({ openCmd }: { openCmd: (open: boolean) => void }) {
  const [isSelected, setIsSelected] = useState<Selection>(new Set([servers[1].id]))
  const { isMobile } = useSidebar()
  const currentServer = [...isSelected][0]
  return (
    <Sidebar collapsible="none" className="flex flex-1">
      <SidebarHeader className="border-b py-4">
        <Menu>
          <PrimitiveButton className="relative flex items-center justify-between gap-x-2 font-semibold outline-hidden focus-visible:ring focus-visible:ring-primary">
            <div className="flex w-full items-center gap-1">
              <span className="flex gap-x-2 font-medium text-sm/6">
                <Avatar
                  isSquare
                  size="sm"
                  src={servers.find((i) => i.id === currentServer)?.avatar}
                />
                {servers.find((i) => i.id === currentServer)?.name}
              </span>
              <ChevronUpDownIcon className="ml-auto size-4 text-muted-fg" />
            </div>
          </PrimitiveButton>
          <MenuContent className="min-w-(--trigger-width)">
            {isMobile ? (
              <MenuSection
                items={servers}
                disallowEmptySelection
                selectionMode="single"
                selectedKeys={isSelected}
                onSelectionChange={setIsSelected}
              >
                {(server) => (
                  <MenuItem id={server.id} textValue={server.name}>
                    <Avatar src={server.avatar} alt={server.name} />
                    <SidebarLabel>{server.name}</SidebarLabel>
                  </MenuItem>
                )}
              </MenuSection>
            ) : (
              <>
                <MenuSection>
                  <MenuItem href="#">
                    <UserPlusIcon />
                    <MenuLabel>Invite people</MenuLabel>
                  </MenuItem>
                  <MenuItem href="#">
                    <UserGroupIcon />
                    <MenuLabel>Manage members</MenuLabel>
                  </MenuItem>
                </MenuSection>

                <MenuSeparator />

                <MenuSection>
                  <MenuItem href="#">
                    <PlusCircleIcon />
                    <MenuLabel>Create channel</MenuLabel>
                  </MenuItem>
                  <MenuItem href="#">
                    <FolderPlusIcon />
                    <MenuLabel>Create category</MenuLabel>
                  </MenuItem>
                  <MenuItem href="#">
                    <CalendarDaysIcon />
                    <MenuLabel>Create event</MenuLabel>
                  </MenuItem>
                </MenuSection>

                <MenuSeparator />

                <MenuSection>
                  <MenuItem href="#">
                    <Cog6ToothIcon />
                    <MenuLabel>Server settings</MenuLabel>
                  </MenuItem>
                  <MenuItem href="#">
                    <ShieldCheckIcon />
                    <MenuLabel>Roles & permissions</MenuLabel>
                  </MenuItem>
                  <MenuItem href="#">
                    <AdjustmentsHorizontalIcon />
                    <MenuLabel>Notification settings</MenuLabel>
                  </MenuItem>
                  <MenuItem href="#">
                    <FaceSmileIcon />
                    <MenuLabel>Custom emojis</MenuLabel>
                  </MenuItem>
                  <MenuItem href="#">
                    <WrenchScrewdriverIcon />
                    <MenuLabel>Integrations</MenuLabel>
                  </MenuItem>
                </MenuSection>

                <MenuSeparator />

                <MenuSection>
                  <MenuItem href="#">
                    <ExclamationTriangleIcon />
                    <MenuLabel>Report server</MenuLabel>
                  </MenuItem>
                  <MenuItem intent="danger" href="#">
                    <ArrowRightEndOnRectangleIcon />
                    <MenuLabel>Leave server</MenuLabel>
                  </MenuItem>
                </MenuSection>
              </>
            )}
          </MenuContent>
        </Menu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSectionGroup>
          <SidebarSection aria-label="Goto">
            <SidebarItem href="#">
              <CalendarDaysIcon />
              <SidebarLabel>Events</SidebarLabel>
            </SidebarItem>
            <SidebarItem onPress={() => openCmd(true)}>
              <MagnifyingGlassIcon />
              <SidebarLabel>Browse channels</SidebarLabel>
              <Keyboard className="-translate-y-1/2 absolute top-1/2 right-2 font-mono text-muted-fg text-xs">
                ⌘K
              </Keyboard>
            </SidebarItem>
            <SidebarItem href="#">
              <UsersIcon />
              <SidebarLabel>Members</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
          <SidebarSection label="Information">
            <SidebarItem href="#">
              <MegaphoneIcon />
              <SidebarLabel>Announcements</SidebarLabel>
            </SidebarItem>
            <SidebarItem href="#">
              <DocumentTextIcon />
              <SidebarLabel>Rules</SidebarLabel>
            </SidebarItem>
          </SidebarSection>
          {selectedServer.map((group) => (
            <SidebarSection id={group.id} key={group.id}>
              <div className="col-span-full flex items-center justify-between gap-x-2 pl-2.5 text-muted-fg text-xs/5">
                <Strong>{group.name}</Strong>
                <Modal>
                  <Button intent="plain" isCircle size="sq-sm">
                    <PlusIcon />
                  </Button>
                  <ModalContent>
                    {({ close }) => (
                      <>
                        <div className="flex items-center gap-x-(--gp) p-(--gutter) pb-(--gp) [--gp:calc(var(--gutter)/2)]">
                          <div className="inset-ring inset-ring-primary-subtle-fg/20 grid size-12 shrink-0 place-content-center rounded-xl bg-primary-subtle text-primary-subtle-fg">
                            {group.id === "text" && (
                              <ChatBubbleOvalLeftEllipsisIcon className="size-6" />
                            )}
                            {group.id === "forum" && <ChatBubbleLeftRightIcon className="size-6" />}
                            {group.id === "voice" && <SpeakerWaveIcon className="size-6" />}
                          </div>
                          <ModalHeader
                            className="p-0"
                            title={`New ${group.id} channel`}
                            description={`Set up a new ${group.id} channel for your server.`}
                          />
                        </div>
                        <ModalBody>
                          <TextField className="w-full">
                            <Label>Channel name</Label>
                            <Input placeholder="e.g. Design discussion" />
                          </TextField>
                          <div className="mt-4 flex flex-col gap-y-1">
                            <Label className="font-medium">Visibility</Label>
                            <ChoiceBox defaultSelectedKeys={["public"]}>
                              <ChoiceBoxItem id="public">
                                <ChoiceBoxLabel>Public</ChoiceBoxLabel>
                                <ChoiceBoxDescription>
                                  Anyone can view and join this channel
                                </ChoiceBoxDescription>
                              </ChoiceBoxItem>
                              <ChoiceBoxItem id="private">
                                <ChoiceBoxLabel>Private</ChoiceBoxLabel>
                                <ChoiceBoxDescription>
                                  Only selected members can view and join this channel
                                </ChoiceBoxDescription>
                              </ChoiceBoxItem>
                            </ChoiceBox>
                          </div>
                        </ModalBody>
                        <ModalFooter>
                          <ModalClose>Cancel</ModalClose>
                          <Button onPress={close}>Create channel</Button>
                        </ModalFooter>
                      </>
                    )}
                  </ModalContent>
                </Modal>
              </div>
              <>
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    href={item.href}
                    tooltip={item.name}
                    isCurrent={item.name === "general"}
                  >
                    {group.id === "text" ? (
                      <ChatBubbleOvalLeftEllipsisIcon />
                    ) : group.id === "forum" ? (
                      <ChatBubbleLeftRightIcon />
                    ) : (
                      <SpeakerWaveIcon />
                    )}
                    <SidebarLabel>{item.name}</SidebarLabel>
                  </SidebarItem>
                ))}
              </>
            </SidebarSection>
          ))}
        </SidebarSectionGroup>
      </SidebarContent>
      <SidebarFooter className="flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col">
        <Menu>
          <MenuTrigger
            className="flex w-full items-center justify-between rounded-lg border bg-accent/20 px-2 py-1 hover:bg-accent/50"
            aria-label="Profile"
          >
            <div className="flex items-center gap-x-2">
              <Avatar
                className={twJoin([
                  "[--avatar-radius:7%] group-data-[state=collapsed]:size-6 group-data-[state=collapsed]:*:size-6",
                  "size-8 *:size-8",
                ])}
                isSquare
                src="https://design.intentui.com/images/blocks/avatar/woman.webp"
              />

              <div className="in-data-[collapsible=dock]:hidden text-sm">
                <SidebarLabel>Poppy Ellsworth</SidebarLabel>
                <span className="-mt-0.5 block text-muted-fg">ellsworth@domain.com</span>
              </div>
            </div>
            <ChevronUpDownIcon data-slot="chevron" className="size-4" />
          </MenuTrigger>
          <MenuContent
            className="in-data-[collapsible=collapsed]:min-w-56 min-w-(--trigger-width)"
            placement="bottom right"
          >
            <MenuSection>
              <MenuHeader separator>
                <span className="block">Poppy Ellsworth</span>
                <span className="font-normal text-muted-fg">ellsworth@domain.com</span>
              </MenuHeader>
            </MenuSection>

            <MenuItem href="#dashboard">
              <ChartPieIcon />
              <MenuLabel>Dashboard</MenuLabel>
            </MenuItem>
            <MenuItem href="#settings">
              <Cog6ToothIcon />
              <MenuLabel>Settings</MenuLabel>
            </MenuItem>
            <MenuItem href="#security">
              <ShieldCheckIcon />
              <MenuLabel>Security</MenuLabel>
            </MenuItem>
            <MenuSeparator />

            <MenuItem href="#contact">
              <ChatBubbleLeftRightIcon />
              <MenuLabel>Customer support</MenuLabel>
            </MenuItem>
            <MenuSeparator />
            <MenuItem href="#logout">
              <ArrowRightStartOnRectangleIcon />
              <MenuLabel>Log out</MenuLabel>
            </MenuItem>
          </MenuContent>
        </Menu>
      </SidebarFooter>
    </Sidebar>
  )
}
