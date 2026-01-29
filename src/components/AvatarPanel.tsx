import { useGame } from '../context/GameContext'
import { EffectTag } from './EffectTag'
import { Frame } from './Frame'
import { AvatarImage } from './AvatarImage'

interface AvatarPanelProps {
  /** Override the displayed name (useful for character creation screen) */
  nameOverride?: string
}

export function AvatarPanel({ nameOverride }: AvatarPanelProps = {}) {
  const { game } = useGame()

  const effectCards = game.player.cards?.filter((card) => card && card.type === 'Effect') || []
  const displayName = nameOverride ?? (game.player.name || '???')

  return (
    <div className="avatar-container">
      <Frame className="avatar-frame">
        <AvatarImage />
        {/* Status effect tags overlay - top left */}
        {effectCards.length > 0 && (
          <div className="avatar-effects-overlay">
            {effectCards.map((card, index) => (
              <EffectTag key={`${card.id}-${index}`} card={card} />
            ))}
          </div>
        )}
        {/* Player name overlay in bottom right */}
        <div className="avatar-name">
          <h3>{displayName}</h3>
        </div>
      </Frame>
    </div>
  )
}
