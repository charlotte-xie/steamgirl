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
import type { ClothingPosition } from './Item'
import type { Player } from './Player'

export type ImpressionName = 'attraction' | 'decency'

type ImpressionCalculator = (game: Game, npcId: string) => number

const impressions = new Map<ImpressionName, ImpressionCalculator>()

/** Register an impression calculator. */
export function registerImpression(name: ImpressionName, calc: ImpressionCalculator): void {
  impressions.set(name, calc)
}

/** Get all registered impression names. */
export function getImpressionNames(): ImpressionName[] {
  return Array.from(impressions.keys())
}

/** Calculate the base impression score (0-100) without NPC modifiers. */
export function calcBaseImpression(game: Game, name: ImpressionName): number {
  const calc = impressions.get(name)
  if (!calc) return 0
  return Math.max(0, Math.min(100, Math.round(calc(game, ''))))
}

/** Calculate an impression score (0-100) for an NPC. Returns 0 if unknown. */
export function calcImpression(game: Game, name: ImpressionName, npcId: string): number {
  const calc = impressions.get(name)
  if (!calc) return 0
  let score = calc(game, npcId)

  // Let the NPC modify the score based on their preferences
  const npc = game.npcs.get(npcId)
  if (npc?.template.modifyImpression) {
    score = npc.template.modifyImpression(npc, name, score)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** True if a body position is exposed (nothing at under, inner, or outer layers). */
function isExposed(player: Player, position: ClothingPosition): boolean {
  const layers = ['under', 'inner', 'outer'] as const
  return layers.every(layer => !player.getWornAt(position, layer))
}

// ── Impression definitions ────────────────────────────────────────────────

registerImpression('attraction', (game: Game, _npcId: string) => {
  // Stub: base attraction from Charm. Will be modified by clothing,
  // exposure, cards, NPC preferences, etc.
  const charm = game.player.stats.get('Charm') ?? 0
  return charm
})

registerImpression('decency', (game: Game, _npcId: string) => {
  // 0=shameless, 20=naked, 40=barely acceptable, 60=normal, 80=well dressed, 100=exceptional
  const player = game.player

  // Chest/hips exposed: hard caps (override everything else)
  if (isExposed(player, 'hips')) return 20
  if (isExposed(player, 'chest')) return 30

  let score = 70

  // Minor exposure: neck/arms/legs, -5 each, no lower than 60 (still normal)
  if (isExposed(player, 'neck')) score -= 5
  if (isExposed(player, 'arms')) score -= 5
  if (isExposed(player, 'legs')) score -= 5
  score = Math.max(score, 60)

  // Moderate exposure: belly/feet, -10 each, no lower than 40 (barely acceptable)
  if (isExposed(player, 'belly')) score -= 10
  if (isExposed(player, 'feet')) score -= 10
  score = Math.max(score, 40)

  return score
})
