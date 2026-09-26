import { cookies } from 'next/headers'

import { DEFAULT_LOCALE, isLocale, type Locale } from '@core/domain'

/** Must match the name the client store writes. */
export const LOCALE_COOKIE = 'pi_locale'

/**
 * Resolves the language for a server-rendered page.
 *
 * Order matters: an explicit `?lang=` in the URL beats the saved preference, because it is the
 * per-page override and also what makes a link to one Arabic topic shareable. Falls back to
 * English, which always exists.
 */
export async function resolveLocale(searchParams?: { lang?: string | string[] }): Promise<Locale> {
  const fromUrl = Array.isArray(searchParams?.lang) ? searchParams?.lang[0] : searchParams?.lang
  if (isLocale(fromUrl)) return fromUrl

  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE
}
