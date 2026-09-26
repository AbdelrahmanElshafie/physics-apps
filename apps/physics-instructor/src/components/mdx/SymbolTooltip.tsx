'use client'

import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

/**
 * Glossary tooltip for a symbol or term.
 *
 * Notation is the main barrier in this material — a reader who has forgotten what a bra is should
 * not have to leave the lesson to find out. Radix handles the hard parts properly: it opens on
 * hover *and* on keyboard focus, and it is announced to screen readers.
 */
export function SymbolTooltip({
  term,
  meaning,
  mathHtml,
  children,
}: {
  term: string
  meaning: string
  mathHtml?: string
  children: ReactNode
}) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            // A dotted underline signals "there is more here" without shouting like a link.
            className="cursor-help border-b border-dotted border-fg-subtle text-fg transition-colors hover:border-accent hover:text-accent"
          >
            {children}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 max-w-xs rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 shadow-panel"
          >
            <p className="text-xs font-semibold text-fg">{term}</p>
            {mathHtml && (
              <div
                className="my-1.5 text-sm text-fg-muted"
                dangerouslySetInnerHTML={{ __html: mathHtml }}
              />
            )}
            <p className="text-xs leading-relaxed text-fg-muted">{meaning}</p>
            <Tooltip.Arrow className="fill-[var(--color-border-strong)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
