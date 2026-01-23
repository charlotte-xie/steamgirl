import type { ReactNode } from 'react'

interface WidgetProps {
  children: ReactNode
  className?: string
}

export function Widget({ children, className = '' }: WidgetProps) {
  return (
    <div className={`widget-panel ${className}`} style={{ position: 'relative', width: '200px', height: '120px' }}>
      <svg width="200" height="120" viewBox="0 0 200 120" className="clock-svg" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Outer frame */}
        <defs>
          <linearGradient id="widgetBrassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a574" />
            <stop offset="50%" stopColor="#b88652" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
          <linearGradient id="widgetBrassDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b6914" />
            <stop offset="100%" stopColor="#5a4510" />
          </linearGradient>
          <filter id="widgetShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.5" />
          </filter>
        </defs>
        
        {/* Decorative corner gears */}
        <circle cx="20" cy="20" r="8" fill="url(#widgetBrassGradient)" opacity="0.6">
          <title>Decorative gear</title>
        </circle>
        <circle cx="180" cy="20" r="8" fill="url(#widgetBrassGradient)" opacity="0.6" />
        <circle cx="20" cy="100" r="8" fill="url(#widgetBrassGradient)" opacity="0.6" />
        <circle cx="180" cy="100" r="8" fill="url(#widgetBrassGradient)" opacity="0.6" />
        
        {/* Gear teeth */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
          const angle = (i * Math.PI * 2) / 8
          const gearPositions = [
            { cx: 20, cy: 20 },
            { cx: 180, cy: 20 },
            { cx: 20, cy: 100 },
            { cx: 180, cy: 100 },
          ]
          return gearPositions.map((pos, idx) => (
            <rect
              key={`${idx}-${i}`}
              x={pos.cx + Math.cos(angle) * 8 - 1}
              y={pos.cy + Math.sin(angle) * 8 - 1}
              width="2"
              height="4"
              fill="url(#widgetBrassDark)"
              opacity="0.7"
              transform={`rotate(${angle * 180 / Math.PI} ${pos.cx} ${pos.cy})`}
            />
          ))
        })}
        
        {/* Main frame */}
        <rect x="10" y="10" width="180" height="100" rx="8" 
              fill="url(#widgetBrassGradient)" 
              stroke="url(#widgetBrassDark)" 
              strokeWidth="2"
              filter="url(#widgetShadow)" />
        
        {/* Inner panel */}
        <rect x="20" y="20" width="160" height="80" rx="4" 
              fill="rgba(34, 24, 16, 0.9)" 
              stroke="rgba(220, 170, 90, 0.4)" 
              strokeWidth="1" />
        
        {/* Rivets */}
        {[
          { x: 25, y: 25 },
          { x: 175, y: 25 },
          { x: 25, y: 95 },
          { x: 175, y: 95 },
        ].map((pos, i) => (
          <circle key={i} cx={pos.x} cy={pos.y} r="3" fill="url(#widgetBrassGradient)" opacity="0.8">
            <title>Rivet</title>
          </circle>
        ))}
      </svg>
      {/* Content area - children rendered here, positioned over the border */}
      <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  )
}
