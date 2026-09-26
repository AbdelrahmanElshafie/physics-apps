import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import type { Exercise } from '@core/domain'
import { ExerciseCard } from '@/components/exercise/ExerciseCard'
import { renderMath } from '@/lib/katex'

/**
 * Regression test for a real bug found writing Topic 11.1's second lesson: Q9 asked "which
 * quantum number does H = p^2/2m + V have no way to depend on?" with choices like `$j$` and
 * `$\ell$`, and every one of them rendered as the literal text `$j$` in the browser — multichoice
 * labels were never run through KaTeX at all, unlike the prompt and solution.
 *
 * The fix mirrors the existing prompt/solution pattern: the page pre-renders each choice's label
 * to HTML server-side and passes it down keyed by choice id, so ExerciseCard never does its own
 * math splitting. This test exercises the client side of that contract.
 */

afterEach(cleanup)

const BASE_EXERCISE: Exercise = {
  id: 'q9',
  set: 'C',
  kind: 'multichoice',
  prompt: 'Which quantum number does $H = p^2/2m + V$ have no way to depend on?',
  choices: [
    { id: 'l', label: '$\\ell$, the orbital angular momentum' },
    { id: 'j', label: '$j$, the total angular momentum' },
  ],
  check: { type: 'exact', value: 'j' },
  explain: { required: false },
  solution: 'j.',
  revealPolicy: 'after-attempt',
}

describe('ExerciseCard, multichoice labels', () => {
  it('renders a typeset choice label as maths, not literal dollar-sign text', () => {
    const choiceHtml = Object.fromEntries(
      BASE_EXERCISE.choices!.map((c) => {
        // Same $...$ splitting the page does for the prompt; here inlined rather than imported
        // because the page's version is a private helper, not exported.
        const html = c.label
          .split(/(\$[^$]+\$)/g)
          .map((part) =>
            part.startsWith('$') && part.endsWith('$') && part.length > 2
              ? renderMath(part.slice(1, -1), { display: false })
              : part,
          )
          .join('')
        return [c.id, html]
      }),
    )

    const { container } = render(
      <ExerciseCard
        exercise={BASE_EXERCISE}
        topicId="m11.1-failures-of-the-schrodinger-equation"
        promptHtml={renderMath('H = p^2/2m + V', { display: false })}
        solutionHtml="j."
        choiceHtml={choiceHtml}
      />,
    )

    // The point of the bug: literal "$j$" text must never reach the page.
    expect(container.textContent).not.toContain('$j$')
    expect(container.textContent).not.toContain('$\\ell$')

    // And real KaTeX output — the .katex wrapper span — must be present for each choice.
    const katexNodes = container.querySelectorAll('.katex')
    expect(katexNodes.length).toBeGreaterThanOrEqual(BASE_EXERCISE.choices!.length)
  })

  it('falls back to the plain label when a choice has no pre-rendered HTML', () => {
    // Existing content (lesson 1's bra/ket questions) has plain-text choices with no math and no
    // choiceHtml at all — that path must keep working unchanged.
    const plainExercise: Exercise = {
      ...BASE_EXERCISE,
      choices: [
        { id: 'number', label: 'A complex number' },
        { id: 'operator', label: 'An operator' },
      ],
    }

    const { container } = render(
      <ExerciseCard
        exercise={plainExercise}
        topicId="m1.1-dirac-notation-bra-ket"
        promptHtml="What kind of object is this?"
        solutionHtml="An operator."
      />,
    )

    expect(container.textContent).toContain('A complex number')
    expect(container.textContent).toContain('An operator')
  })
})
