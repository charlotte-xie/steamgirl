import type { CardDefinition } from '../../model/Card'
import { registerCardDefinition } from '../../model/Card'

export const introvertTrait: CardDefinition = {
  name: 'Introvert',
  description: 'Socialising drains your energy, but solitary activities feel more natural.',
  type: 'Trait',
  colour: '#6366f1', // Indigo
  replaces: ['extrovert'],
}

export const extrovertTrait: CardDefinition = {
  name: 'Extrovert',
  description: 'You thrive on social interaction, gaining energy and mood from company.',
  type: 'Trait',
  colour: '#f59e0b', // Amber
  replaces: ['introvert'],
}

registerCardDefinition('introvert', introvertTrait)
registerCardDefinition('extrovert', extrovertTrait)
