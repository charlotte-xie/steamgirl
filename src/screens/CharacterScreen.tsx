import { useGame } from '../context/GameContext'
import { Frame } from '../components/Frame'
import { Card } from '../components/Card'
import { SKILL_NAMES, SKILL_INFO, IMPRESSION_NAMES } from '../model/Stats'
import { capitalise } from '../model/Text'
import { getImpressionCalculators } from '../model/Impression'
import { getCardDefinitions } from '../model/Card'
import { useDebugMode } from './SettingsScreen'
import { GAME_SAVE_AUTO } from '../constants/storage'
import type { TimerName } from '../model/Player'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const TIMER_LABELS: Record<TimerName, string> = {
  lastAction: 'Last action',
  lastSleep: 'Last sleep',
  lastNap: 'Last nap',
  lastWash: 'Last wash',
  lastExercise: 'Last exercise',
  lastEat: 'Last meal',
  lastHairstyle: 'Last hairstyle',
}

function formatTimerValue(timerSeconds: number, nowSeconds: number): string {
  const d = new Date(timerSeconds * 1000)
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHours = hours % 12 || 12
  const time = `${displayHours}:${minutes}${period}`
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`

  const elapsedSeconds = nowSeconds - timerSeconds
  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  let ago: string
  if (elapsedMinutes < 1) {
    ago = 'just now'
  } else if (elapsedMinutes < 60) {
    ago = `${elapsedMinutes} min ago`
  } else {
    const elapsedHours = Math.floor(elapsedMinutes / 60)
    if (elapsedHours < 24) {
      const remainMins = elapsedMinutes % 60
      ago = remainMins > 0 ? `${elapsedHours}h ${remainMins}m ago` : `${elapsedHours}h ago`
    } else {
      const days = Math.floor(elapsedHours / 24)
      ago = `${days} day${days === 1 ? '' : 's'} ago`
    }
  }

  return `${time}, ${date} (${ago})`
}

export function CharacterScreen() {
  const { game, refresh } = useGame()
  const debugMode = useDebugMode()

  const skillsWithBase = SKILL_NAMES.filter((name) => (game.player.basestats.get(name) || 0) > 0)
  const effectCards = game.player.cards.filter(card => card && card.type === 'Effect') || []
  const traitCards = game.player.cards.filter(card => card && card.type === 'Trait') || []

  const allEffects = debugMode ? getCardDefinitions('Effect') : []
  const allTraits = debugMode ? getCardDefinitions('Trait') : []
  const activeIds = new Set([...effectCards, ...traitCards].map(c => c.id))

  const toggleCard = (id: string, addFn: (id: string) => unknown) => {
    if (activeIds.has(id)) {
      game.removeCard(id, true)
    } else {
      addFn(id)
    }
    game.player.calcStats()
    refresh()
    localStorage.setItem(GAME_SAVE_AUTO, JSON.stringify(game.toJSON()))
  }

  const timerEntries = (Object.keys(TIMER_LABELS) as TimerName[])
    .filter(name => game.player.timers.has(name))
    .map(name => ({
      name,
      label: TIMER_LABELS[name],
      value: game.player.timers.get(name)!,
    }))

  return (
    <Frame className="screen-frame">
      <div className="character-screen">
        <div className="character-columns">
          <div className="character-left">
            <section className="info-section">
              <h3>Skills</h3>
              {skillsWithBase.length === 0 ? (
                <p className="text-muted">No skills learned yet.</p>
              ) : (
                <div className="info-list">
                  {skillsWithBase.map((name) => {
                    const base = game.player.basestats.get(name) || 0
                    const info = SKILL_INFO[name]
                    return (
                      <div
                        key={name}
                        className="skill-item"
                        title={info?.description}
                      >
                        <span className="skill-name">{name}</span>
                        <span className="skill-value">{base}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {timerEntries.length > 0 && (
              <section className="info-section">
                <h3>Timers</h3>
                <div className="info-list">
                  {timerEntries.map(({ name, label, value }) => (
                    <div key={name} className="timer-item">
                      <span className="timer-label">{label}</span>
                      <span className="timer-value">{formatTimerValue(value, game.time)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {IMPRESSION_NAMES.length > 0 && (
              <section className="info-section">
                <h3>Impressions</h3>
                <div className="info-list">
                  {IMPRESSION_NAMES.map(name => {
                    const calculators = getImpressionCalculators()
                    const rawBase = calculators.get(name)?.(game.player) ?? 0
                    const base = Math.max(0, Math.min(100, Math.round(rawBase)))
                    const modified = Math.max(0, Math.min(100, Math.round(game.player.stats.get(name) ?? 0)))
                    const diff = modified - base
                    return (
                      <div key={name} className="skill-item">
                        <span className="skill-name">{capitalise(name)}</span>
                        <span className="skill-value">
                          {base}
                          {diff !== 0 && (
                            <span style={{ color: diff > 0 ? '#10b981' : '#ef4444' }}>
                              {' '}{diff > 0 ? '+' : ''}{diff}
                            </span>
                          )}
                          {diff !== 0 && (
                            <span style={{ color: 'var(--text-muted)' }}> = {modified}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          <section className="info-section character-right">
            <h3>Effects</h3>
            {effectCards.length === 0 ? (
              <p className="text-muted">No active effects.</p>
            ) : (
              <div className="cards-container">
                {effectCards.map((card, index) => (
                  card ? <Card key={`${card.id}-${index}`} card={card} /> : null
                ))}
              </div>
            )}

            {debugMode && allEffects.length > 0 && (
              <div className="debug-effects">
                <h4 className="text-muted">Debug: Toggle Effects</h4>
                <div className="debug-effect-grid">
                  {allEffects.map(([id, def]) => (
                    <button
                      key={id}
                      className={`debug-effect-btn ${activeIds.has(id) ? 'active' : ''}`}
                      style={{ borderColor: (def.color as string) ?? 'var(--border)' }}
                      onClick={() => toggleCard(id, (id) => game.addEffect(id))}
                      title={def.description as string ?? id}
                    >
                      <span
                        className="debug-effect-dot"
                        style={{ background: activeIds.has(id) ? ((def.color as string) ?? 'var(--text)') : 'transparent' }}
                      />
                      {def.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="info-section character-right">
            <h3>Traits</h3>
            {traitCards.length === 0 ? (
              <p className="text-muted">No traits.</p>
            ) : (
              <div className="cards-container">
                {traitCards.map((card, index) => (
                  card ? <Card key={`${card.id}-${index}`} card={card} /> : null
                ))}
              </div>
            )}

            {debugMode && allTraits.length > 0 && (
              <div className="debug-effects">
                <h4 className="text-muted">Debug: Toggle Traits</h4>
                <div className="debug-effect-grid">
                  {allTraits.map(([id, def]) => (
                    <button
                      key={id}
                      className={`debug-effect-btn ${activeIds.has(id) ? 'active' : ''}`}
                      style={{ borderColor: (def.color as string) ?? 'var(--border)' }}
                      onClick={() => toggleCard(id, (id) => game.addTrait(id))}
                      title={def.description as string ?? id}
                    >
                      <span
                        className="debug-effect-dot"
                        style={{ background: activeIds.has(id) ? ((def.color as string) ?? 'var(--text)') : 'transparent' }}
                      />
                      {def.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </Frame>
  )
}
