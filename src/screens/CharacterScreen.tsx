import { useGame } from '../context/GameContext'
import { Frame } from '../components/Frame'
import { Card } from '../components/Card'
import { SKILL_NAMES, SKILL_INFO } from '../model/Stats'

export function CharacterScreen() {
  const { game } = useGame()

  const skillsWithBase = SKILL_NAMES.filter((name) => (game.player.basestats.get(name) || 0) > 0)
  const effectCards = game.player.cards.filter(card => card && card.type === 'Effect') || []

  return (
    <Frame className="screen-frame">
      <div className="character-screen">
        <div className="character-columns">
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

          <section className="info-section">
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
