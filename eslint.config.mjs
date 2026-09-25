import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'data/**', 'next-env.d.ts'],
  },
  {
    // ARCHITECTURE BOUNDARY (see plan: ports & adapters).
    // src/core must stay pure: no framework, no Node, no adapters, no UI.
    // If this rule fires, the dependency is pointing the wrong way — invert it
    // behind a port in src/core/ports instead of relaxing the rule.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['next', 'next/*'], message: 'core/ must not depend on Next.js.' },
            { group: ['react', 'react-dom', 'react/*'], message: 'core/ must not depend on React.' },
            { group: ['node:*', 'fs', 'path', 'os'], message: 'core/ must not touch the filesystem — define a port.' },
            { group: ['@adapters/*', '../adapters/*', '**/adapters/**'], message: 'core/ must not import adapters — depend on a port.' },
            { group: ['@/components/*', '@/app/*', '**/components/**'], message: 'core/ must not import UI.' },
            { group: ['yaml', 'katex', 'mathlive', 'zustand'], message: 'core/ must stay free of infrastructure libraries.' },
          ],
        },
      ],
    },
  },
]

export default config
