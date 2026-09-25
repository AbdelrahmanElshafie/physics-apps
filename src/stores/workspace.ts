'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

  /** What the pending question is about, set when "ask about this" is clicked. */
  askContext: AskContext | null
  draft: string

  toggleNavigator: () => void
  toggleTutor: () => void
  toggleFocusMode: () => void
  setTheme: (theme: 'dark' | 'light') => void

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
        draft: s.draft,
      }),
    },
  ),
)
