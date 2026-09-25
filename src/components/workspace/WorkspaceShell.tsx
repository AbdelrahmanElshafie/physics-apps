'use client'

import { useEffect, type ReactNode } from 'react'
import { Maximize2, Moon, PanelLeft, PanelRight, Sun } from 'lucide-react'

import { useWorkspace } from '@/stores/workspace'
import { cn } from '@/lib/utils'

/**
 * The three-pane workspace: navigator, canvas, tutor.
 *
 * Pane visibility is client state because it is per-person and per-moment. Below `lg` the side
 * panes become overlays rather than columns — three columns on a phone would leave a reading
 * measure too narrow for an equation.
 */
export function WorkspaceShell({
  navigator,
  tutor,
  children,
  title,
  subtitle,
}: {
  navigator: ReactNode
  tutor: ReactNode
  children: ReactNode
  title: string
  subtitle?: string
}) {
  const {
    navigatorOpen,
    tutorOpen,
    focusMode,
    theme,
    toggleNavigator,
    toggleTutor,
    toggleFocusMode,
    setTheme,
  } = useWorkspace()

  // The store is the source of truth for the theme; the inline script in <head> only prevents
  // the first-paint flash. This keeps the attribute in step with later toggles.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts while typing — including inside the MathLive custom element.
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'MATH-FIELD'].includes(target.tagName))
      ) {
        return
      }

      if (event.key === '[') toggleNavigator()
      else if (event.key === ']') toggleTutor()
      else if (event.key === 'f') toggleFocusMode()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleNavigator, toggleTutor, toggleFocusMode])

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <IconButton
          onClick={toggleNavigator}
          active={navigatorOpen}
          label="Toggle syllabus panel"
          hint="["
        >
          <PanelLeft className="size-4" aria-hidden />
        </IconButton>

        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-sm font-semibold text-fg">{title}</h1>
          {subtitle && <p className="truncate text-xs text-fg-subtle">{subtitle}</p>}
        </div>

        <IconButton onClick={toggleFocusMode} active={focusMode} label="Toggle focus mode" hint="f">
          <Maximize2 className="size-4" aria-hidden />
        </IconButton>

        <IconButton
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? (
            <Sun className="size-4" aria-hidden />
          ) : (
            <Moon className="size-4" aria-hidden />
          )}
        </IconButton>

        <IconButton onClick={toggleTutor} active={tutorOpen} label="Toggle instructor panel" hint="]">
          <PanelRight className="size-4" aria-hidden />
        </IconButton>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Navigator: a column at lg and up, an overlay drawer below it. */}
        <div
          className={cn(
            'z-30 w-72 shrink-0 transition-[width] duration-200',
            'max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-panel',
            navigatorOpen ? 'lg:w-72' : 'w-0 overflow-hidden lg:w-0',
          )}
        >
          {navigatorOpen && navigator}
        </div>

        <main className="pane-scroll min-w-0 flex-1 overflow-y-auto">{children}</main>

        <div
          className={cn(
            'z-30 w-80 shrink-0 transition-[width] duration-200',
            'max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:shadow-panel',
            tutorOpen ? 'lg:w-80' : 'w-0 overflow-hidden lg:w-0',
          )}
        >
          {tutorOpen && tutor}
        </div>

        {/* Scrim: only below lg, where the panes float over the content. */}
        {(navigatorOpen || tutorOpen) && (
          <button
            type="button"
            aria-label="Close panels"
            onClick={() => {
              if (navigatorOpen) toggleNavigator()
              if (tutorOpen) toggleTutor()
            }}
            className="absolute inset-0 z-20 bg-canvas/60 lg:hidden"
          />
        )}
      </div>
    </div>
  )
}

function IconButton({
  children,
  onClick,
  label,
  hint,
  active = false,
}: {
  children: ReactNode
  onClick: () => void
  label: string
  hint?: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={hint ? `${label} (${hint})` : label}
      className={cn(
        'rounded-lg border p-2 transition-colors',
        active
          ? 'border-accent/40 bg-accent-muted/30 text-accent'
          : 'border-transparent text-fg-subtle hover:bg-surface-raised hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
