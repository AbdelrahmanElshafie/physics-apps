import type { Metadata } from 'next'
import { Golos_Text, Oswald } from 'next/font/google'

import { TutorStreamProvider } from '@physics/tutor-bridge/react'
import { TutorSidePanel } from '@/components/tutor/TutorSidePanel'

import './globals.css'

/*
 * Two families, both drawn for Cyrillic first: Oswald, a condensed grotesque in the poster
 * tradition, for headings and the Russian a VocabCard puts front and centre; Golos Text, a
 * Russian-designed text face, for the English reading text. Both cover Latin as well, so an
 * English sentence with a Russian word inside it never swaps font mid-line.
 */
const oswald = Oswald({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '700'],
  variable: '--font-oswald',
  display: 'swap',
})

const golos = Golos_Text({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  variable: '--font-golos',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Russian, from scratch',
  description: 'A personal Russian course — vocabulary, grammar, writing practice, and a live tutor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${oswald.variable} ${golos.variable}`}>
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
