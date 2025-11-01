"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "~/components/ui/link"

interface Microlink {
  status: string
  data?: {
    url?: string
    title?: string
    description?: string
    image?: { url?: string }
    logo?: { url?: string }
    publisher?: string
  }
}

export function RichMessage({ text }: { text: string }) {
  const urls = useMemo(() => extractUrls(text), [text])
  const previewUrl = urls.length ? normalizeUrl(urls[urls.length - 1]) : null

  return (
    <div className="max-w-xl">
      <div className="whitespace-pre-line text-pretty text-sm/6">{text}</div>
      {previewUrl && <LinkPreview url={previewUrl} />}
    </div>
  )
}

function LinkPreview({ url }: { url: string }) {
  const [og, setOg] = useState<Microlink["data"] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((j: Microlink) => {
        if (!alive) return
        setOg(j.status === "success" ? (j.data ?? null) : null)
      })
      .catch(() => {
        if (!alive) return
        setOg(null)
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [url])

  const host = useMemo(() => {
    try {
      return new URL(og?.url || url).host
    } catch {
      return ""
    }
  }, [og, url])

  return (
    <Link
      href={og?.url || url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block max-w-sm overflow-hidden rounded-lg border pressed:border-fg/15 bg-muted/40 pressed:bg-muted hover:border-fg/15 hover:bg-muted"
    >
      {og?.image?.url && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img src={og.image.url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-start border-t p-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm">{og?.title || host || url}</div>
          {og?.description && (
            <div className="mt-0.5 line-clamp-2 text-[12px] text-fg/70">{og.description}</div>
          )}
          <div className="mt-1 text-[11px] text-primary-subtle-fg">{host}</div>
        </div>
      </div>
      {loading && <div className="px-3 pb-3 text-[11px] text-muted-fg">Loading preview…</div>}
    </Link>
  )
}

function extractUrls(input: string): string[] {
  const re =
    /(https?:\/\/[^\s)]+|www\.[^\s)]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s)]*)?)/gi
  const found: string[] = []
  let m: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: ...
  while ((m = re.exec(input))) {
    const raw = stripTrailingPunct(m[0])
    const href = normalizeUrl(raw)
    if (!found.includes(href)) found.push(href)
  }
  return found
}

function stripTrailingPunct(v: string): string {
  return v.replace(/[),.;!?]+$/g, "")
}

function normalizeUrl(value: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  if (/^www\./i.test(v)) return `https://${v}`
  return `https://${v}`
}
