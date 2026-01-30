import { useGame } from '../context/GameContext'
import { Widget } from './Widget'
import { RemindersPanel } from './RemindersPanel'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function Clock() {
  const { game, runScript } = useGame()
  const date = game.date
  const inScene = game.inScene

  const formatTime = (d: Date): string => {
    const hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const period = hours >= 12 ? 'pm' : 'am'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes}${period}`
  }

  const formatDate = (d: Date): string => {
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  }

  const timeStr = formatTime(date)
  const dateStr = formatDate(date)
  const dayStr = DAYS[date.getDay()]

  // Clock hand angles
  const hourAngle = (((date.getHours() % 12) * 30 + date.getMinutes() * 0.5 - 90) * Math.PI) / 180
  const minuteAngle = ((date.getMinutes() * 6 - 90) * Math.PI) / 180

  return (
    <Widget>
      <div className="clock-widget">
        <div className="clock-layout">
          {/* Left: Clock face */}
          <svg width="76" height="76" viewBox="0 0 76 76" className="clock-face">
            {/* Outer cog teeth */}
            {[...Array(16)].map((_, i) => {
              const angle = (i * Math.PI * 2) / 16
              const cos = Math.cos(angle)
              const sin = Math.sin(angle)
              const innerR = 33
              const outerR = 37
              const halfTooth = Math.PI / 32
              const a1 = angle - halfTooth
              const a2 = angle + halfTooth
              return (
                <polygon
                  key={`tooth-${i}`}
                  points={`
                    ${38 + Math.cos(a1) * innerR},${38 + Math.sin(a1) * innerR}
                    ${38 + Math.cos(a1) * outerR},${38 + Math.sin(a1) * outerR}
                    ${38 + cos * (outerR + 1)},${38 + sin * (outerR + 1)}
                    ${38 + Math.cos(a2) * outerR},${38 + Math.sin(a2) * outerR}
                    ${38 + Math.cos(a2) * innerR},${38 + Math.sin(a2) * innerR}
                  `}
                  fill="rgba(180, 130, 60, 0.7)"
                />
              )
            })}

            {/* Cog body ring */}
            <circle cx="38" cy="38" r="33" fill="none" stroke="rgba(180, 130, 60, 0.7)" strokeWidth="2.5" />

            {/* Outer brass bezel */}
            <circle cx="38" cy="38" r="30" fill="rgba(52, 32, 16, 0.95)" stroke="rgba(220, 170, 90, 0.6)" strokeWidth="2" />

            {/* Inner face */}
            <circle cx="38" cy="38" r="25" fill="rgba(34, 24, 16, 0.9)" />

            {/* Decorative inner ring */}
            <circle cx="38" cy="38" r="23" fill="none" stroke="rgba(102, 87, 64, 0.3)" strokeWidth="0.5" />

            {/* Hour markers */}
            {[...Array(12)].map((_, i) => {
              const angle = (i * Math.PI * 2) / 12 - Math.PI / 2
              const isMajor = i % 3 === 0
              const x1 = 38 + Math.cos(angle) * (isMajor ? 18 : 20)
              const y1 = 38 + Math.sin(angle) * (isMajor ? 18 : 20)
              const x2 = 38 + Math.cos(angle) * 23
              const y2 = 38 + Math.sin(angle) * 23
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isMajor ? 'rgba(220, 170, 90, 0.8)' : 'rgba(102, 87, 64, 0.7)'}
                strokeWidth={isMajor ? 2 : 1} />
            })}

            {/* Hour hand */}
            <line x1="38" y1="38" x2={38 + Math.cos(hourAngle) * 13} y2={38 + Math.sin(hourAngle) * 13}
                  stroke="rgba(220, 170, 90, 0.9)" strokeWidth="3" strokeLinecap="round" />

            {/* Minute hand */}
            <line x1="38" y1="38" x2={38 + Math.cos(minuteAngle) * 20} y2={38 + Math.sin(minuteAngle) * 20}
                  stroke="rgba(255, 214, 170, 0.9)" strokeWidth="1.5" strokeLinecap="round" />

            {/* Centre boss */}
            <circle cx="38" cy="38" r="3" fill="rgba(180, 130, 60, 0.6)" stroke="rgba(220, 170, 90, 0.8)" strokeWidth="1" />
            <circle cx="38" cy="38" r="1.5" fill="rgba(220, 170, 90, 0.9)" />
          </svg>

          {/* Right: Text display */}
          <div className="clock-text">
            <div className="clock-time">{timeStr}</div>
            <div className="clock-date">{dateStr}</div>
            <div className="clock-day">{dayStr}</div>
          </div>
        </div>

        {/* Wait buttons row */}
        <div className="clock-wait-row">
          <span className="clock-wait-label">Wait:</span>
          <div className="clock-wait-buttons">
            {([
              { minutes: 1, label: '1' },
              { minutes: 10, label: '10' },
              { minutes: 60, label: '1h' },
              { minutes: 360, label: '6h' },
            ] as const).map(({ minutes, label }) => (
              <button
                key={minutes}
                type="button"
                className="clock-wait-btn"
                disabled={inScene}
                onClick={() => runScript(['wait', { minutes, text: 'You wait for a while.' }])}
                title={`Wait ${minutes} minute${minutes === 1 ? '' : 's'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <RemindersPanel />
      </div>
    </Widget>
  )
}
