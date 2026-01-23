import { useGame } from '../context/GameContext'
import { EffectTag } from './EffectTag'
import { assetUrl } from '../utils/assetUrl'

export function AvatarPanel() {
  const { game } = useGame()

  const effectCards = game.player.cards.filter(card => card && card.type === 'Effect') || []

  return (
    <div className="avatar-container" style={{ position: 'relative' }}>
      <div className="avatar-frame">
        <div className="rivet rivet-tl"></div>
        <div className="rivet rivet-tr"></div>
        <div className="rivet rivet-bl"></div>
        <div className="rivet rivet-br"></div>
        <div className="avatar-rivet avatar-rivet-bl"></div>
        <div className="avatar-rivet avatar-rivet-br"></div>
        <div className="avatar-placeholder">
          <img 
            src={assetUrl('/girl/SteamGirl.png')} 
            alt="Player Avatar"
          />
        </div>
      </div>
      {/* Status effect tags overlay - top left */}
      {effectCards.length > 0 && (
        <div className="avatar-effects-overlay">
          {effectCards.map((card, index) => (
            <EffectTag key={`${card.id}-${index}`} card={card} />
          ))}
        </div>
      )}
      {/* Player name overlay in bottom right */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 20,
        color: 'var(--text-main)',
        fontWeight: 500,
        pointerEvents: 'none'
      }}>
        <h3>{game.player.name || 'Unknown'}</h3>
      </div>
    </div>
  )
}
