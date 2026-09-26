'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, Languages, Moon, Sigma, Sun, X } from 'lucide-react'

import { LOCALE_INFO, LOCALES, isLocale, type Locale } from '@core/domain'
import { useWorkspace } from '@/stores/workspace'
import { translator } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Settings: language and theme, globally and for the current page.
 *
 * The per-page override exists because the global switch is the wrong granularity for how this
 * actually gets used — you want the one section you are struggling with in your first language,
 * without moving the rest of the syllabus and without flipping a switch back and forth.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  topicId,
  topicTitle,
  hasTranslation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId?: string
  topicTitle?: string
  hasTranslation?: boolean
}) {
  const { locale, theme, setLocale, setTheme } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const t = translator(locale)

  // The per-page override lives in the URL so the server can honour it on the first render, and
  // so a link to one topic in Arabic can simply be shared.
  const raw = searchParams.get('lang')
  const override: Locale | undefined = isLocale(raw) ? raw : undefined

  const setOverride = (next: Locale | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === null) params.delete('lang')
    else params.set('lang', next)

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
    // The content is rendered on the server, so the page has to be re-fetched to change language.
    router.refresh()
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-sm" />
        <Dialog.Content
          // The dialog follows the interface language, which may differ from the page's.
          dir={LOCALE_INFO[locale].direction}
          className="fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-border bg-surface p-5 shadow-panel"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-fg">
                {t('settings.title')}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-relaxed text-fg-muted">
                {t('settings.description')}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label={t('settings.done')}
              className="shrink-0 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-raised hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <Section icon={<Languages className="size-4" aria-hidden />} title={t('settings.language')}>
            <p className="mb-2.5 text-xs leading-relaxed text-fg-subtle">
              {t('settings.languageHelp')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LOCALES.map((code) => (
                <Choice
                  key={code}
                  selected={locale === code}
                  onSelect={() => {
                    setLocale(code)
                    router.refresh()
                  }}
                  label={LOCALE_INFO[code].nativeName}
                  sub={LOCALE_INFO[code].direction.toUpperCase()}
                  lang={code}
                  dir={LOCALE_INFO[code].direction}
                />
              ))}
            </div>

            <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-border bg-surface-sunken/60 px-3 py-2 text-[0.7rem] leading-relaxed text-fg-subtle">
              <Sigma className="mt-0.5 size-3 shrink-0" aria-hidden />
              {t('settings.mathNote')}
            </p>
          </Section>

          {topicId && (
            <Section title={t('settings.pageOverride')}>
              <p className="mb-2.5 text-xs leading-relaxed text-fg-subtle">
                {t('settings.pageOverrideHelp')}
                {topicTitle && <span className="text-fg-muted"> — {topicTitle}</span>}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Choice
                  selected={override === undefined}
                  onSelect={() => setOverride(null)}
                  label={t('settings.followGlobal')}
                  sub={LOCALE_INFO[locale].nativeName}
                />
                {LOCALES.map((code) => (
                  <Choice
                    key={code}
                    selected={override === code}
                    onSelect={() => setOverride(code)}
                    label={LOCALE_INFO[code].nativeName}
                    lang={code}
                    dir={LOCALE_INFO[code].direction}
                    {...(code === 'ar' && hasTranslation === false
                      ? { sub: '—', disabledReason: t('lesson.translationMissing') }
                      : {})}
                  />
                ))}
              </div>
            </Section>
          )}

          <Section
            icon={theme === 'dark' ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
            title={t('settings.theme')}
          >
            <div className="grid grid-cols-2 gap-2">
              <Choice
                selected={theme === 'dark'}
                onSelect={() => setTheme('dark')}
                label={t('settings.themeDark')}
              />
              <Choice
                selected={theme === 'light'}
                onSelect={() => setTheme('light')}
                label={t('settings.themeLight')}
              />
            </div>
          </Section>

          <Dialog.Close className="mt-5 w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90">
            {t('settings.done')}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mb-5 border-t border-border pt-4 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="mb-1.5 flex items-center gap-2 text-sm font-medium text-fg">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

function Choice({
  selected,
  onSelect,
  label,
  sub,
  lang,
  dir,
  disabledReason,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  sub?: string
  lang?: string
  dir?: 'ltr' | 'rtl'
  disabledReason?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={disabledReason}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-start transition-colors',
        selected
          ? 'border-accent bg-accent-muted/30 text-fg'
          : 'border-border bg-surface-sunken text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span lang={lang} dir={dir} className="text-sm font-medium">
          {label}
        </span>
        {selected && <Check className="size-3.5 shrink-0 text-accent" aria-hidden />}
      </span>
      {sub && <span className="font-mono text-[0.65rem] text-fg-subtle">{sub}</span>}
    </button>
  )
}
