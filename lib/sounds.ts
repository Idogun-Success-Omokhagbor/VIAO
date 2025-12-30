"use client"

// Lightweight sound helper using hosted audio clips with a Web Audio fallback.
// Hosted sounds are short, non-blocking, and cached by the browser.
const SOUND_URLS = {
  message: "https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3",
  alert: "https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3",
}

let audioCtx: AudioContext | null = null

function getAudioContext() {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  return audioCtx
}

function playViaAudio(url: string) {
  if (typeof window === "undefined") return false
  try {
    const audio = new Audio(url)
    audio.volume = 0.2
    void audio.play()
    return true
  } catch {
    return false
  }
}

// Fallback beep if hosted audio fails/blocked.
function playTone(frequency: number, durationMs: number, volume = 0.1) {
  const ctx = getAudioContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = "sine"
  oscillator.frequency.value = frequency
  gainNode.gain.value = volume

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  const now = ctx.currentTime
  oscillator.start(now)
  oscillator.stop(now + durationMs / 1000)
}

export function playMessageSound() {
  const ok = playViaAudio(SOUND_URLS.message)
  if (!ok) playTone(880, 160, 0.12)
}

export function playAlertSound() {
  const ok = playViaAudio(SOUND_URLS.alert)
  if (!ok) playTone(520, 200, 0.12)
}
