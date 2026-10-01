import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'

import { TutorStreamProvider } from '@physics/tutor-bridge/react'
import { TutorSidePanel } from '@/components/tutor/TutorSidePanel'

import './globals.css'

// One font family covers both the English interface chrome and the Russian content itself, so
// there is no visible font swap between a lesson's English prose and the Cyrillic inside it.
const notoSans = Noto_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-noto-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Russian, from scratch',
  description: 'A personal Russian course — vocabulary, grammar, writing practice, and a live tutor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable}>
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
