import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 650

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Counts smoothly from the previous value to the new one (ease-out, ~0.65 s). */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  // Start from 0 so a value counts up when it first appears.
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0))
  const fromRef = useRef(prefersReducedMotion() ? value : 0)

  useEffect(() => {
    const from = fromRef.current
    fromRef.current = value
    if (from === value || prefersReducedMotion()) {
      setDisplay(value)
      return
    }

    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <span className={`tabular-nums ${className ?? ''}`}>{display}</span>
}
