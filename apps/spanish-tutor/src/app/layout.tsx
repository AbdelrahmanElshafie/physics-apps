import type { Metadata } from 'next'
import { Fraunces, Nunito_Sans } from 'next/font/google'

import { TutorStreamProvider } from '@physics/tutor-bridge/react'
import { TutorSidePanel } from '@/components/tutor/TutorSidePanel'

import './globals.css'

/*
 * Two families, deliberately: a warm, slightly old-fashioned serif for headings and the Spanish
 * itself (Fraunces — the shape of a Mediterranean shop sign), and a soft rounded sans for the
 * English reading text (Nunito Sans). Both cover every accented letter and ñ; the serif is what
 * makes a VocabCard's word look like Spanish rather than like interface chrome.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Spanish, from scratch',
  description: 'A personal Spanish course — vocabulary, grammar, writing practice, and a live tutor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunitoSans.variable}`}>
      <body>
        {/*
         * One topic-scoped stream for the whole app, under the fixed topic "general" — the thread
         * `threadFor({})` resolves to with no topic or exercise given. A lesson page nests its own
         * `TutorStreamProvider topicId={topicId}` inside this for its exercise threads; separate
         * contexts, separate streams, no interference with each other.
         */}
        <TutorStreamProvider topicId="general">
          {children}
          <TutorSidePanel />
        </TutorStreamProvider>
      </body>
    </html>
  )
}
