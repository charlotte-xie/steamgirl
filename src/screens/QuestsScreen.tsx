import { useGame } from '../context/GameContext'
import { Frame } from '../components/Frame'
import { Card } from '../components/Card'

export function QuestsScreen() {
  const { game } = useGame()

  const questCards = game.player.cards.filter(card => card && (card.type === 'Quest' || card.type === 'Date')) || []

  return (
    <Frame className="screen-frame">
      <div className="quests-screen">
        <h3>Quests</h3>
        {questCards.length === 0 ? (
          <p className="text-muted">No quests available.</p>
        ) : (
          <div className="cards-container">
            {questCards.map((card, index) => (
              card ? <Card key={`${card.id}-${index}`} card={card} /> : null
            ))}
          </div>
        )}
      </div>
    </Frame>
  )
}
