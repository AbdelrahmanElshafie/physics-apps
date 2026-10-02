import type { Metadata } from 'next'
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'

import { TutorStreamProvider } from '@physics/tutor-bridge/react'
import { TutorSidePanel } from '@/components/tutor/TutorSidePanel'

import './globals.css'

/*
 * Two families: Noto Sans SC for the English interface and running text (it covers hanzi too, so
 * a character inside an English sentence never swaps font), and Noto Serif SC — a Song-style face,
 * the type of a printed Chinese book — for headings and for the hanzi a VocabCard puts front and
 * centre. The serif is what makes the characters look like characters rather than UI labels.
 */
const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
})

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['500', '700', '900'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mandarin, from scratch',
  description: 'A personal Mandarin course — vocabulary, grammar, writing practice, and a live tutor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSansSC.variable} ${notoSerifSC.variable}`}>
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
