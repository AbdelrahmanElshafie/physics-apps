import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

import { ThemeScript } from '@/components/workspace/ThemeScript'

import 'katex/dist/katex.min.css'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-code',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Physics Instructor',
    template: '%s · Physics Instructor',
  },
  description: 'Interactive nuclear physics tutoring — lessons, typeset maths and worked problems.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The MathLive virtual keyboard needs room; locking zoom would hurt more than it helps.
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} ${mono.variable} min-h-dvh antialiased`}>{children}</body>
    </html>
  )
}
