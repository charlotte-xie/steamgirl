import { useGame } from '../context/GameContext'
import { STAT_NAMES, MAIN_STAT_INFO, type MainStatName } from '../model/Stats'
import { MeterPanel } from './MeterPanel'
import { Frame } from './Frame'

const STAT_ABBREV: Record<MainStatName, string> = {
  Dexterity: 'Dx',
  Strength: 'St',
  Perception: 'Pe',
  Wits: 'Wi',
  Charm: 'Ch',
  Willpower: 'Wp',
}

export function StatsPanel() {
  const { game } = useGame()
  return (
    <Frame className="stats-panel-frame">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 'var(--space-xs)',
          textAlign: 'center',
        }}>
        {STAT_NAMES.map((statName) => {
          const statValue = game.player.stats.get(statName) || 0
          const baseValue = game.player.basestats.get(statName) || 0
          const modifier = statValue - baseValue
          const modifierText = modifier !== 0
            ? ` (${modifier > 0 ? '+' : ''}${modifier} from modifiers)`
            : ''
          const tooltip = `${statName} = ${statValue}${modifierText}\n${MAIN_STAT_INFO[statName].description}`

          return (
            <div
              key={statName}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'help',
              }}
              title={tooltip}
            >
              <span style={{
                fontWeight: 500,
                color: 'var(--text-muted)',
                fontSize: 'var(--font-sm)',
              }}>
                {STAT_ABBREV[statName]}
              </span>
              <span style={{
                color: modifier > 0 ? '#10b981' : modifier < 0 ? '#ef4444' : 'var(--text-main)',
                fontWeight: 600,
                fontSize: 'var(--font-md)',
              }}>
                {statValue}
              </span>
            </div>
          )
        })}
        </div>
        <MeterPanel />
      </div>
    </Frame>
  )
}
