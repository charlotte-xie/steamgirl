import { Card as CardModel } from '../model/Card'
import { assetUrl } from '../utils/assetUrl'

type CardProps = {
  card: CardModel
}

export function Card({ card }: CardProps) {
  const cardDef = card.template

  // Determine quest status
  let questStatus: string | null = null
  let statusColor: string | undefined = undefined
  if (cardDef.type === 'Quest') {
    if (card.completed === true) {
      questStatus = 'Completed'
      statusColor = '#10b981' // green (same as completed messages)
    } else if (card.failed === true) {
      questStatus = 'Failed'
      statusColor = '#ef4444' // red (same as failed messages)
    } else {
      questStatus = 'Ongoing'
      statusColor = '#3b82f6' // blue (same as quest received)
    }
  }

  // Get effect color for title (matches EffectTag overlay color)
  const effectColor = cardDef.type === 'Effect' ? (cardDef as any).color : undefined

  return (
    <div className="card-component">
      {cardDef.image && (
        <div className="card-image">
          <img src={assetUrl(cardDef.image)} alt={cardDef.name} />
        </div>
      )}
      <div className="card-content">
        <h4 className="card-title" style={effectColor ? { color: effectColor } : undefined}>{cardDef.name}</h4>
        {cardDef.description && (
          <p className="card-description">{cardDef.description}</p>
        )}
        {questStatus && (
          <div className="card-status" style={{ color: statusColor }}>
            {questStatus}
          </div>
        )}
      </div>
    </div>
  )
}
