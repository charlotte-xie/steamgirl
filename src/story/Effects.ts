import { Game } from '../model/Game'
import type { CardDefinition } from '../model/Card'
import type { Card } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { makeScript } from '../model/Scripts'
import type { StatName } from '../model/Stats'
import type { Player } from '../model/Player'

export const intoxicatedEffect: CardDefinition = {
  name: 'Intoxicated',
  description: 'You feel lightheaded and giddy from the wine.',
  type: 'Effect',
  color: '#9333ea', // Purple
  onTime: (game: Game, card: Card, seconds: number) => {
    // Calculate the number of 15-minute (900 second) boundaries crossed
    const ticks = game.calcTicks(seconds, 900)
    // Reduce alcohol by 10 for each boundary crossed
    const reduction = ticks * 10
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
          // Recalculate stats after removing the effect
          game.run('calcStats', {})
        }
      } else {
        // Recalculate stats when alcohol changes (in case we want dynamic modifiers)
        game.run('calcStats', {})
      }
    }
  },
  calcStats: (player: Player, card: Card, _stats: Map<StatName, number>) => {
    const alcohol = (card.alcohol as number) || 0
    
    // Give +5 Charm bonus if alcohol is low (< 100)
    if (alcohol < 100) {
      player.modifyStat('Charm', 5)
    }
    
    // Apply penalties based on alcohol level
    // Base penalty to Agility (scales with alcohol)
    const agilityPenalty = Math.floor(alcohol / 10) // -1 per 10 alcohol, up to -10 at 100
    if (agilityPenalty > 0) {
      player.modifyStat('Agility', -agilityPenalty)
    }
    
    // Perception penalty starts at alcohol >= 30
    if (alcohol >= 30) {
      const perceptionPenalty = Math.floor((alcohol - 30) / 15) + 1 // -1 at 30, -2 at 45, etc.
      player.modifyStat('Perception', -perceptionPenalty)
    }
    
    // Wits penalty starts at alcohol >= 60
    if (alcohol >= 60) {
      const witsPenalty = Math.floor((alcohol - 60) / 20) + 1 // -1 at 60, -2 at 80, etc.
      player.modifyStat('Wits', -witsPenalty)
    }
    
    // Charm penalty starts at alcohol >= 100 (overrides the bonus)
    if (alcohol >= 100) {
      const charmPenalty = Math.floor((alcohol - 100) / 25) + 1 // -1 at 100, -2 at 125, etc.
      player.modifyStat('Charm', -charmPenalty)
    }
  },
}

export const sleepyEffect: CardDefinition = {
  name: 'Sleepy',
  description: 'You feel tired and drowsy.',
  type: 'Effect',
  color: '#3b82f6', // Blue
}

// --- Hunger effects (escalating severity) ---

export const peckishEffect: CardDefinition = {
  name: 'Peckish',
  description: 'Your stomach grumbles. You could do with something to eat.',
  type: 'Effect',
  color: '#f59e0b', // Amber
  subsumedBy: ['hungry', 'starving'],
  calcStats: (player: Player, _card: Card, _stats: Map<StatName, number>) => {
    player.modifyStat('Willpower', -5)
  },
  onTime: (game: Game, _card: Card, seconds: number) => {
    // Chance-based escalation to Hungry: 0.3% per minute
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.003, minutes)
      if (Math.random() > chanceNone) {
        game.addEffect('hungry')
      }
    }
  },
}

export const hungryEffect: CardDefinition = {
  name: 'Hungry',
  description: 'You are properly hungry now. It is hard to concentrate.',
  type: 'Effect',
  color: '#f97316', // Orange
  replaces: ['peckish'],
  subsumedBy: ['starving'],
  calcStats: (player: Player, _card: Card, _stats: Map<StatName, number>) => {
    player.modifyStat('Perception', -5)
    player.modifyStat('Wits', -5)
    player.modifyStat('Charm', -5)
    player.modifyStat('Willpower', -10)
  },
  onTime: (game: Game, _card: Card, seconds: number) => {
    // Chance-based escalation to Starving: 0.3% per minute
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.003, minutes)
      if (Math.random() > chanceNone) {
        game.addEffect('starving')
      }
    }
  },
}

