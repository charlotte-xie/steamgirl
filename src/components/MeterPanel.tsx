import { useGame } from '../context/GameContext'
import { METER_INFO, type MeterName } from '../model/Stats'

const METER_NAMES: MeterName[] = ['Energy', 'Arousal', 'Composure', 'Stress', 'Pain', 'Mood']

export function MeterPanel() {
  const { game } = useGame()

  // Filter to show meters with value > 0 or meters with alwaysDisplay flag
  const visibleMeters = METER_NAMES.filter(meterName => {
    const value = game.player.stats.get(meterName) || 0
    const meterInfo = METER_INFO[meterName]
    return value > 0 || meterInfo.alwaysDisplay === true
  })

  if (visibleMeters.length === 0) {
    return null
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 'var(--space-xs)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--space-xs)',
      background: 'var(--bg-panel-soft)'
    }}>
      {visibleMeters.map((meterName) => {
        const meterValue = game.player.stats.get(meterName) || 0
        const meterInfo = METER_INFO[meterName]
        
        const percent = Math.max(0, Math.min(100, meterValue))
        
        return (
          <div 
            key={meterName}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            {/* Meter name on the left */}
            <span 
              style={{ 
                fontWeight: 500,
                color: 'var(--text-main)',
                cursor: 'help',
                fontSize: '0.7rem',
                width: '6em'
              }}
              title={meterInfo.description}
            >
              {meterName}
            </span>
            {/* Progress bar - wider and based on gainColor */}
            <div style={{
              flex: 1,
              height: '1em',
              background: 'var(--bg-overlay)',
              borderRadius: 'var(--radius-sm)',
              opacity: 0.5,
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              position: 'relative'
            }}>
              {/* Meter value segment - uses gainColor */}
              <div 
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${meterInfo.gainColor}, ${meterInfo.gainColor}dd)`,
                  transition: 'width 0.3s ease',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                }}
              />
            </div>
            {/* Value on the right */}
            <span style={{ 
              color: 'var(--text-main)',
              fontSize: '0.75rem',
              width: '2em',
              textAlign: 'right'
            }}>
              {meterValue}
            </span>
          </div>
        )
      })}
    </div>
  )
}
