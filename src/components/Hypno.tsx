import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** A suggestion that flashes at random positions. */
export interface HypnoSuggestion {
  text: string
  colour: string
  size: number
  rate: number
  duration: number
}

interface ActiveFlash {
  id: number
  text: string
  colour: string
  size: number
  left: number
  top: number
  expiresAt: number
}

interface HypnoProps {
  /** When true, overlay is position:fixed and covers the viewport. Default false (fills parent). */
  fullScreen?: boolean
  /** Optional extra class for the overlay. */
  className?: string
  /** Optional child content (e.g. text) rendered in the centre with the box. */
  children?: ReactNode
  /** Optional. When set, clicking the overlay invokes this (e.g. to close). */
  onDismiss?: () => void
  /** Suggestions that flash at random positions. Each: text, colour, size (px), rate (flashes/sec), duration (sec). */
  suggestions?: HypnoSuggestion[]
}

const TICK_MS = 20

export function Hypno({
  fullScreen = false,
  className = '',
  children,
  onDismiss,
  suggestions = [],
}: HypnoProps) {
  const [activeFlashes, setActiveFlashes] = useState<ActiveFlash[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    if (suggestions.length === 0) {
      setActiveFlashes([])
      return
    }
    const interval = setInterval(() => {
      const now = Date.now()
      setActiveFlashes((prev) => {
        const filtered = prev.filter((f) => now < f.expiresAt)
        const toAdd: ActiveFlash[] = []
        for (const s of suggestions) {
          if (Math.random() < s.rate * (TICK_MS / 1000)) {
            toAdd.push({
              id: ++idRef.current,
              text: s.text,
              colour: s.colour,
              size: s.size,
              left: 15 + Math.random() * 70,
              top: 15 + Math.random() * 70,
              expiresAt: now + s.duration * 1000,
            })
          }
        }
        return [...filtered, ...toAdd]
      })
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [suggestions])

  return (
    <div
      className={`hypno-overlay ${className}`.trim()}
      style={{
        position: fullScreen ? 'fixed' : 'absolute',
        inset: 0,
        ...(fullScreen && { zIndex: 9000 }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 182, 193, 0.35)',
        pointerEvents: 'auto',
      }}
      aria-hidden="true"
      onClick={onDismiss}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        
        {activeFlashes.map((f) => (
          <div
            key={f.id}
            style={{
              position: 'absolute',
              left: `${f.left}%`,
              top: `${f.top}%`,
              transform: 'translate(-50%, -50%)',
              color: f.colour,
              fontSize: f.size,
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            {f.text}
          </div>
        ))}
      </div>
      {children}
      <div className="hypno-box" />
    </div>
  )
}
