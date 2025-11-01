import { FaceSmileIcon } from "@heroicons/react/20/solid"
import { useEffect, useMemo, useState } from "react"
import type { Key } from "react-aria-components"
import {
  Autocomplete,
  GridLayout,
  ListBox,
  ListBoxItem,
  Select,
  SelectValue,
  Size,
  useFilter,
  Virtualizer,
} from "react-aria-components"
import { Button } from "~/components/ui/button"
import { PopoverContent } from "~/components/ui/popover"
import { SearchField, SearchInput } from "~/components/ui/search-field"

type RawEmoji = {
  label?: string
  tags?: string[]
  unicode?: string
  emoji?: string
}

type EmojiItemShape = {
  label: string
  unicode: string
  tags?: string[]
}

type EmojiPickerProps = React.ComponentProps<typeof Select> & {
  onPick?: (unicode: string) => void
}

function useEmojis(url: string) {
  const [data, setData] = useState<EmojiItemShape[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<RawEmoji[]>)
      .then((rows) => {
        const mapped = rows
          .map<EmojiItemShape | null>((r) => {
            const unicode = r.unicode || r.emoji || ""
            const label = r.label || ""
            if (!unicode || !label) return null
            return { unicode, label, tags: r.tags }
          })
          .filter((x): x is EmojiItemShape => !!x)
          .filter((e) => !e.label.toLowerCase().startsWith("regional indicator"))
        setData(mapped)
        setReady(true)
      })
      .catch(() => setReady(true))
    return () => ctrl.abort()
  }, [url])

  return { data, ready }
}

export function EmojiPicker(props: EmojiPickerProps) {
  const { contains } = useFilter({ sensitivity: "base" })
  const { data: emojis } = useEmojis(
    "https://raw.githubusercontent.com/milesj/emojibase/refs/heads/master/packages/data/en/data.raw.json",
  )
  const items = useMemo(() => emojis, [emojis])
  const byId = useMemo(() => {
    const m = new Map<string, EmojiItemShape>()
    for (const e of items) m.set(e.unicode, e)
    return m
  }, [items])
  const [selectedKey, setSelectedKey] = useState<Key | null>(null)

  return (
    <Select
      {...props}
      aria-label="Emoji"
      selectedKey={selectedKey}
      onSelectionChange={(key) => {
        const k = String(key)
        const e = byId.get(k)
        if (e) props.onPick?.(e.unicode)
        setSelectedKey(key)
      }}
    >
      <Button size="sq-sm" intent="plain" isCircle>
        <SelectValue>
          {({ isPlaceholder, defaultChildren }) =>
            isPlaceholder ? <FaceSmileIcon className="block size-4" /> : defaultChildren
          }
        </SelectValue>
      </Button>
      <PopoverContent className="min-w-72" placement="top end">
        <Autocomplete filter={contains}>
          <div className="box-border flex h-[350px] max-h-inherit flex-col gap-2.5 p-2">
            <SearchField aria-label="Search" autoFocus className="w-full">
              <SearchInput
                className="outline-hidden ring-0"
                placeholder="Eg: handshake, smile, ..."
              />
            </SearchField>
            <Virtualizer
              layout={GridLayout}
              layoutOptions={{
                minItemSize: new Size(32, 32),
                maxItemSize: new Size(32, 32),
                minSpace: new Size(4, 4),
                preserveAspectRatio: true,
              }}
            >
              <ListBox
                items={items}
                aria-label="Emoji list"
                layout="grid"
                className="max-h-full w-full flex-1 overflow-auto [scroll-padding-bottom:4px] [scroll-padding-top:4px]"
              >
                {(item) => <EmojiRow id={item.unicode} item={item} />}
              </ListBox>
            </Virtualizer>
          </div>
        </Autocomplete>
      </PopoverContent>
    </Select>
  )
}

function EmojiRow({ id, item }: { id: string; item: EmojiItemShape }) {
  return (
    <ListBoxItem
      id={id}
      value={item}
      textValue={item.label + (item.tags || []).join(" ")}
      className="flex size-full cursor-default items-center justify-center rounded-lg pressed:bg-warning-subtle selected:bg-warning-subtle text-2xl hover:bg-warning-subtle focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      {item.unicode}
    </ListBoxItem>
  )
}
