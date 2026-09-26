import type { Metadata } from 'next'
import { Cairo } from 'next/font/google'

import 'katex/dist/katex.min.css'
import './globals.css'

// Cairo: designed in Egypt, reads comfortably at both display and body sizes, and its numerals
// match the Western digits the book itself uses — no separate numeral font needed.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'الفيزياء بالعربي',
  description: 'مادة الفيزياء للثانوية العامة — بالعربي المصري، بشرح وتفاعل وتمارين محلولة.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>{children}</body>
    </html>
  )
}
