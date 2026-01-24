import type { ReactNode } from 'react'

type FrameSize = 'sm' | 'md' | 'lg' | 'auto'

interface FrameProps {
  children: ReactNode
  /** Size preset: sm (120px), md (200px), lg (280px), auto (fit content) */
  size?: FrameSize
  /** Show corner rivets */
  rivets?: boolean
  /** Additional CSS class */
  className?: string
}

const SIZE_MAP: Record<FrameSize, string | undefined> = {
  sm: '120px',
  md: '200px',
  lg: '280px',
  auto: undefined,
}

/**
 * A reusable steampunk-styled frame with optional corner rivets.
 * Use for panels, widgets, and other framed content.
 */
export function Frame({ children, size = 'auto', rivets = true, className = '' }: FrameProps) {
  const width = SIZE_MAP[size]

  return (
    <div
      className={`frame ${className}`}
      style={width ? { width, minWidth: width } : undefined}
    >
      {rivets && (
        <>
          <div className="frame-rivet" data-corner="tl" />
          <div className="frame-rivet" data-corner="tr" />
          <div className="frame-rivet" data-corner="bl" />
          <div className="frame-rivet" data-corner="br" />
        </>
      )}
      <div className="frame-content">
        {children}
      </div>
    </div>
  )
}
