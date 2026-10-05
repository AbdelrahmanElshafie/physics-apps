import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship as TypeScript source (no build step) — Next must transpile them.
  transpilePackages: ['@physics/core'],
  serverExternalPackages: ['yaml'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  /*
   * `src/lib/courses.ts` reads every sibling app's content off disk at a path it builds from a
   * plain string template (`path.join(APPS_ROOT, course.dir, ...)`), not a static import. Next's
   * output file tracing can only bundle what it can see by static analysis, so without this, a
   * deployed hub throws ENOENT the moment it tries to read any course's syllabus or event log —
   * it works in `pnpm dev` purely because the whole monorepo sits on disk uncompiled.
   * One entry per course registered in `COURSES`; a new course app needs a line here too.
   */
  outputFileTracingIncludes: {
    '/': [
      '../chinese-tutor/content/**/*',
      '../chinese-tutor/data/events.jsonl',
      '../russian-tutor/content/**/*',
      '../russian-tutor/data/events.jsonl',
      '../spanish-tutor/content/**/*',
      '../spanish-tutor/data/events.jsonl',
      '../physics-instructor/content/**/*',
      '../physics-instructor/data/events.jsonl',
      '../physics-eg/content/**/*',
      '../physics-eg/data/events.jsonl',
    ],
  },
}

export default nextConfig
