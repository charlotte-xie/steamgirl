import { useGame } from '../context/GameContext'
import { Frame } from '../components/Frame'
import { Card } from '../components/Card'
import { SKILL_NAMES, SKILL_INFO } from '../model/Stats'
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
  const { game } = useGame()

  const skillsWithBase = SKILL_NAMES.filter((name) => (game.player.basestats.get(name) || 0) > 0)
  const effectCards = game.player.cards.filter(card => card && card.type === 'Effect') || []

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
          </section>
        </div>
      </div>
    </Frame>
  )
}
