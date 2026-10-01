'use client'

import { useState, type MouseEvent } from 'react'
import { Volume2 } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Plays a piece of Russian text through the browser's own text-to-speech.
 *
 * No audio files, no API key, no server round-trip: `window.speechSynthesis` is built into every
 * modern browser, and Chrome ships a genuinely good Russian voice (Google's cloud TTS) alongside
 * it. This is the only practical way to put real pronunciation — and real, unpredictable Russian
 * stress — into a text-only lesson without recording and hosting audio for every single word.
 *
 * Picks the best available ru-RU voice once (voice lists load asynchronously in some browsers,
 * hence the retry) and reuses it for every button on the page.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined

function pickRussianVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice
  if (typeof window === 'undefined' || !window.speechSynthesis) return null

  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null // Not loaded yet — caller will retry on next click.

  // A non-local (cloud) voice is preferred over a local one where both exist — local system
  // voices are usually lower quality.
  const byPreference = [...voices]
    .filter((v) => v.lang.toLowerCase().startsWith('ru'))
    .sort((a, b) => (a.localService ? 0 : 1) - (b.localService ? 0 : 1))

  cachedVoice = byPreference[0] ?? null
  return cachedVoice
}

export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const [unsupported, setUnsupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  if (unsupported) return null

  const speak = (event: MouseEvent) => {
    // This button is often nested inside a <label> (a multichoice option) — without stopping
    // propagation, the browser also forwards the click to that label's radio input, silently
    // selecting the answer just because someone wanted to hear it pronounced.
    event.preventDefault()
    event.stopPropagation()

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setUnsupported(true)
      return
    }

    window.speechSynthesis.cancel() // A second click interrupts the first, rather than queuing.

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickRussianVoice()
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? 'ru-RU'
    utterance.rate = 0.9 // Slightly slower than default — easier to catch stress while learning.

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`Play pronunciation: ${text}`}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full p-1 text-accent transition-colors hover:bg-accent-muted/40',
        speaking && 'text-accent-strong',
        className,
      )}
    >
      <Volume2 className={cn('size-4', speaking && 'animate-pulse')} aria-hidden />
    </button>
  )
}
