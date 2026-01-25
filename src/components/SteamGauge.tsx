import type { CSSProperties } from 'react'

type SteamGaugeProps = {
  value: number // 0-100
  label: string
  color: string
  description?: string
}

export function SteamGauge({ value, label, color, description }: SteamGaugeProps) {
  // Clamp value to 0-100
  const percent = Math.max(0, Math.min(100, value))

  const size = 80
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const center = size / 2

  // Arc goes from West (180°) through North (90°) to East (0°)
  // 0% = 180° (left), 50% = 90° (top), 100% = 0° (right)
  // Angle decreases as value increases

  // Calculate the current value angle
  // At 0%, angle = 180°; at 100%, angle = 0°
  const valueAngleDeg = 180 - (percent * 1.8) // 1.8 = 180/100

  // Convert to radians (SVG uses standard math coordinates)
  const toRad = (deg: number) => (deg * Math.PI) / 180

  // Calculate arc endpoints
  // For upper semicircle: start at left (180°), end at right (0°)
  const bgStartX = center + radius * Math.cos(toRad(180))
  const bgStartY = center - radius * Math.sin(toRad(180)) // Flip Y for SVG
  const bgEndX = center + radius * Math.cos(toRad(0))
  const bgEndY = center - radius * Math.sin(toRad(0))

  // Background arc (full upper semicircle) - sweep counterclockwise
  const bgPath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 0 1 ${bgEndX} ${bgEndY}`

  // Value arc endpoints
  const valueStartX = center + radius * Math.cos(toRad(180))
  const valueStartY = center - radius * Math.sin(toRad(180))
  const valueEndX = center + radius * Math.cos(toRad(valueAngleDeg))
  const valueEndY = center - radius * Math.sin(toRad(valueAngleDeg))

  // Large arc flag: 1 if arc > 180 degrees (which won't happen in our 0-180 range)
  const largeArcFlag = 0

  const valuePath = percent > 0
    ? `M ${valueStartX} ${valueStartY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${valueEndX} ${valueEndY}`
    : ''

  // Needle angle (same as value angle)
  // Needle extends into the gauge arc (to middle of stroke)
  const needleAngleDeg = valueAngleDeg
  const needleLength = radius // Goes to the middle of the arc stroke
  const needleEndX = center + needleLength * Math.cos(toRad(needleAngleDeg))
  const needleEndY = center - needleLength * Math.sin(toRad(needleAngleDeg))

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  }

  const gaugeStyle: CSSProperties = {
    position: 'relative',
    width: size,
    height: size / 2 + 16, // Half circle + space for value
  }

  const svgStyle: CSSProperties = {
    overflow: 'visible',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
  }

  const labelStyle: CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: 'var(--text-main)',
    cursor: description ? 'help' : 'default',
  }

  const valueStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-main)',
    background: 'rgba(14, 11, 9, 0.9)',
    border: '1px solid rgba(220, 170, 90, 0.5)',
    borderRadius: '4px',
    padding: '0 4px',
  }

  return (
    <div style={containerStyle}>
      {/* Gauge first, label below */}
      <div style={gaugeStyle}>
        <svg
          width={size}
          height={size / 2 + 8}
          viewBox={`0 0 ${size} ${size / 2 + 8}`}
          style={svgStyle}
        >
          {/* Offset everything down by strokeWidth/2 so arc isn't clipped */}
          <g transform={`translate(0, ${strokeWidth / 2 + 2})`}>
            {/* Outer brass ring */}
            <path
              d={bgPath}
              fill="none"
              stroke="rgba(220, 170, 90, 0.3)"
              strokeWidth={strokeWidth + 4}
              strokeLinecap="round"
            />

            {/* Background track */}
            <path
              d={bgPath}
              fill="none"
              stroke="rgba(14, 11, 9, 0.8)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const tickAngleDeg = 180 - (tick * 1.8)
              const innerR = radius - strokeWidth / 2 - 4
              const outerR = radius - strokeWidth / 2 + 4
              const x1 = center + innerR * Math.cos(toRad(tickAngleDeg))
              const y1 = center - innerR * Math.sin(toRad(tickAngleDeg))
              const x2 = center + outerR * Math.cos(toRad(tickAngleDeg))
              const y2 = center - outerR * Math.sin(toRad(tickAngleDeg))
              return (
                <line
                  key={tick}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 200, 120, 0.5)"
                  strokeWidth={1}
                />
              )
            })}

            {/* Value arc with glow */}
            {valuePath && (
              <path
                d={valuePath}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 3px ${color})`,
                }}
              />
            )}

            {/* Center decorative element (at bottom center of semicircle) */}
            <circle
              cx={center}
              cy={center}
              r={4}
              fill="rgba(220, 170, 90, 0.6)"
              stroke="rgba(255, 200, 120, 0.8)"
              strokeWidth={1}
            />

            {/* Needle */}
            <line
              x1={center}
              y1={center}
              x2={needleEndX}
              y2={needleEndY}
              stroke="rgba(255, 200, 120, 0.9)"
              strokeWidth={2}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))',
                transition: 'all 0.3s ease',
              }}
            />
          </g>
        </svg>
        <span style={valueStyle}>{Math.round(value)}</span>
      </div>
      {/* Label below the gauge */}
      <span style={labelStyle} title={description}>{label}</span>
    </div>
  )
}
