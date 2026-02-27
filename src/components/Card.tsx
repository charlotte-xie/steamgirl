import { Card as CardModel } from '../model/Card'
import { assetUrl } from '../utils/assetUrl'
import { COLOURS } from '../model/Format'

type CardProps = {
  card: CardModel
}

export function Card({ card }: CardProps) {
  const cardDef = card.template

  const name = cardDef.displayName?.(card) ?? cardDef.name
  const description = cardDef.displayDescription?.(card) ?? cardDef.description

  // Determine card status
  let status: string | null = null
  let statusColor: string | undefined = undefined
  if (cardDef.type === 'Quest' || cardDef.type === 'Date') {
    if (card.completed === true) {
      status = 'Completed'
      statusColor = COLOURS.positive
    } else if (card.failed === true) {
      status = 'Failed'
      statusColor = COLOURS.negative
    } else {
      status = cardDef.type === 'Date' ? 'Pending' : 'Ongoing'
      statusColor = cardDef.type === 'Date' ? COLOURS.romantic : COLOURS.discovery
    }
  }

  // Get effect color for title (matches EffectTag overlay color)
  const effectColor = cardDef.type === 'Effect' ? cardDef.colour : undefined

  return (
    <div className="card-component">
      {cardDef.image && (
        <div className="card-image">
          <img src={assetUrl(cardDef.image)} alt={name} />
        </div>
      )}
      <div className="card-content">
        <h4 className="card-title" style={effectColor ? { color: effectColor } : undefined}>{name}</h4>
        {description && (
          <p className="card-description">{description}</p>
        )}
        {status && (
          <div className="card-status" style={{ color: statusColor }}>
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
