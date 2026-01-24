import { useGame } from '../context/GameContext'
import { Widget } from './Widget'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function Clock() {
  const { game } = useGame()
  const date = game.date

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
  const hourAngle = ((date.getHours() % 12) * 30 + date.getMinutes() * 0.5 - 90) * Math.PI / 180
  const minuteAngle = (date.getMinutes() * 6 - 90) * Math.PI / 180

  return (
    <Widget>
      <div className="clock-layout">
        {/* Left: Clock face */}
        <svg width="70" height="70" viewBox="0 0 70 70" className="clock-face">
          <circle cx="35" cy="35" r="32" fill="rgba(52, 32, 16, 0.95)" stroke="rgba(220, 170, 90, 0.6)" strokeWidth="2" />
          <circle cx="35" cy="35" r="27" fill="rgba(34, 24, 16, 0.9)" />
          <circle cx="35" cy="35" r="2" fill="rgba(220, 170, 90, 0.8)" />

          {/* Hour markers */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * Math.PI * 2) / 12 - Math.PI / 2
            const x1 = 35 + Math.cos(angle) * 21
            const y1 = 35 + Math.sin(angle) * 21
            const x2 = 35 + Math.cos(angle) * 25
            const y2 = 35 + Math.sin(angle) * 25
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(102, 87, 64, 0.7)" strokeWidth="1.5" />
          })}

          {/* Hour hand */}
          <line x1="35" y1="35" x2={35 + Math.cos(hourAngle) * 14} y2={35 + Math.sin(hourAngle) * 14}
                stroke="rgba(220, 170, 90, 0.9)" strokeWidth="3" strokeLinecap="round" />

          {/* Minute hand */}
          <line x1="35" y1="35" x2={35 + Math.cos(minuteAngle) * 21} y2={35 + Math.sin(minuteAngle) * 21}
                stroke="rgba(255, 214, 170, 0.9)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Right: Text display */}
        <div className="clock-text">
          <div className="clock-time">{timeStr}</div>
          <div className="clock-date">{dateStr}</div>
          <div className="clock-day">{dayStr}</div>
        </div>
      </div>
    </Widget>
  )
}
