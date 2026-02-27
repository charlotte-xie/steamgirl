/**
 * Intimacy.ts - Shared functions and scripts for NPC intimacy scenes.
 */

import { Game } from '../../model/Game'
import type { CardDefinition } from '../../model/Card'
import type { Card } from '../../model/Card'
import { registerCardDefinition } from '../../model/Card'
import { makeScript } from '../../model/Scripts'

// ============================================================================
// INSEMINATED EFFECT — applied after making love, lasts 12 hours
// ============================================================================

const INSEMINATED_DURATION = 12 * 60 * 60 // 12 hours in seconds

const inseminatedEffect: CardDefinition = {
  name: 'Inseminated',
  description: 'You can still feel him inside you.',
  type: 'Effect',
  colour: '#f472b6', // Pink
  onTime: (game: Game, card: Card) => {
    const expiresAt = card.num('expiresAt')
    if (expiresAt && game.time >= expiresAt) {
      game.removeCard(card.id)
    }
  },
}

registerCardDefinition('inseminated', inseminatedEffect)

// ============================================================================
// OVULATING EFFECT — starts on day 14 of each month, lasts 3 days
// ============================================================================

const ovulatingEffect: CardDefinition = {
  name: 'Ovulating',
  description: 'Your body is at its most fertile.',
  type: 'Effect',
  colour: '#f9a8d4', // Light pink
  onTime: (game: Game, card: Card, seconds: number) => {
    const expiresAt = card.num('expiresAt')
    if (expiresAt && game.time >= expiresAt) {
      game.removeCard(card.id)
      return
    }
    // ~3% chance per hour of becoming pregnant if also inseminated
    // Checked every 15-minute boundary (~0.75% per check)
    const inseminated = game.player.cards.find(c => c.id === 'inseminated')
    if (inseminated && seconds > 0) {
      const ticks = game.calcTicks(seconds, 15 * 60)
      if (ticks > 0) {
        const chanceNone = Math.pow(1 - 0.0075, ticks)
        if (Math.random() > chanceNone) {
          makePregnant(game, (inseminated as Record<string, unknown>).npc as string)
        }
      }
    }
  },
}

registerCardDefinition('ovulating', ovulatingEffect)

// ============================================================================
// PREGNANT EFFECT — replaces Ovulating
// ============================================================================

const pregnantEffect: CardDefinition = {
  name: 'Pregnant',
  description: 'You are carrying a child.',
  type: 'Effect',
  colour: '#f472b6', // Pink
  replaces: ['ovulating'],
  // Instance carries `father` — the NPC id from the Inseminated effect
}

registerCardDefinition('pregnant', pregnantEffect)

/** Make the player pregnant by the given NPC. */
export function makePregnant(game: Game, father: string): void {
  game.addEffect('pregnant', { father })
}

makeScript('makePregnant', (game: Game, params: Record<string, unknown>) => {
  makePregnant(game, params.father as string)
})

/**
 * Standard mechanical effects after intimacy with an NPC.
 * - Increments the NPC's `madeLove` stat
 * - Records `lastIntimacy` time on both the NPC and the player
 * - Caps player Arousal at 30
 *
 * NPC-specific effects (affection gains etc.) should be applied
 * separately by the NPC's own scripts.
 */
export function madeLove(game: Game, npcId?: string): void {
  const npc = npcId ? game.getNPC(npcId) : game.scene.npc ? game.npc : undefined
  if (!npc) return

  // Increment NPC madeLove counter
  npc.stats.set('madeLove', (npc.stats.get('madeLove') ?? 0) + 1)

  // Record time of intimacy on NPC and player
  npc.stats.set('lastIntimacy', game.time)
  game.player.setTimer('lastIntimacy', game.time)

  // Cap arousal at 30
  const arousal = game.player.basestats.get('Arousal') ?? 0
  if (arousal > 30) {
    game.player.basestats.set('Arousal', 30)
  }

  // Apply inseminated effect (12 hours, tracks which NPC)
  // Remove existing first so fresh timer and NPC are applied
  if (game.player.hasCard('inseminated')) {
    game.removeCard('inseminated', true)
  }
  game.addEffect('inseminated', {
    npc: npc.id,
    expiresAt: game.time + INSEMINATED_DURATION,
  }, true)

  // Visual feedback
  game.scene.content.push({ type: 'icon', text: '♥', color: '#e8457a', size: '4rem' })
}

makeScript('madeLove', (game: Game, params: { npc?: string }) => {
  madeLove(game, params.npc)
})

const INTIMACY_COOLDOWN = 6 * 60 * 60 // 6 hours in seconds

/**
 * Check if an NPC wants intimacy (lastIntimacy was more than 6 hours ago, or never).
 * Returns true if the NPC is ready for intimacy again.
 */
makeScript('wantsIntimacy', (game: Game, params: { npc?: string }): boolean => {
  const npc = params.npc ? game.getNPC(params.npc) : game.scene.npc ? game.npc : undefined
  if (!npc) return false
  const last = npc.stats.get('lastIntimacy')
  if (last === undefined) return true
  return (game.time - last) >= INTIMACY_COOLDOWN
})
