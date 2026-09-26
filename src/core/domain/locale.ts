import { z } from 'zod'

/**
 * Supported teaching languages.
 *
 * Content is authored per locale as a sibling file (`<topic>.ar.mdx` next to `<topic>.mdx`), so a
 * translation is added by adding a file — the same rule as adding a syllabus. A missing
 * translation falls back to English rather than showing a blank page, and the UI says so.
 */
export const LOCALES = ['en', 'ar'] as const
export const localeSchema = z.enum(LOCALES)
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export type Direction = 'ltr' | 'rtl'

export interface LocaleInfo {
  readonly code: Locale
  /** Name in the language itself — a picker should never make you read a language to find it. */
  readonly nativeName: string
  readonly englishName: string
  readonly direction: Direction
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { code: 'en', nativeName: 'English', englishName: 'English', direction: 'ltr' },
  ar: { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', direction: 'rtl' },
}

export const directionOf = (locale: Locale): Direction => LOCALE_INFO[locale].direction

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

/**
 * Filename suffix for a locale's content.
 * English is the base file with no suffix, so existing content keeps working untouched.
 */
export const localeSuffix = (locale: Locale): string => (locale === DEFAULT_LOCALE ? '' : `.${locale}`)
