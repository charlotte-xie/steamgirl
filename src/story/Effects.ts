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
    // Base penalty to Dexterity (scales with alcohol)
    const agilityPenalty = Math.floor(alcohol / 10) // -1 per 10 alcohol, up to -10 at 100
    if (agilityPenalty > 0) {
      player.modifyStat('Dexterity', -agilityPenalty)
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
    player.modifyStat('Dexterity', -10)
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
    player.modifyStat('appearance', 5)
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

export const makeupEffect: CardDefinition = {
  name: 'Made Up',
  description: 'Your makeup enhances your appearance.',
  type: 'Effect',
  color: '#f472b6', // Pink
  // quality: 0 = poor, 1 = passable, 2 = good, 3 = flawless
  onAdded: (game: Game, card: Card) => {
    card.addedAt = game.time
  },
  calcStats: (player: Player, card: Card) => {
    const quality = (card.quality as number) ?? 1
    const bonus = [2, 5, 10, 15][quality] ?? 5
    player.modifyStat('appearance', bonus)
    if (quality >= 3) player.modifyStat('Charm', 3)
  },
  onTime: (game: Game, card: Card) => {
    const addedAt = (card.addedAt as number) ?? 0
    const elapsed = game.time - addedAt
    if (elapsed >= 3 * 60 * 60) { // 3 hours
      game.removeCard(card.id)
      game.add({ type: 'text', text: 'Your makeup is starting to look a little tired.', color: '#f472b6' })
    }
  },
}

// --- Sweaty effect ---

export const sweatyEffect: CardDefinition = {
  name: 'Sweaty',
  description: 'You are flushed and damp with perspiration. Not a good look.',
  type: 'Effect',
  color: '#ea580c', // Orange-red
  calcStats: (player: Player) => {
    player.modifyStat('Charm', -5)
    player.modifyStat('appearance', -10)
    player.modifyStat('Composure', -5)
  },
  onTime: (game: Game, card: Card, seconds: number) => {
    // Sweaty wears off after ~45 minutes (grace 20 min, then 2% per minute)
    const addedAt = (card.addedAt as number) ?? 0
    const elapsed = game.time - addedAt
    if (elapsed < 20 * 60) return
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.02, minutes)
      if (Math.random() > chanceNone) {
        game.removeCard(card.id)
        // Being sweaty too long can make you grubby
        riskDirty(game, 0.5)
      }
    }
  },
  onAdded: (game: Game, card: Card) => {
    card.addedAt = game.time
    game.add({ type: 'text', text: 'You are perspiring noticeably.', color: '#ea580c' })
  },
}

// --- Tired effects (escalating: Tired → Exhausted) ---

export const tiredEffect: CardDefinition = {
  name: 'Tired',
  description: 'Weariness is catching up with you. Everything takes a little more effort.',
  type: 'Effect',
  color: '#6366f1', // Indigo
  subsumedBy: ['exhausted'],
  calcStats: (player: Player) => {
    player.modifyStat('Wits', -5)
    player.modifyStat('Perception', -5)
    player.modifyStat('Dexterity', -3)
    player.modifyStat('Mood', -5)
  },
  reminders: (_game: Game, card: Card): Reminder[] => {
    return [{ text: 'You could do with some rest.', urgency: 'info', cardId: card.id }]
  },
  onTime: (game: Game, _card: Card, seconds: number) => {
    // Escalate to Exhausted: 0.2% per minute
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.002, minutes)
      if (Math.random() > chanceNone) {
        game.addEffect('exhausted')
      }
    }
  },
}

