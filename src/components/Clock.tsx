import { useGame } from '../context/GameContext'

export function Clock() {
  const { game } = useGame()
  
  if (!game) {
    return null
  }

  // Convert unix timestamp (seconds) to Date
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
    <div className="clock-container">
      <svg width="200" height="120" viewBox="0 0 200 120" className="clock-svg">
        {/* Outer frame */}
        <defs>
          <linearGradient id="brassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4a574" />
            <stop offset="50%" stopColor="#b88652" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
          <linearGradient id="brassDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b6914" />
            <stop offset="100%" stopColor="#5a4510" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.5" />
          </filter>
        </defs>
        
        {/* Decorative corner gears */}
        <circle cx="20" cy="20" r="8" fill="url(#brassGradient)" opacity="0.6">
          <title>Decorative gear</title>
        </circle>
        <circle cx="180" cy="20" r="8" fill="url(#brassGradient)" opacity="0.6" />
        <circle cx="20" cy="100" r="8" fill="url(#brassGradient)" opacity="0.6" />
        <circle cx="180" cy="100" r="8" fill="url(#brassGradient)" opacity="0.6" />
        
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
              fill="url(#brassDark)"
              opacity="0.7"
              transform={`rotate(${angle * 180 / Math.PI} ${pos.cx} ${pos.cy})`}
            />
          ))
        })}
        
        {/* Main frame */}
        <rect x="10" y="10" width="180" height="100" rx="8" 
              fill="url(#brassGradient)" 
              stroke="url(#brassDark)" 
              strokeWidth="2"
              filter="url(#shadow)" />
        
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
          <circle key={i} cx={pos.x} cy={pos.y} r="3" fill="url(#brassGradient)" opacity="0.8">
            <title>Rivet</title>
          </circle>
        ))}
        
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
    </div>
  )
}
