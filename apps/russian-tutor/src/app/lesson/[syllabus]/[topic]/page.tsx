import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'

import { TutorStreamProvider } from '@physics/tutor-bridge/react'
import { asSyllabusId, groupBySet, qualifyTopicId } from '@core/domain'
import { container } from '@/container'
import { mdxComponents } from '@/components/mdx'
import { ExerciseCard } from '@/components/exercise/ExerciseCard'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopicViewTracker } from '@/components/layout/TopicViewTracker'

/** Content is read per request, so an edited lesson shows up on the next refresh — no rebuild. */
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ syllabus: string; topic: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { syllabus, topic } = await params
  const topicId = qualifyTopicId(asSyllabusId(syllabus), topic)
  const loaded = await container.content.getSyllabus(asSyllabusId(syllabus))
  return { title: loaded?.topics.get(topicId)?.title ?? 'Russian, from scratch' }
}

export default async function LessonPage({ params }: PageProps) {
  const { syllabus: syllabusParam, topic: topicParam } = await params
  const syllabusId = asSyllabusId(syllabusParam)
  const topicId = qualifyTopicId(syllabusId, topicParam)

  const syllabus = await container.content.getSyllabus(syllabusId)
  if (!syllabus || !syllabus.topics.has(topicId)) notFound()

  const [lesson, exercises, progressState] = await Promise.all([
    container.content.getLesson(topicId),
    container.content.getExercises(topicId),
    container.progress.state(),
  ])

  const topicProgress = progressState.topics.get(topicId)
  const progressByExercise = topicProgress?.exercises
  const groups = groupBySet(exercises)

  return (
    <TutorStreamProvider topicId={topicId}>
      <div className="flex h-dvh flex-col">
        <Header />
        <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr]">
          <Sidebar syllabus={syllabus} progress={progressState} activeTopicId={topicId} />

          <main className="pane-scroll overflow-y-auto">
            <TopicViewTracker topicId={topicId} />
            <div className="mx-auto max-w-3xl px-6 py-8">
              {lesson ? (
                <>
                  <p className="poster-caps mb-2 text-xs text-accent">
                    {syllabus.modules.get(syllabus.topics.get(topicId)!.moduleId)?.title}
                  </p>
                  <h1 className="poster mb-3 text-4xl text-fg">{lesson.frontmatter.title}</h1>
                  {lesson.frontmatter.summary && (
                    <p className="mb-6 text-sm leading-relaxed text-fg-muted">{lesson.frontmatter.summary}</p>
                  )}

                  <div className="lesson-prose">
                    <MDXRemote
                      source={lesson.body}
                      components={mdxComponents()}
                      options={{
                        parseFrontmatter: false,
                        // next-mdx-remote v6 defaults both flags to true, stripping every JS
                        // expression (`<Compare columns={[...]} />` included) out of the MDX —
                        // a sane default against *untrusted* MDX, which this isn't: every lesson
                        // is first-party content, authored and reviewed in this repo, never
                        // user-submitted. Off is correct here, not a workaround.
                        blockJS: false,
                        blockDangerousJS: false,
                        mdxOptions: { remarkPlugins: [remarkGfm] },
                      }}
                    />
                  </div>

                  {exercises.length > 0 && (
                    <section className="mt-12 border-t border-border pt-8">
                      <h2 className="poster mb-1 text-2xl text-fg">Упражнения <span className="text-base font-normal text-fg-subtle">· Exercises</span></h2>
                      <p className="mb-6 text-sm text-fg-subtle">
                        Multiple-choice and typed answers are checked instantly.
                      </p>
                      <div className="space-y-8">
                        {groups.map((group) => (
                          <div key={group.set}>
                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
                              Set {group.set}
                            </h3>
                            <div className="space-y-3">
                              {group.exercises.map((exercise) => (
                                <ExerciseCard
                                  key={exercise.id}
                                  exercise={exercise}
                                  topicId={topicId}
                                  {...(progressByExercise?.get(exercise.id)
                                    ? { progress: progressByExercise.get(exercise.id)! }
                                    : {})}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <NotWrittenYet title={syllabus.topics.get(topicId)?.title ?? topicParam} />
              )}
            </div>
          </main>
        </div>
      </div>
    </TutorStreamProvider>
  )
}

function NotWrittenYet({ title }: { title: string }) {
  return (
    <div className="rounded-panel border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-fg">This lesson hasn&apos;t been written yet: {title}</p>
    </div>
  )
}
