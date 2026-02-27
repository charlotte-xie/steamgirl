import { Card } from '../model/Card'

interface EffectTagProps {
  card: Card
}

export function EffectTag({ card }: EffectTagProps) {
  if (!card || card.type !== 'Effect') {
    return null
  }

  const cardDef = card.template
  const color = cardDef.colour ?? '#ffffff'

  return (
    <div 
      className="effect-tag"
      style={{ color }}
      title={cardDef.description || cardDef.name}
    >
      {cardDef.name}
    </div>
  )
}
