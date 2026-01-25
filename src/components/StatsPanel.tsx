import { useGame } from '../context/GameContext'
import { STAT_NAMES, MAIN_STAT_INFO } from '../model/Stats'
import { MeterPanel } from './MeterPanel'
import { Frame } from './Frame'

export function StatsPanel() {
  const { game } = useGame()
  return (
    <Frame className="stats-panel-frame">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 'var(--space-xs)',
          fontSize: '0.8rem'
        }}>
        {STAT_NAMES.map((statName) => {
          const statValue = game.player.stats.get(statName) || 0
          const baseValue = game.player.basestats.get(statName) || 0
          const modifier = statValue - baseValue
          
          // Calculate percentages for the progress bar segments
          const basePercent = Math.max(0, Math.min(100, baseValue))
          const finalPercent = Math.max(0, Math.min(100, statValue))
          const modifierPercent = Math.abs(modifier)
          const positiveModifier = modifier > 0
          const negativeModifier = modifier < 0
          
          return (
            <div 
              key={statName}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 'var(--space-xs)',
                background: 'var(--bg-panel-soft)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 'var(--space-xs)'
              }}>
                <span 
                  style={{ 
                    fontWeight: 500,
                    color: 'var(--text-main)',
                    cursor: 'help'
                  }}
                  title={MAIN_STAT_INFO[statName].description}
                >
                  {statName}
                </span>
                <span style={{ 
                  color: 'var(--text-main)',
                  fontSize: '0.75rem'
                }}>
                  {modifier !== 0 && (
                    <span style={{ 
                      color: modifier > 0 ? '#10b981' : '#ef4444',
                      marginRight: 'var(--space-xs)'
                    }}>
                      ({modifier > 0 ? '+' : ''}{modifier})
                    </span>
                  )}
                  {statValue}
                </span>
              </div>
              {/* Progress bar with base stat and modifier segments */}
              <div style={{
                width: '100%',
                height: '0.5em',
                background: 'var(--bg-overlay)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                position: 'relative'
              }}>
                {/* Base stat segment - blue/neutral color (shown up to base value) */}
                <div 
                  style={{
                    width: `${basePercent}%`,
                    height: '100%',
                    background: baseValue >= 80 
                      ? 'linear-gradient(90deg, #3b82f6, #2563eb)' 
                      : baseValue >= 50
                      ? 'linear-gradient(90deg, #60a5fa, #3b82f6)'
                      : baseValue >= 25
                      ? 'linear-gradient(90deg, #93c5fd, #60a5fa)'
                      : 'linear-gradient(90deg, #dbeafe, #bfdbfe)',
                    transition: 'width 0.3s ease',
                    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                  }}
                />
                {/* Positive modifier segment (green) - extends beyond base */}
                {positiveModifier && (
                  <div 
                    style={{
                      width: `${Math.min(modifierPercent, 100 - basePercent)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                    }}
                  />
                )}
                {/* Negative modifier segment (red) - shows the reduction from base */}
                {negativeModifier && (
                  <div 
                    style={{
                      width: `${Math.min(modifierPercent, basePercent - finalPercent)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
                      position: 'absolute',
                      left: `${finalPercent}%`,
                      borderLeft: '1px solid rgba(239, 68, 68, 0.8)'
                    }}
                  />
                )}
              </div>
            </div>
          )
        })}
        </div>
        <MeterPanel />
      </div>
    </Frame>
  )
}
