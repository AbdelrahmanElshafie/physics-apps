/**
 * The launcher that lists every course and opens any of them — see apps/hub. Every course app
 * links back to it from its header, the same way the hub links out to each course: a plain,
 * hardcoded port, consistent with how every cross-app link in this workspace already works
 * (apps/hub/src/lib/courses.ts does the same in reverse, one entry per course).
 */
export const HUB_URL = 'http://localhost:3000'
