import { Game } from '../model/Game'
import type { CardDefinition } from '../model/Card'
import type { Card } from '../model/Card'
import { registerCardDefinition } from '../model/Card'

export const intoxicatedEffect: CardDefinition = {
  name: 'Intoxicated',
  description: 'You feel lightheaded and giddy from the wine.',
  type: 'Effect',
  color: '#9333ea', // Purple
  onTime: (game: Game, card: Card, minutes: number) => {
    // Reduce alcohol by 10 for every 15 minutes that pass
    const reduction = Math.floor(minutes / 15) * 10
    if (reduction > 0) {
      const currentAlcohol = (card.alcohol as number) || 0
      const newAlcohol = Math.max(0, currentAlcohol - reduction)
      card.alcohol = newAlcohol
      
      if (newAlcohol <= 0) {
        // Remove the effect
        const index = game.player.cards.findIndex(c => c.id === card.id && c.type === 'Effect')
        if (index !== -1) {
          game.player.cards.splice(index, 1)
          game.add({ type: 'text', text: 'You are no longer intoxicated' })
        }
      }
    }
  },
}

export const sleepyEffect: CardDefinition = {
  name: 'Sleepy',
  description: 'You feel tired and drowsy.',
  type: 'Effect',
  color: '#3b82f6', // Blue
}

// Register the effect definitions
registerCardDefinition('intoxicated', intoxicatedEffect)
registerCardDefinition('sleepy', sleepyEffect)
