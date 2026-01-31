import { Game } from '../model/Game'
import type { CardDefinition, Reminder } from '../model/Card'
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
        game.removeCard(card.id)
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
  hungerLevel: 50,
  subsumedBy: ['hungry', 'starving'],
  onAdded: (_game: Game) => {
    /* Not important enough to notify the player */
  },
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
  hungerLevel: 100,
  replaces: ['peckish'],
  subsumedBy: ['starving'],
  onAdded: (game: Game) => {
    if (!game.player.sleeping) {
      game.add({ type: 'text', text: 'Your stomach growls insistently. You really need to eat something.', color: '#f97316' })
    }
  },
  calcStats: (player: Player, _card: Card, _stats: Map<StatName, number>) => {
    player.modifyStat('Perception', -5)
    player.modifyStat('Wits', -5)
    player.modifyStat('Charm', -5)
    player.modifyStat('Willpower', -10)
  },
  onTime: (game: Game, _card: Card, seconds: number) => {
    // Chance-based escalation to Starving: 0.2% per minute
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.002, minutes)
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
  hungerLevel: 150,
  replaces: ['peckish', 'hungry'],
  onAdded: (game: Game) => {
    if (game.player.sleeping) {
      // Starving wakes the player - it's a danger condition
      game.add({ type: 'text', text: 'You have a gnawing ache in your stomach. Your body is demanding food.', color: '#ef4444' })
      game.addOption('endScene', 'Get up')
    } else {
      game.add({ type: 'text', text: 'You feel faint with hunger. Your hands are trembling and your vision swims.', color: '#ef4444' })
    }
  },
  calcStats: (player: Player, _card: Card, _stats: Map<StatName, number>) => {
    player.modifyStat('Strength', -10)
    player.modifyStat('Agility', -10)
    player.modifyStat('Perception', -20)
    player.modifyStat('Wits', -20)
    player.modifyStat('Charm', -20)
    player.modifyStat('Willpower', -20)
  },
  reminders: (_game: Game, card: Card): Reminder[] => {
    return [{ text: 'You really need food!', urgency: 'urgent', cardId: card.id, detail: 'Starvation is sapping your strength, agility, and concentration.' }]
  },
  onTime: (_game: Game, _card: Card, _seconds: number) => {
    // TODO: Add negative effect chains (e.g. health loss, fainting)
  },
}

export const freshEffect: CardDefinition = {
  name: 'Fresh',
  description: 'You feel clean and refreshed after a good wash. Your confidence is lifted.',
  type: 'Effect',
  color: '#38bdf8', // Sky blue
  onAdded: (game: Game, card: Card) => {
    card.addedAt = game.time
    game.add({ type: 'text', text: 'You feel wonderfully fresh and clean.', color: '#38bdf8' })
  },
  calcStats: (player: Player, _card: Card, _stats: Map<StatName, number>) => {
    player.modifyStat('Mood', 10)
    player.modifyStat('Charm', 5)
  },
  onTime: (game: Game, card: Card, seconds: number) => {
    // Grace period of 30 minutes after last wash, then 1% chance per minute of wearing off
    const lastWash = game.player.getTimer('lastWash')
    const addedAt = (card.addedAt as number) ?? 0
    const elapsed = game.time - Math.max(lastWash, addedAt)
    const gracePeriod = 30 * 60 // 30 minutes in seconds
    if (elapsed <= gracePeriod) return

    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.01, minutes)
      if (Math.random() > chanceNone) {
        game.removeCard(card.id)
      }
    }
  },
}

export const flushedEffect: CardDefinition = {
  name: 'Flushed',
  description: 'Your pulse is racing and your cheeks are warm.',
  type: 'Effect',
  color: '#ec4899', // Pink — matches Arousal meter
  // Removed by accumulateFlushed when arousal drops below threshold
}

/**
 * Apply a kiss. Adds intensity directly to the Arousal meter, capped at 50.
 * Typical values: 2 = peck, 5 = normal kiss, 10 = intense.
 */
export function applyKiss(game: Game, intensity: number, max = 50): void {
  const current = game.player.basestats.get('Arousal') ?? 0
  const capped = Math.min(intensity, max - current)
  if (capped > 0) game.player.addBaseStat('Arousal', capped)
}

// Register the effect definitions
registerCardDefinition('flushed', flushedEffect)
registerCardDefinition('intoxicated', intoxicatedEffect)
registerCardDefinition('sleepy', sleepyEffect)
registerCardDefinition('peckish', peckishEffect)
registerCardDefinition('hungry', hungryEffect)
registerCardDefinition('starving', starvingEffect)
registerCardDefinition('fresh', freshEffect)

