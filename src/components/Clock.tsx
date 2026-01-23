import { useGame } from '../context/GameContext'
import { Widget } from './Widget'

export function Clock() {
  const { game } = useGame()
  const date = game.date
  
  // Format date and time
  const formatDate = (d: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = d.getDate()
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    return `${day} ${month} ${year}`
  }

  const formatTime = (d: Date): string => {
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const dateStr = formatDate(date)
  const timeStr = formatTime(date)

  return (
    <Widget>
      <svg width="200" height="120" viewBox="0 0 200 120" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        {/* Clock face background circle */}
        <circle cx="100" cy="60" r="25" fill="rgba(52, 32, 16, 0.95)" 
                stroke="rgba(220, 170, 90, 0.6)" strokeWidth="2" />
        <circle cx="100" cy="60" r="20" fill="rgba(34, 24, 16, 0.9)" />
        
        {/* Clock center dot */}
        <circle cx="100" cy="60" r="2" fill="rgba(220, 170, 90, 0.8)" />
        
        {/* Hour markers */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
          const angle = (i * Math.PI * 2) / 12 - Math.PI / 2
          const x1 = 100 + Math.cos(angle) * 18
          const y1 = 60 + Math.sin(angle) * 18
          const x2 = 100 + Math.cos(angle) * 22
          const y2 = 60 + Math.sin(angle) * 22
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} 
                  stroke="rgba(102, 87, 64, 0.7)" strokeWidth="1.5" />
          )
        })}
        
        {/* Hour hand */}
        <line x1="100" y1="60" 
              x2={100 + Math.cos(((date.getHours() % 12) * 30 + date.getMinutes() * 0.5 - 90) * Math.PI / 180) * 12}
              y2={60 + Math.sin(((date.getHours() % 12) * 30 + date.getMinutes() * 0.5 - 90) * Math.PI / 180) * 12}
              stroke="rgba(220, 170, 90, 0.9)" strokeWidth="3" strokeLinecap="round" />
        
        {/* Minute hand */}
        <line x1="100" y1="60" 
              x2={100 + Math.cos((date.getMinutes() * 6 - 90) * Math.PI / 180) * 20}
              y2={60 + Math.sin((date.getMinutes() * 6 - 90) * Math.PI / 180) * 20}
              stroke="rgba(255, 214, 170, 0.9)" strokeWidth="1" strokeLinecap="round" />
        
        {/* Time display */}
        <text x="30" y="45" textAnchor="start" 
              fontSize="14" fill="#f4e4c4" 
              fontFamily="var(--font-sans)" fontWeight="600" letterSpacing="0.1em">
          {timeStr}
        </text>

        {/* Date display */}
        <text x="170" y="85" textAnchor="end" 
              fontSize="10" fill="#d0b691" 
              fontFamily="var(--font-sans)" fontWeight="500">
          {dateStr}
        </text>
      </svg>
    </Widget>
  )
}
