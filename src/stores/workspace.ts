'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_LOCALE, type Locale } from '@core/domain'

/** Name shared with the server, which reads this to pick the content language. */
export const LOCALE_COOKIE = 'pi_locale'

function writeLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return
  // A year, site-wide, and Lax so it survives ordinary navigation. Nothing sensitive is stored.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
}

/**
 * Ephemeral UI state only.
 *
 * Nothing durable lives here — progress, attempts and conversations are server-side, derived from
 * the event log and the bridge files. This store holds the things that are genuinely per-browser:
 * which panes are open, the chosen theme, and an unsent question draft. Keeping the split strict is
 * what stops the UI becoming a second, disagreeing source of truth.
 */

export interface AskContext {
  readonly topicId: string
  readonly equationId?: string
  readonly equationLatex?: string
  readonly equationLabel?: string
  readonly exerciseId?: string
  readonly exerciseLabel?: string
}

interface WorkspaceState {
  navigatorOpen: boolean
  tutorOpen: boolean
  focusMode: boolean
  theme: 'dark' | 'light'

  /**
   * Language for lessons, exercises and the interface.
   *
   * Mirrored into a cookie so the server can render content in the right language on the first
   * request. Per-page overrides live in the URL (`?lang=ar`) rather than here — the server needs
   * to read them too, and a shareable link to one Arabic topic is worth more than a hidden map.
   */
  locale: Locale

  /** What the pending question is about, set when "ask about this" is clicked. */
  askContext: AskContext | null
  draft: string

  toggleNavigator: () => void
  toggleTutor: () => void
  toggleFocusMode: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setLocale: (locale: Locale) => void

  /** Opens the tutor rail with the question scoped to a specific equation or exercise. */
  askAbout: (context: AskContext, prefill?: string) => void
  setDraft: (draft: string) => void
  clearAsk: () => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      navigatorOpen: true,
      tutorOpen: true,
      focusMode: false,
      theme: 'dark',
      locale: DEFAULT_LOCALE,
      askContext: null,
      draft: '',

      toggleNavigator: () => set((s) => ({ navigatorOpen: !s.navigatorOpen })),
      toggleTutor: () => set((s) => ({ tutorOpen: !s.tutorOpen })),
      toggleFocusMode: () =>
        set((s) =>
          s.focusMode
            ? { focusMode: false, navigatorOpen: true, tutorOpen: true }
            : { focusMode: true, navigatorOpen: false, tutorOpen: false },
        ),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => {
        writeLocaleCookie(locale)
        set({ locale })
      },

      askAbout: (context, prefill) =>
        set((state) => ({
          askContext: context,
          tutorOpen: true,
          focusMode: false,
          // Never clobber something already typed.
          draft: state.draft.trim().length > 0 ? state.draft : (prefill ?? ''),
        })),
      setDraft: (draft) => set({ draft }),
      clearAsk: () => set({ askContext: null, draft: '' }),
    }),
    {
      name: 'physics-workspace',
      // Layout and theme survive a reload; a half-typed question and its context do not need to.
      partialize: (s) => ({
        navigatorOpen: s.navigatorOpen,
        tutorOpen: s.tutorOpen,
        focusMode: s.focusMode,
        theme: s.theme,
        locale: s.locale,
        draft: s.draft,
      }),
    },
  ),
)