// Register scripts
makeScript('timeEffects', (game: Game, params: { seconds?: number }) => {
  const seconds = params.seconds ?? 0
  if (seconds > 0) {
    timeEffects(game, seconds)
  }
})

makeScript('kiss', (game: Game, params: { intensity?: number; max?: number }) => {
  applyKiss(game, params.intensity ?? 5, params.max ?? 50)
})

makeScript('eatFood', (game: Game, params: { quantity?: number }) => {
  eatFood(game, params.quantity ?? 100)
})

/**
 * Run standard time-based effect processing. Called from timeLapse.
 * This is the general entry point for systems that accumulate over time.
 */
export function timeEffects(game: Game, seconds: number): void {
  accumulateHunger(game, seconds)
  decayArousal(game, seconds)
  accumulateFlushed(game)
  // Future: accumulateFatigue, etc.
}

/** Decay arousal naturally over time — approximately 1 per minute. */
function decayArousal(game: Game, seconds: number): void {
  const arousal = game.player.basestats.get('Arousal') ?? 0
  if (arousal <= 0) return
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) {
    game.player.addBaseStat('Arousal', -minutes)
  }
}

/** Add 'Flushed' effect when arousal is high, remove when it drops. */
function accumulateFlushed(game: Game): void {
  const arousal = game.player.basestats.get('Arousal') ?? 0
  const hasFlushed = game.player.hasCard('flushed')
  if (arousal >= 20 && !hasFlushed) {
    game.addEffect('flushed')
  } else if (arousal < 10 && hasFlushed) {
    game.removeCard('flushed', true)
  }
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
  if (game.player.hasCard('peckish') || game.player.hasCard('hungry') || game.player.hasCard('starving')) {
    return
  }

  const lastEat = game.player.getTimer('lastEat')
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

/** Hunger card IDs in descending severity order, with the downgrade target for each. */
const HUNGER_CHAIN: { id: string; downgrade?: string }[] = [
  { id: 'starving', downgrade: 'hungry' },
  { id: 'hungry', downgrade: 'peckish' },
  { id: 'peckish' },
]

/**
 * Remove hunger based on food quantity. Each 50 units removes one hunger level
 * (e.g. Starving->Hungry, Hungry->Peckish, Peckish->None).
 * A remainder below 50 has a quantity/50 chance of removing one further level.
 */
export function removeHunger(game: Game, quantity: number): void {
  let remaining = quantity

  for (const { id, downgrade } of HUNGER_CHAIN) {
    if (remaining <= 0) break
    if (!game.player.hasCard(id)) continue

    let remove = false
    if (remaining >= 50) {
      remove = true
      remaining -= 50
    } else {
      remove = Math.random() < remaining / 50
      remaining = 0
    }

    if (remove) {
      game.removeCard(id, true)
      if (downgrade) {
        // Silently add the downgraded effect — no "you are starting to feel peckish" after a meal
        game.addEffect(downgrade, {}, true)
      }
    }
  }
}

/** Common logic for washing (shower, bath, etc.). Records the timer and applies the Fresh effect. */
export function takeWash(game: Game): void {
  game.player.setTimer('lastWash', game.time)
  game.addEffect('fresh')
}

/** Freshen up at a basin or sink. Resets the wash timer but does not grant Fresh (that requires a full wash). */
export function freshenUp(game: Game): void {
  game.add('You freshen up as best you can.')
  game.removeCard('sweaty', true)
  game.player.setTimer('lastWash', game.time)
  game.run('wait', { minutes: 5 })
}

/**
 * Eat food. Records the lastEat timer, removes hunger effects based on quantity.
 * Typical quantities: 20 = small snack, 50 = large snack, 100 = full meal, 200 = huge meal.
 */
export function eatFood(game: Game, quantity: number): void {
  game.player.setTimer('lastEat', game.time)
  removeHunger(game, quantity)
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

/** Base energy restored per minute of relaxation */
const RELAX_ENERGY = 0.2

/**
 * Apply relaxation energy gain.
 * @param game - The game instance
 * @param minutes - Duration of relaxation in minutes
 * @param quality - Quality modifier (higher = more restorative)
 */
export function applyRelaxation(game: Game, minutes: number, quality: number): void {
  const energyGain = minutes * quality * RELAX_ENERGY
  const actualGain = game.player.addBaseStat('Energy', energyGain)

  if (actualGain > 0) {
    game.add({ type: 'text', text: `+${Math.round(actualGain)} Energy`, color: '#10b981' })
  }
}
