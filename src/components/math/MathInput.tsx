'use client'

import { useEffect, useRef, useState } from 'react'
import { Keyboard, SquareFunction } from 'lucide-react'

import { cn } from '@/lib/utils'

import { MathField, type MathFieldHandle } from './MathField'

/**
 * The answer field: a MathLive editor and a raw-LaTeX editor over the same value.
 *
 * Both modes produce LaTeX, so the stored answer is identical either way and switching mid-answer
 * loses nothing. That is the point — the visual editor removes the barrier to starting, and the
 * LaTeX view is there to learn from, since papers are written in LaTeX rather than clicked.
 */

const PALETTE: { label: string; latex: string; title: string }[] = [
  { label: '( )', latex: '\\left(#0\\right)', title: 'Parentheses' },
  { label: '⎡ ⎤', latex: '\\begin{pmatrix}#0\\end{pmatrix}', title: 'Matrix / column vector' },
  { label: '⟨ | ⟩', latex: '\\braket{#0}{}', title: 'Inner product' },
  { label: '| ⟩', latex: '\\ket{#0}', title: 'Ket' },
  { label: 'a/b', latex: '\\frac{#0}{}', title: 'Fraction' },
  { label: '√', latex: '\\sqrt{#0}', title: 'Square root' },
  { label: 'xⁿ', latex: '#0^{}', title: 'Superscript' },
  { label: 'xₙ', latex: '#0_{}', title: 'Subscript' },
  { label: '∑', latex: '\\sum_{#0}^{}', title: 'Sum' },
  { label: '∫', latex: '\\int_{#0}^{}', title: 'Integral' },
  { label: 'ℏ', latex: '\\hbar', title: 'h-bar' },
  { label: 'ψ', latex: '\\psi', title: 'psi' },
  { label: 'σ', latex: '\\sigma', title: 'sigma' },
  { label: 'Γ', latex: '\\Gamma', title: 'Gamma' },
  { label: '†', latex: '^\\dagger', title: 'Dagger' },
]

export function MathInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel = 'Answer',
  disabled = false,
}: {
  value: string
  onChange: (latex: string) => void
  onSubmit?: () => void
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}) {
  const [mode, setMode] = useState<'visual' | 'latex'>('visual')
  const [preview, setPreview] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)
  // A ref to *this* component's editor. Looking it up from the document would find the first
  // math field on the page, so on a lesson with twenty exercises the palette would insert into
  // the wrong card.
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

  const insert = (latex: string) => {
    if (mode === 'latex') {
      const el = textarea.current
      const snippet = latex.replace('#0', '')
      if (!el) {
        onChange(value + snippet)
        return
      }
      const start = el.selectionStart ?? value.length
      const end = el.selectionEnd ?? value.length
      onChange(value.slice(0, start) + snippet + value.slice(end))
      // Restore the caret after the inserted text rather than dumping it at the end.
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + snippet.length, start + snippet.length)
      })
      return
    }

    // In visual mode MathLive owns the caret, so route the insertion through this field.
    fieldRef.current?.insert(latex)
  }

  return (
    <div className={cn('space-y-2', disabled && 'pointer-events-none opacity-60')}>
      <div className="flex items-center justify-between gap-2">
        <div className="pane-scroll flex flex-wrap gap-1 overflow-x-auto">
          {PALETTE.map((item) => (
            <button
              key={item.label}
              type="button"
              title={item.title}
              onClick={() => insert(item.latex)}
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
              <div className="pane-scroll overflow-x-auto" dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              <p className="text-xs text-fg-subtle">Live preview appears here.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