export const starvingEffect: CardDefinition = {
  name: 'Starving',
  description: 'You are weak with hunger. Everything is a struggle.',
  type: 'Effect',
  color: '#ef4444', // Red
  replaces: ['peckish', 'hungry'],
  calcStats: (player: Player, _card: Card, _stats: Map<StatName, number>) => {
    player.modifyStat('Strength', -10)
    player.modifyStat('Agility', -10)
    player.modifyStat('Perception', -20)
    player.modifyStat('Wits', -20)
    player.modifyStat('Charm', -20)
    player.modifyStat('Willpower', -20)
  },
  onTime: (_game: Game, _card: Card, _seconds: number) => {
    // TODO: Add negative effect chains (e.g. health loss, fainting)
  },
}

// Register the effect definitions
registerCardDefinition('intoxicated', intoxicatedEffect)
registerCardDefinition('sleepy', sleepyEffect)
registerCardDefinition('peckish', peckishEffect)
registerCardDefinition('hungry', hungryEffect)
registerCardDefinition('starving', starvingEffect)

// Register the timeEffects script so timeLapse can call it
makeScript('timeEffects', (game: Game, params: { seconds?: number }) => {
  const seconds = params.seconds ?? 0
  if (seconds > 0) {
    timeEffects(game, seconds)
  }
})

/**
 * Run standard time-based effect processing. Called from timeLapse.
 * This is the general entry point for systems that accumulate over time.
 */
export function timeEffects(game: Game, seconds: number): void {
  accumulateHunger(game, seconds)
  // Future: accumulateFatigue, etc.
}

/**
 * Accumulate hunger over time. Checks minutes since last eaten:
 * - First 240 minutes (4 hours) are a grace period with no effects.
 * - After that, each minute has a 0.3% chance of adding Peckish.
 * The chance is calculated over the elapsed seconds in this tick,
 * but only counting minutes that fall after the 240-minute grace.
 */
export function accumulateHunger(game: Game, seconds: number): void {
  // Skip if player already has any hunger effect
  if (game.player.cards.some(c => c.id === 'peckish' || c.id === 'hungry' || c.id === 'starving')) {
    return
  }

  const lastEat = game.player.timers.get('lastEat')
  if (lastEat === undefined) return // No record of eating — skip (init should set this)

  const gracePeriod = 240 * 60 // 240 minutes in seconds
  const timeSinceEat = game.time - lastEat

  // Not past grace period yet
  if (timeSinceEat <= gracePeriod) return

  // Calculate how many of this tick's seconds fall after the grace period
  const timeBeforeTick = timeSinceEat - seconds
  const effectiveStart = Math.max(0, timeBeforeTick - gracePeriod)
  const effectiveEnd = timeSinceEat - gracePeriod
  const effectiveSeconds = effectiveEnd - effectiveStart
  const effectiveMinutes = Math.floor(effectiveSeconds / 60)

  if (effectiveMinutes > 0) {
    const chanceNone = Math.pow(1 - 0.003, effectiveMinutes)
    if (Math.random() > chanceNone) {
      game.addEffect('peckish')
    }
  }
}

/**
 * Consume alcohol script - adds alcohol amount to the player's intoxicated effect.
 * Adds the intoxicated effect if the player doesn't have it.
 * Adds to existing alcohol value if the player already has the effect.
 */
export function consumeAlcohol(game: Game, amount: number): void {
  // Find existing intoxicated effect
  const intoxicatedCard = game.player.cards.find(card => card.id === 'intoxicated' && card.type === 'Effect')
  
  if (intoxicatedCard) {
    // Add to existing alcohol value
    const currentAlcohol = (intoxicatedCard.alcohol as number) || 0
    intoxicatedCard.alcohol = currentAlcohol + amount
  } else {
    // Add new intoxicated effect with the alcohol amount
    game.addEffect('intoxicated', { alcohol: amount })
  }
}