export const exhaustedEffect: CardDefinition = {
  name: 'Exhausted',
  description: 'You can barely keep your eyes open. Your body is screaming for rest.',
  type: 'Effect',
  color: '#4338ca', // Darker indigo
  replaces: ['tired'],
  calcStats: (player: Player) => {
    player.modifyStat('Wits', -15)
    player.modifyStat('Perception', -15)
    player.modifyStat('Dexterity', -10)
    player.modifyStat('Strength', -10)
    player.modifyStat('Charm', -10)
    player.modifyStat('Mood', -15)
    player.modifyStat('Willpower', -10)
  },
  onAdded: (game: Game) => {
    if (!game.player.sleeping) {
      game.add({ type: 'text', text: 'You are utterly spent. You need to sleep.', color: '#4338ca' })
    }
  },
  reminders: (_game: Game, card: Card): Reminder[] => {
    return [{ text: 'You desperately need sleep!', urgency: 'urgent', cardId: card.id, detail: 'Exhaustion is crippling your abilities.' }]
  },
}

// --- Dizzy effect ---

export const dizzyEffect: CardDefinition = {
  name: 'Dizzy',
  description: 'The world tilts and sways around you. Concentration is difficult.',
  type: 'Effect',
  color: '#a855f7', // Purple
  calcStats: (player: Player) => {
    player.modifyStat('Dexterity', -10)
    player.modifyStat('Perception', -10)
    player.modifyStat('Wits', -5)
    player.modifyStat('Composure', -10)
  },
  onAdded: (game: Game, card: Card) => {
    card.addedAt = game.time
    game.add({ type: 'text', text: 'Your head swims and the room lurches sideways.', color: '#a855f7' })
  },
  onTime: (game: Game, card: Card, seconds: number) => {
    // Dizzy clears after ~20 minutes (grace 10 min, then 5% per minute)
    const addedAt = (card.addedAt as number) ?? 0
    const elapsed = game.time - addedAt
    if (elapsed < 10 * 60) return
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.05, minutes)
      if (Math.random() > chanceNone) {
        game.removeCard(card.id)
      }
    }
  },
}

// --- High effects (from spice — escalating: Euphoric → Spaced Out → Comedown) ---

export const euphoricEffect: CardDefinition = {
  name: 'Euphoric',
  description: 'A warm golden haze suffuses everything. The world is beautiful and nothing hurts.',
  type: 'Effect',
  color: '#f59e0b', // Amber/gold
  subsumedBy: ['spaced-out'],
  calcStats: (player: Player) => {
    player.modifyStat('Charm', 5)
    player.modifyStat('Mood', 20)
    player.modifyStat('Pain', -20)
    player.modifyStat('Stress', -15)
    player.modifyStat('Wits', -5)
    player.modifyStat('Willpower', -10)
    player.modifyStat('Perception', -5)
  },
  onAdded: (game: Game, card: Card) => {
    card.addedAt = game.time
    game.add({ type: 'text', text: 'A blissful warmth spreads through you. Everything feels wonderful.', color: '#f59e0b' })
  },
  onTime: (game: Game, card: Card, seconds: number) => {
    const addedAt = (card.addedAt as number) ?? 0
    const elapsed = game.time - addedAt
    // After 30 minutes, chance to escalate to Spaced Out (0.5% per minute)
    if (elapsed >= 30 * 60) {
      const minutes = Math.floor(seconds / 60)
      if (minutes > 0) {
        const chanceNone = Math.pow(1 - 0.005, minutes)
        if (Math.random() > chanceNone) {
          game.addEffect('spaced-out')
          return
        }
      }
    }
    // After 60 minutes, transition to Comedown
    if (elapsed >= 60 * 60) {
      game.removeCard(card.id, true)
      game.addEffect('comedown')
    }
  },
}

