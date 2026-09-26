// Re-exports the shared, subject-agnostic domain (syllabus/graph/exercise/progress) alongside
// this app's own physics, so every consumer imports from one place: `@core/domain`.
export * from '@physics/core/domain'
export * from './electricity'
