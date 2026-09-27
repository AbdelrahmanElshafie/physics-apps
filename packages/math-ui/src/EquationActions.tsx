'use client'

import { useState } from 'react'
import { Check, Copy, MessageCircleQuestion } from 'lucide-react'

import { cn } from './cn'

/**
 * The hover controls on a display equation: copy its LaTeX, or open a question about it.
 *
 * "Ask about this" is the reason equations carry stable ids. The question arrives with the
 * equation attached, so the instructor answers *this* step rather than guessing which line was
 * confusing.
 *
 * `onAskAbout` is a callback rather than a store import — each app wires its own way of opening a
 * question (a workspace panel, a per-exercise tutor rail, whatever fits that app's UI), and this
 * component stays ignorant of which.
 */
export function EquationActions({
  latex,
  equationId,
  label,
  onAskAbout,
}: {
  latex: string
  equationId: string
  label?: string
  onAskAbout: (context: { equationId: string; equationLatex: string; equationLabel?: string }, prefill: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(latex)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard access can be denied; the LaTeX is still selectable by hand.
    }
  }

  return (
    <div
      className={cn(
        'absolute right-1.5 top-1.5 flex items-center gap-1',
        // Visible on hover, on keyboard focus, and always on touch where hover does not exist.
        'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
        '[@media(hover:none)]:opacity-100',
      )}
    >
      <button
        type="button"
        onClick={() => void copy()}
        title="Copy LaTeX"
        aria-label={copied ? 'LaTeX copied' : 'Copy LaTeX'}
        className="rounded-md border border-border bg-surface-raised p-1.5 text-fg-subtle transition-colors hover:border-border-strong hover:text-fg"
      >
        {copied ? (
          <Check className="size-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={() =>
          onAskAbout(
            {
              equationId,
              equationLatex: latex,
              ...(label !== undefined ? { equationLabel: label } : {}),
            },
            label ? `About "${label}": ` : 'About this equation: ',
          )
        }
        title="Ask about this equation"
        aria-label="Ask about this equation"
        className="rounded-md border border-border bg-surface-raised p-1.5 text-fg-subtle transition-colors hover:border-accent hover:text-accent"
      >
        <MessageCircleQuestion className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
