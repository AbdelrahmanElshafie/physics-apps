import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

import { Eq } from '@/components/math/Eq'
import { M } from '@/components/math/Math'
import { CircuitCanvas } from '@/components/circuit/CircuitCanvas'
import type { GridPoint, PlacedComponent } from '@/components/circuit/grid'

import { Callout, Compare, Derivation, Step } from './blocks'
import { Predict } from './Predict'

/** The component vocabulary available to lesson authors. */
export function mdxComponents(): MDXComponents {
  return {
    M: ({ children }: { children: string }) => <M>{children}</M>,
    Eq: ({ latex, id, label, number }: { latex: string; id: string; label?: string; number?: string }) => (
      <Eq latex={latex} id={id} {...(label !== undefined ? { label } : {})} {...(number !== undefined ? { number } : {})} />
    ),

    Callout,
    Compare,
    Derivation,
    Step,
    Predict,

    // A fixed, read-only circuit diagram embedded in a lesson: `<Circuit components={[...]} />`.
    Circuit: ({
      components,
      ground,
      caption,
    }: {
      components: PlacedComponent[]
      ground?: GridPoint
      caption?: string
    }) => (
      <CircuitCanvas
        initial={components}
        readOnly
        {...(ground !== undefined ? { ground } : {})}
        {...(caption !== undefined ? { caption } : {})}
      />
    ),

    table: ({ children }: { children?: ReactNode }) => (
      <div className="pane-scroll my-6 overflow-x-auto rounded-panel border border-border">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th className="border-b border-border bg-surface-raised px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="border-b border-border px-3.5 py-2.5 align-top">{children}</td>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="my-5 border-r-2 border-border-strong pr-4 text-fg-subtle italic">{children}</blockquote>
    ),
    hr: () => <hr className="my-8 border-border" />,
  }
}