export const spacedOutEffect: CardDefinition = {
  name: 'Spaced Out',
  description: 'You have taken too much. Reality is distant and unreliable.',
  type: 'Effect',
  color: '#d97706', // Darker amber
  replaces: ['euphoric'],
  calcStats: (player: Player) => {
    player.modifyStat('Wits', -20)
    player.modifyStat('Perception', -20)
    player.modifyStat('Dexterity', -10)
    player.modifyStat('Willpower', -15)
    player.modifyStat('Charm', -10)
    player.modifyStat('Pain', -30)
    player.modifyStat('Mood', 10)
  },
  onAdded: (game: Game, card: Card) => {
    card.addedAt = game.time
    game.add({ type: 'text', text: 'The edges of the world blur and recede. You are floating.', color: '#d97706' })
  },
  reminders: (_game: Game, card: Card): Reminder[] => {
    return [{ text: 'You are heavily intoxicated on spice.', urgency: 'warning', cardId: card.id }]
  },
  onTime: (game: Game, card: Card) => {
    // Transitions to Comedown after 45 minutes
    const addedAt = (card.addedAt as number) ?? 0
    const elapsed = game.time - addedAt
    if (elapsed >= 45 * 60) {
      game.removeCard(card.id, true)
      game.addEffect('comedown')
    }
  },
}

export const comedownEffect: CardDefinition = {
  name: 'Comedown',
  description: 'The high has faded, leaving a hollow ache. Everything feels flat and grey.',
  type: 'Effect',
  color: '#78716c', // Stone grey
  replaces: ['euphoric', 'spaced-out'],
  calcStats: (player: Player) => {
    player.modifyStat('Mood', -20)
    player.modifyStat('Willpower', -10)
    player.modifyStat('Charm', -5)
    player.modifyStat('Energy', -10)
  },
  onAdded: (game: Game, card: Card) => {
    card.addedAt = game.time
    game.add({ type: 'text', text: 'The warmth drains away, leaving you feeling hollow and spent.', color: '#78716c' })
  },
  reminders: (_game: Game, card: Card): Reminder[] => {
    return [{ text: 'You are coming down from spice.', urgency: 'info', cardId: card.id }]
  },
  onTime: (game: Game, card: Card, seconds: number) => {
    // Comedown clears after ~90 minutes (grace 30 min, then 1% per minute)
    const addedAt = (card.addedAt as number) ?? 0
    const elapsed = game.time - addedAt
    if (elapsed < 30 * 60) return
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.01, minutes)
      if (Math.random() > chanceNone) {
        game.removeCard(card.id)
      }
    }
  },
}

// --- Dirty effects (escalating: Grubby → Filthy) ---

export const grubbyEffect: CardDefinition = {
  name: 'Grubby',
  description: 'You are looking a bit unkempt and could do with a wash.',
  type: 'Effect',
  color: '#a8a29e', // Warm grey
  subsumedBy: ['filthy'],
  replaces: ['fresh'],
  calcStats: (player: Player) => {
    player.modifyStat('appearance', -5)
    player.modifyStat('Charm', -3)
  },
  onTime: (game: Game, _card: Card, seconds: number) => {
    // Escalate to Filthy: 0.2% per minute
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      const chanceNone = Math.pow(1 - 0.002, minutes)
      if (Math.random() > chanceNone) {
        game.addEffect('filthy')
      }
    }
  },
}

export const filthyEffect: CardDefinition = {
  name: 'Filthy',
  description: 'You are visibly dirty. People wrinkle their noses as you pass.',
  type: 'Effect',
  color: '#78716c', // Stone
  replaces: ['grubby', 'fresh'],
  calcStats: (player: Player) => {
    player.modifyStat('appearance', -15)
    player.modifyStat('Charm', -10)
    player.modifyStat('Mood', -5)
    player.modifyStat('decency', -5)
  },
  onAdded: (game: Game) => {
    game.add({ type: 'text', text: 'You are really quite grubby now. A wash is in order.', color: '#78716c' })
  },
  reminders: (_game: Game, card: Card): Reminder[] => {
    return [{ text: 'You need a wash!', urgency: 'warning', cardId: card.id, detail: 'Your appearance and charm are suffering.' }]
  },
}

