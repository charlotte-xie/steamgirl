import { Card as CardModel } from '../model/Card'

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

  return (
    <div className="card-component">
      {cardDef.image && (
        <div className="card-image">
          <img src={cardDef.image} alt={cardDef.name} />
        </div>
      )}
      <div className="card-content">
        <h4 className="card-title">{cardDef.name}</h4>
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
