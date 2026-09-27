'use client'

import { useEffect, useRef, useState } from 'react'
import { Keyboard, SquareFunction } from 'lucide-react'

import { cn } from './cn'
import { MathField, type MathFieldHandle } from './MathField'
import { PALETTE, splitSource, type PaletteItem } from './palette'

/**
 * The answer field: a MathLive editor and a raw-LaTeX editor over the same value.
 *
 * Both modes produce LaTeX, so the stored answer is identical either way and switching mid-answer
 * loses nothing. That is the point — the visual editor removes the barrier to starting, and the
 * LaTeX view is there to learn from, since papers are written in LaTeX rather than clicked.
 *
 * Palette insertion goes through a ref to *this* component's editor. A `document.querySelector`
 * would find the first math field on the page, which on a lesson with twenty exercises means
 * typing into somebody else's card.
 *
 * The LaTeX mode's live preview posts to `/api/render` — every consuming app must serve that route
 * (POST `{ latex }` -> `{ html }`) using the *same* KaTeX configuration (macros included) as its
 * lessons render with, or the preview will silently drift from the final render.
 */
export function MathInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel = 'Answer',
  disabled = false,
  fontsDirectory,
  macros,
}: {
  value: string
  onChange: (latex: string) => void
  onSubmit?: () => void
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
  fontsDirectory?: string
  macros?: Record<string, string>
}) {
  const [mode, setMode] = useState<'visual' | 'latex'>('visual')
  const [preview, setPreview] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const fieldRef = useRef<MathFieldHandle>(null)

  // The LaTeX mode's live preview renders through the server so there is exactly one KaTeX
  // configuration (macros included) rather than a second, subtly different one on the client.
  useEffect(() => {
    if (mode !== 'latex') return
    if (value.trim().length === 0) {
      setPreview('')
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: value }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { html?: string } | null) => {
          if (!cancelled && data?.html) setPreview(data.html)
        })
        .catch(() => undefined)
    }, 180) // Debounced: a preview per keystroke is wasted work.

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [value, mode])

  const insert = (item: PaletteItem) => {
    if (mode === 'visual') {
      fieldRef.current?.insert(item.mathlive)
      return
    }

    // Raw source mode: splice the snippet in at the selection and place the caret at its marker.
    const el = textarea.current
    const { text, caret } = splitSource(item.source)

    if (!el) {
      onChange(value + text)
      return
    }

    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    onChange(value.slice(0, start) + text + value.slice(end))

    // After React has written the new value, put the caret where the template asked for it.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + caret, start + caret)
    })
  }

  return (
    <div className={cn('space-y-2', disabled && 'pointer-events-none opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="pane-scroll flex flex-wrap gap-1 overflow-x-auto">
          {PALETTE.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.wraps ? `${item.title} — wraps what you just typed` : item.title}
              aria-label={item.title}
              // Keep focus in the editor: a mousedown that blurs the field would lose the caret,
              // and the caret is exactly what a wrapping button needs.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(item)}
              className="shrink-0 rounded-md border border-border bg-surface-raised px-2 py-1 font-mono text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMode((m) => (m === 'visual' ? 'latex' : 'visual'))}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
          aria-label={mode === 'visual' ? 'Switch to LaTeX input' : 'Switch to visual editor'}
        >
          {mode === 'visual' ? (
            <>
              <SquareFunction className="size-3.5" aria-hidden />
              LaTeX
            </>
          ) : (
            <>
              <Keyboard className="size-3.5" aria-hidden />
              Visual
            </>
          )}
        </button>
      </div>

      {mode === 'visual' ? (
        <MathField
          ref={fieldRef}
          value={value}
          onChange={onChange}
          {...(onSubmit ? { onEnter: onSubmit } : {})}
          {...(placeholder !== undefined ? { placeholder } : {})}
          ariaLabel={ariaLabel}
          {...(fontsDirectory !== undefined ? { fontsDirectory } : {})}
          {...(macros !== undefined ? { macros } : {})}
        />
      ) : (
        <div className="space-y-2">
          <textarea
            ref={textarea}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && onSubmit) {
                e.preventDefault()
                onSubmit()
              }
            }}
            rows={3}
            spellCheck={false}
            aria-label={`${ariaLabel} (LaTeX source)`}
            placeholder={placeholder ?? '\\frac{1}{2}'}
            className="w-full resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2.5 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
          <div className="min-h-[2.5rem] rounded-lg border border-dashed border-border bg-surface/40 px-3 py-2">
            {preview ? (
              <div
                className="pane-scroll overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            ) : (
              <p className="text-xs text-fg-subtle">Live preview appears here.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
