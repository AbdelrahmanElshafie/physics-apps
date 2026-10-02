'use client'

import { useEffect } from 'react'

/**
 * Press 1–9 to open the matching tile. A launcher is a thing you use many times a day, so it
 * should be usable without the mouse; the tiles show their number as a `kbd` hint.
 *
 * Ignores keystrokes aimed at a field or with a modifier held, so it never eats a browser
 * shortcut or someone's typing.
 */
export function NumberShortcuts({ hrefs }: { hrefs: readonly string[] }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return
      }
      const index = Number(event.key) - 1
      if (!Number.isInteger(index) || index < 0 || index >= hrefs.length) return
      const href = hrefs[index]
      if (!href) return
      event.preventDefault()
      window.location.href = href
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hrefs])

  return null
}
