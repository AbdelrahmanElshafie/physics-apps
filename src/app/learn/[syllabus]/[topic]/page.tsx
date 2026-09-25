import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

import {
  asSyllabusId,
  groupBySet,
  qualifyTopicId,
  type Exercise,
} from '@core/domain'
import { buildTopicViews, summarise } from '@core/services'
import { container } from '@/container'
import { mdxComponents } from '@/components/mdx'
import { Navigator, type NavPhase } from '@/components/workspace/Navigator'
import { TutorRail } from '@/components/workspace/TutorRail'
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell'
import { ExerciseCard } from '@/components/exercise/ExerciseCard'
import { CheckpointPanel } from '@/components/workspace/CheckpointPanel'
import { TopicViewTracker } from '@/components/workspace/TopicViewTracker'
import { renderMath } from '@/lib/katex'

/**
 * The learning workspace for one topic.
 *
 * Content is read per request so a lesson edited from the terminal appears on the next refresh
 * with no rebuild — the authoring loop this whole app exists to support.
 */
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ syllabus: string; topic: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { syllabus, topic } = await params
  const { content } = container()

  const topicId = qualifyTopicId(asSyllabusId(syllabus), topic)
  const loaded = await content.getSyllabus(asSyllabusId(syllabus))
  const title = loaded?.topics.get(topicId)?.title

  return { title: title ?? 'Topic' }
}

export default async function TopicPage({ params }: PageProps) {
  const { syllabus: syllabusParam, topic: topicParam } = await params
  const { content, progress } = container()

  const syllabusId = asSyllabusId(syllabusParam)
  const syllabus = await content.getSyllabus(syllabusId)
  if (!syllabus) notFound()

  const topicId = qualifyTopicId(syllabusId, topicParam)
  const topic = syllabus.topics.get(topicId)
  if (!topic) notFound()

  const [lesson, exercises, glossary, progressState, exerciseCounts, allTopics] = await Promise.all([
    content.getLesson(topicId),
    content.getExercises(topicId),
    content.getGlossary(syllabusId),
    progress.state(),
    content.exerciseCounts(),
    content.allTopics(),
  ])

  const views = buildTopicViews(syllabus, progressState, exerciseCounts, allTopics)
  const stats = summarise(views)
  const topicProgress = progressState.topics.get(topicId)

  // Serialise the tree for the client navigator: Maps and branded types do not cross the boundary.
  const phases: NavPhase[] = syllabus.phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
    modules: phase.moduleIds.map((moduleId) => {
      const mod = syllabus.modules.get(moduleId)!
      return {
        id: String(moduleId),
        title: mod.title,
        ...(mod.group !== undefined ? { group: mod.group } : {}),
        topics: mod.topicIds.map((id) => {
          const view = views.get(id)!
          return {
            id: String(id),
            localId: view.topic.localId,
            title: view.topic.title,
            kind: view.topic.kind,
            status: view.status,
            mastery: view.mastery,
            critical: view.topic.critical,
            blockedBy: view.blockedBy.map((t) => t.title),
            awaitingReviewCount: view.awaitingReviewCount,
            hasLesson: true,
          }
        }),
      }
    }),
  }))

  const moduleTitle = syllabus.modules.get(topic.moduleId)?.title

  return (
    <WorkspaceShell
      title={topic.title}
      {...(moduleTitle !== undefined ? { subtitle: moduleTitle } : {})}
      navigator={
        <Navigator
          phases={phases}
          syllabusId={syllabusParam}
          syllabusTitle={syllabus.title}
          activeTopicId={String(topicId)}
          stats={{
            complete: stats.complete,
            total: stats.total,
            overallMastery: stats.overallMastery,
            awaitingReview: stats.awaitingReview,
          }}
        />
      }
      tutor={<TutorRail topicId={String(topicId)} topicTitle={topic.title} />}
    >
      <TopicViewTracker topicId={String(topicId)} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">{moduleTitle}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg">{topic.title}</h1>
          {lesson?.frontmatter.summary && (
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              {lesson.frontmatter.summary}
            </p>
          )}
          {lesson?.frontmatter.readingMinutes && (
            <p className="mt-2 text-xs text-fg-subtle">
              About {lesson.frontmatter.readingMinutes} minutes of reading
            </p>
          )}
        </header>

        {lesson ? (
          <div className="lesson-prose">
            <MDXRemote
              source={lesson.body}
              components={mdxComponents({ topicId: String(topicId), glossary })}
              options={{
                parseFrontmatter: false,
                mdxOptions: {
                  remarkPlugins: [remarkGfm, remarkMath],
                  // Prose math ($...$) renders through the same KaTeX as <Eq>.
                  rehypePlugins: [[rehypeKatex, { output: 'htmlAndMathml', strict: false }]],
                },
              }}
            />
          </div>
        ) : (
          <NotWrittenYet topicTitle={topic.title} />
        )}

        {exercises.length > 0 && (
          <ExerciseSection
            exercises={exercises}
            topicId={String(topicId)}
            progressByExercise={topicProgress?.exercises}
          />
        )}

        <CheckpointPanel
          topicId={String(topicId)}
          topicTitle={topic.title}
          passed={topicProgress?.checkpointPassed ?? false}
          outstanding={
            exercises.filter((e) => {
              const p = topicProgress?.exercises.get(e.id)
              const settled = p?.tutorVerdict ?? (p?.autoVerdict === 'correct' ? 'correct' : null)
              return settled !== 'correct' && settled !== 'partial'
            }).length
          }
        />
      </div>
    </WorkspaceShell>
  )
}

function ExerciseSection({
  exercises,
  topicId,
  progressByExercise,
}: {
  exercises: Exercise[]
  topicId: string
  progressByExercise?: ReadonlyMap<string, import('@core/domain').ExerciseProgress>
}) {
  const groups = groupBySet(exercises)

  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="text-lg font-semibold text-fg">Exercises</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Numeric answers are checked instantly. Anything asking <em>why</em> goes to your instructor.
      </p>

      <div className="mt-6 space-y-8">
        {groups.map((group) => (
          <div key={group.set}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Set {group.set}
            </h3>
            <div className="space-y-4">
              {group.exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  topicId={topicId}
                  {...(progressByExercise?.get(exercise.id)
                    ? { progress: progressByExercise.get(exercise.id)! }
                    : {})}
                  // Math in prompts and solutions is rendered on the server: one KaTeX setup,
                  // and no client bundle needed to read a question.
                  promptHtml={renderInlineMath(exercise.prompt)}
                  {...(exercise.given
                    ? { givenHtml: renderMath(exercise.given, { display: true }) }
                    : {})}
                  {...(exercise.scaffold
                    ? { scaffoldHtml: renderMath(exercise.scaffold, { display: false }) }
                    : {})}
                  solutionHtml={renderInlineMath(exercise.solution)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Renders `$...$` spans inside otherwise plain text, escaping the rest. */
function renderInlineMath(text: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return text
    .split(/(\$[^$]+\$)/g)
    .map((part) =>
      part.startsWith('$') && part.endsWith('$') && part.length > 2
        ? renderMath(part.slice(1, -1), { display: false })
        : escapeHtml(part),
    )
    .join('')
}

function NotWrittenYet({ topicTitle }: { topicTitle: string }) {
  return (
    <div className="rounded-panel border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-fg">No lesson written for {topicTitle} yet.</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
        Ask in the instructor panel and I will write it. Lessons live in{' '}
        <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs">
          content/syllabi/
        </code>{' '}
        and appear here as soon as the file is saved.
      </p>
    </div>
  )
}
