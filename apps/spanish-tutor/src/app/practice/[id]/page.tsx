import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { asSyllabusId, parseTopicId, type TopicId } from '@core/domain'
import { container } from '@/container'
import { PracticeEditor } from '@/components/practice/PracticeEditor'
import { TutorStreamProvider } from '@physics/tutor-bridge/react'

/** One pad. Read per request so a pad edited elsewhere shows up on refresh. */
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const pad = await container.scratch.get(id)
  return { title: `${pad?.title ?? 'Practice'} · Spanish, from scratch` }
}

export default async function PracticePage({ params }: PageProps) {
  const { id } = await params
  const { scratch, content } = container

  const pad = await scratch.get(id)
  if (!pad) notFound()

  // Resolve the linked topic's title, if the pad was started from a lesson.
  let topicTitle: string | undefined
  if (pad.topicId) {
    try {
      const { syllabus } = parseTopicId(pad.topicId as TopicId)
      const loaded = await content.getSyllabus(asSyllabusId(syllabus))
      topicTitle = loaded?.topics.get(pad.topicId as TopicId)?.title
    } catch {
      // A malformed or stale topic reference should not stop the pad from opening.
    }
  }

  return (
    // The pad's review thread is `practice:<id>`, so scope the stream to it and the reply arrives
    // without a refresh, exactly as on a lesson page.
    <TutorStreamProvider topicId={`practice:${pad.id}`}>
      <PracticeEditor
        id={pad.id}
        initialTitle={pad.title}
        initialEntries={pad.steps}
        {...(pad.topicId !== undefined ? { topicId: pad.topicId } : {})}
        {...(topicTitle !== undefined ? { topicTitle } : {})}
      />
    </TutorStreamProvider>
  )
}
