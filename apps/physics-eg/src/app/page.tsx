import Link from 'next/link'
import { BookOpen, CircuitBoard } from 'lucide-react'

import { container } from '@/container'
import { Header } from '@/components/layout/Header'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const syllabi = await container.content.listSyllabi()

  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-1 text-2xl font-bold text-fg">الفيزياء بالعربي</h1>
        <p className="mb-8 text-sm leading-relaxed text-fg-muted">
          شرح واضح، مسائل محلولة، ودوائر كهربية تقدر تبنيها بنفسك وتشوف نتيجتها فورًا.
        </p>

        <div className="space-y-3">
          {syllabi.map((s) => {
            const firstTopic = s.order[0]
            if (!firstTopic) return null
            const at = firstTopic.indexOf(':')
            const local = firstTopic.slice(at + 1)
            return (
              <Link
                key={s.id}
                href={`/lesson/${s.id}/${local}`}
                className="flex items-start gap-3 rounded-panel border border-border bg-surface/60 px-4 py-3.5 transition hover:border-accent/50 hover:bg-surface"
              >
                <BookOpen className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-semibold text-fg">{s.title}</p>
                  {s.subtitle && <p className="mt-0.5 text-sm text-fg-muted">{s.subtitle}</p>}
                  <p className="mt-1 text-sm text-fg-subtle">{s.topics.size} موضوع</p>
                </div>
              </Link>
            )
          })}

          <Link
            href="/sandbox"
            className="flex items-start gap-3 rounded-panel border border-dashed border-border-strong bg-surface/30 px-4 py-3.5 transition hover:border-accent/50 hover:bg-surface"
          >
            <CircuitBoard className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="font-semibold text-fg">صمّم دائرتك الخاصة</p>
              <p className="mt-0.5 text-sm text-fg-muted">لوح فاضي، حط عليه بطاريات ومقاومات وشوف النتيجة.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