// Register the effect definitions
registerCardDefinition('flushed', flushedEffect)
registerCardDefinition('intoxicated', intoxicatedEffect)
registerCardDefinition('sleepy', sleepyEffect)
registerCardDefinition('peckish', peckishEffect)
registerCardDefinition('hungry', hungryEffect)
registerCardDefinition('starving', starvingEffect)
registerCardDefinition('fresh', freshEffect)
registerCardDefinition('makeup', makeupEffect)
registerCardDefinition('sweaty', sweatyEffect)
registerCardDefinition('tired', tiredEffect)
registerCardDefinition('exhausted', exhaustedEffect)
registerCardDefinition('dizzy', dizzyEffect)
registerCardDefinition('euphoric', euphoricEffect)
registerCardDefinition('spaced-out', spacedOutEffect)
registerCardDefinition('comedown', comedownEffect)
registerCardDefinition('grubby', grubbyEffect)
registerCardDefinition('filthy', filthyEffect)

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

makeScript('riskDirty', (game: Game, params: { chance?: number }) => {
  riskDirty(game, params.chance ?? 0.3)
})

/**
 * Run standard time-based effect processing. Called from timeLapse.
 * This is the general entry point for systems that accumulate over time.
 */
export function timeEffects(game: Game, seconds: number): void {
  accumulateHunger(game, seconds)
  accumulateTiredness(game)
  decayArousal(game, seconds)
  accumulateFlushed(game)
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

/**
 * Accumulate tiredness based on Energy meter.
 * Tired appears when Energy drops below 20; Exhausted escalation is handled by the card's onTime.
 * Both are removed when Energy rises above 30 (e.g. after sleeping).
 */
function accumulateTiredness(game: Game): void {
  const energy = game.player.stats.get('Energy') ?? 50
  const hasTired = game.player.hasCard('tired')
  const hasExhausted = game.player.hasCard('exhausted')

  if (energy < 20 && !hasTired && !hasExhausted) {
    game.addEffect('tired')
  } else if (energy >= 30 && (hasTired || hasExhausted)) {
    if (hasExhausted) game.removeCard('exhausted', true)
    if (hasTired) game.removeCard('tired', true)
  }
}

/**
 * Risk getting dirty from an event (working in bar, street encounter, etc.).
 * @param chance - probability 0-1 of becoming grubby (default 0.3)
 */
export function riskDirty(game: Game, chance = 0.3): void {
  if (game.player.hasCard('grubby') || game.player.hasCard('filthy')) return
  if (Math.random() < chance) {
    game.removeCard('fresh', true)
    game.addEffect('grubby')
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

/** Common logic for washing (shower, bath, etc.). Records the timer and applies the Fresh effect. Washes off makeup and removes dirtiness. */
export function takeWash(game: Game): void {
  game.player.setTimer('lastWash', game.time)
  game.removeCard('makeup', true)
  game.removeCard('grubby', true)
  game.removeCard('filthy', true)
  game.removeCard('sweaty', true)
  game.addEffect('fresh')
}

/** Freshen up at a basin or sink. Resets the wash timer but does not grant Fresh (that requires a full wash). */
export function freshenUp(game: Game): void {
  game.add('You freshen up as best you can.')
  game.removeCard('sweaty', true)
  game.player.setTimer('lastWash', game.time)
  // Reset makeup timer if wearing makeup
  if (game.player.hasCard('makeup')) {
    game.removeCard('makeup', true)
    game.addEffect('makeup')
    game.add('You touch up your makeup while you\'re at it.')
  }
  game.run('wait', { minutes: 5 })
}

/**
 * Apply makeup. Tests the Makeup skill to determine quality:
 * - Flawless (3): pass at difficulty 40
 * - Good (2): pass at difficulty 20
 * - Passable (1): pass at difficulty 0
 * - Poor (0): fail all checks
 *
 * Each application trains the Makeup skill slightly.
 */
export function applyMakeup(game: Game): void {
  game.removeCard('makeup', true)

  let quality = 0
  if (game.player.skillTest('Makeup', 0)) {
    quality = 1
    if (game.player.skillTest('Makeup', 20)) {
      quality = 2
      if (game.player.skillTest('Makeup', 40)) {
        quality = 3
      }
    }
  }

  game.addEffect('makeup', { quality })

  const messages = [
    'You dab on some makeup, though the result is a little uneven.',
    'You apply your makeup neatly enough.',
    'You apply your makeup with a practised hand. It looks good.',
    'You apply your makeup flawlessly. The effect is striking.',
  ]
  game.add({ type: 'text', text: messages[quality], color: '#f472b6' })

  // Skill gain capped by quality ceiling — routine application stops teaching
  const cap = [20, 30, 40, 50][quality] ?? 30
  game.run('addStat', { stat: 'Makeup', change: 1, max: cap, chance: 0.5, hidden: false })

  game.run('wait', { minutes: 15 })
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
 * Consume alcohol - adds alcohol amount to the player's intoxicated effect.
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

// ── Bath & Shower scenes ─────────────────────────────────────────────────
// Shared scripts used by every bathroom. Flavour text passed as params.

const SOAK_TEXTS = [
  'You close your eyes and let the warmth soak into your muscles.',
  'The steam curls around you as you sink a little deeper.',
  'You rest your head on the rim and let your thoughts drift.',
  'The hot water works its way into every ache and tension.',
]

/** Get dressed from saved outfit after washing. */
makeScript('getDressed', (game: Game) => {
  game.player.wearOutfit('_before-wash')
  game.player.deleteOutfit('_before-wash')
  game.player.calcStats()
  game.add('You dry off and get dressed.')
})

/** Bath menu — options to soak longer or get out. Re-runs itself for the loop. */
makeScript('bathMenu', (game: Game, params: { quality?: number; mood?: number }) => {
  const quality = params.quality ?? 1.0
  const mood = params.mood ?? 0
  game.addOption(['bathSoak', { quality, mood }], 'Soak a while longer')
  game.addOption('getDressed', 'Get out')
})

/** Soak longer in bath — wait (can trigger scenes), relaxation, then re-show menu. */
makeScript('bathSoak', (game: Game, params: { quality?: number; mood?: number }) => {
  const quality = params.quality ?? 1.0
  const mood = params.mood ?? 0
  const text = SOAK_TEXTS[Math.floor(Math.random() * SOAK_TEXTS.length)]
  game.run('wait', { minutes: 15, text })
  if (game.inScene) return // wait was interrupted by an event
  applyRelaxation(game, 15, quality)
  if (mood > 0) game.player.modifyStat('Mood', Math.round(mood / 2))
  game.run('bathMenu', { quality, mood })
})

/** Take a shower. Strips, washes, offers to get dressed. */
makeScript('shower', (game: Game, params: { text?: string }) => {
  game.player.saveOutfit('_before-wash')
  game.player.stripAll()
  game.player.calcStats()
  game.add(params.text ?? 'You undress and step into the shower. Hot water cascades over you, washing away the grime of the day.')
  game.timeLapse(10)
  takeWash(game)
  game.addOption('getDressed', 'Get dressed')
})

/** Take a bath. Strips, washes, offers to soak or get out. */
makeScript('bath', (game: Game, params: { text?: string; quality?: number; mood?: number }) => {
  const quality = params.quality ?? 1.0
  const mood = params.mood ?? 0
  game.player.saveOutfit('_before-wash')
  game.player.stripAll()
  game.player.calcStats()
  game.add(params.text ?? 'You undress and fill the tub with steaming water. Sinking in, you let the warmth envelop you.')
  game.timeLapse(30)
  takeWash(game)
  applyRelaxation(game, 30, quality)
  if (mood > 0) game.player.modifyStat('Mood', mood)
  game.run('bathMenu', { quality, mood })
})