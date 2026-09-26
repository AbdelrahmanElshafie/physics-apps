'use client'

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

import type { MathfieldElement } from 'mathlive'

/**
 * MathLive editor wrapper.
 *
 * The element is created imperatively rather than rendered as JSX because `mathlive` must be
 * loaded before `<math-field>` means anything, and it can only be imported in the browser — it
 * registers a custom element and touches `window` at module scope.
 *
 * Ordering matters and is easy to get wrong: MathLive throws "Mathfield not mounted" if you read
 * or write most properties before the element is in the document. So the sequence is strictly
 * construct -> insert -> configure, and configuration is wrapped so one unsupported option can
 * never leave the page with no input field at all.
 *
 * The imperative handle exists so a palette can insert into *this* field. Looking the element up
 * from the document would find the first one on the page, which on a lesson with twenty exercises
 * means typing into the wrong card.
 */

export interface MathFieldHandle {
  /** Inserts at the caret, through MathLive's own command so undo and events behave. */
  insert: (latex: string) => void
  focus: () => void
  getValue: () => string
}

export function MathField({
  value,
  onChange,
  onEnter,
  placeholder,
  ariaLabel,
  autoFocus = false,
  ref,
}: {
  value: string
  onChange: (latex: string) => void
  onEnter?: () => void
  placeholder?: string
  ariaLabel?: string
  autoFocus?: boolean
  ref?: Ref<MathFieldHandle>
}) {
  const host = useRef<HTMLDivElement>(null)
  const field = useRef<MathfieldElement | null>(null)

  // Callbacks live in refs so the effect can run once rather than tearing down the editor — and
  // the caret position with it — on every parent re-render.
  const onChangeRef = useRef(onChange)
  const onEnterRef = useRef(onEnter)
  onChangeRef.current = onChange
  onEnterRef.current = onEnter

  useImperativeHandle(
    ref,
    (): MathFieldHandle => ({
      insert: (latex) => {
        const element = field.current
        if (!element) return
        try {
          element.focus()
          element.executeCommand(['insert', latex])
          // MathLive does not always emit `input` for a programmatic insert, and the React state
          // above is the source of truth for the answer, so push the new value up explicitly.
          onChangeRef.current(element.value)
        } catch (error) {
          console.warn('[MathField] insert failed', error)
        }
      },
      focus: () => field.current?.focus(),
      getValue: () => field.current?.value ?? '',
    }),
    [],
  )

  // Mount-only: `value` is synced by the second effect. Re-running this would destroy the editor
  // mid-keystroke.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const mathlive = await import('mathlive')
      if (cancelled || !host.current) return

      // Serve fonts from public/ (synced by scripts/sync-mathlive-fonts.ts) so the editor renders
      // correctly with no network access.
      mathlive.MathfieldElement.fontsDirectory = '/mathlive/fonts'
      mathlive.MathfieldElement.soundsDirectory = null

      const element = new mathlive.MathfieldElement()

      // Insert first — everything below requires a mounted element.
      host.current.replaceChildren(element)
      if (cancelled) return
      field.current = element

      try {
        element.value = value
        if (placeholder) element.setAttribute('placeholder', placeholder)
        if (ariaLabel) element.setAttribute('aria-label', ariaLabel)
        // Keep the on-screen keyboard opt-in; it steals a lot of room on a laptop.
        element.mathVirtualKeyboardPolicy = 'manual'

        // Physics notation the syllabus uses constantly, so it is available without a palette trip.
        element.macros = {
          ...element.macros,
          ket: '\\left\\lvert #1 \\right\\rangle',
          bra: '\\left\\langle #1 \\right\\rvert',
          braket: '\\left\\langle #1 \\middle\\vert #2 \\right\\rangle',
        }
      } catch (error) {
        // A MathLive version that rejects one of these must not cost us the whole input.
        console.warn('[MathField] Could not apply an option:', error)
      }

      element.addEventListener('input', () => onChangeRef.current(element.value))
      element.addEventListener('keydown', (event) => {
        // Enter submits; Shift+Enter stays in the field for multi-line work.
        if (event.key === 'Enter' && !event.shiftKey && onEnterRef.current) {
          event.preventDefault()
          onEnterRef.current()
        }
      })

      if (autoFocus) element.focus()
    })()

    return () => {
      cancelled = true
      field.current?.remove()
      field.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Accept external resets (a cleared form, a loaded draft) without fighting the user's typing.
  useEffect(() => {
    const element = field.current
    if (!element) return
    try {
      if (element.value !== value) element.value = value
    } catch {
      // Element not mounted yet; the mount effect sets the initial value anyway.
    }
  }, [value])

  return <div ref={host} className="w-full" />
}
