'use client'

import { useEffect } from 'react'

import { markTopicViewed } from '@/app/actions'

/**
 * Records that a topic was opened.
 *
 * A side effect on mount rather than during render: rendering must stay free of writes, and this
 * should not run during prefetch or a discarded render. The action is idempotent, so a double
 * mount under React strict mode logs one event, not two.
 */
export function TopicViewTracker({ topicId }: { topicId: string }) {
  useEffect(() => {
    void markTopicViewed(topicId)
  }, [topicId])

  return null
}
