/**
 * Impression system — computed scores (0-100) representing how an NPC
 * perceives the player. Calculated on demand from player stats, clothing,
 * cards, NPC relationship state, etc.
 *
 * Impressions are NOT stored — they're derived each time from current state.
 * This means they shift naturally as the player changes clothes, gains
 * effects, or builds relationships.
 *
 * Each impression type has a calculate function that takes game + npcId
 * and returns a number 0-100.
 */

import type { Game } from './Game'

export type ImpressionName = 'attraction'

type ImpressionCalculator = (game: Game, npcId: string) => number

const impressions = new Map<ImpressionName, ImpressionCalculator>()

/** Register an impression calculator. */
export function registerImpression(name: ImpressionName, calc: ImpressionCalculator): void {
  impressions.set(name, calc)
}

/** Calculate an impression score (0-100) for an NPC. Returns 0 if unknown. */
export function calcImpression(game: Game, name: ImpressionName, npcId: string): number {
  const calc = impressions.get(name)
  if (!calc) return 0
  return Math.max(0, Math.min(100, Math.round(calc(game, npcId))))
}

// ── Impression definitions ────────────────────────────────────────────────

registerImpression('attraction', (game: Game, _npcId: string) => {
  // Stub: base attraction from Charm. Will be modified by clothing,
  // exposure, cards, NPC preferences, etc.
  const charm = game.player.stats.get('Charm') ?? 0
  return charm
})
