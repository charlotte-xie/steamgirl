/**
 * Impression system — computed scores (0-100) representing how others
 * perceive the player. Impressions are unified with the stats system:
 * their base values are computed from player state (clothing, stats),
 * then item/card modifiers are applied via the standard calcStats pipeline.
 *
 * Each impression has a base calculator registered here. The calculators
 * run inside Player.calcStats() to set starting values in the stats map.
 * Items and cards can then modify impressions using player.modifyStat().
 *
 * NPC-specific modifiers are applied on top via impression(). NPCs
 * can potentially have radically different impressions based on their own
 * preferences.
 */

import type { Game } from './Game'
import type { ImpressionName } from './Stats'
import type { ClothingPosition } from './Item'
import type { Player } from './Player'

type ImpressionCalculator = (player: Player) => number

const baseCalculators = new Map<ImpressionName, ImpressionCalculator>()

/** Register a base impression calculator. */
export function registerImpression(name: ImpressionName, calc: ImpressionCalculator): void {
  baseCalculators.set(name, calc)
}

/** Get all registered impression base calculators. */
export function getImpressionCalculators(): Map<ImpressionName, ImpressionCalculator> {
  return baseCalculators
}

/** Get all registered impression names. */
export function getImpressionNames(): ImpressionName[] {
  return Array.from(baseCalculators.keys())
}

/**
 * Get the impression stat (0-100) from the stats map.
 * This is the player's impression score after item/card modifiers,
 * but before NPC-specific adjustments.
 */
export function getImpressionStat(game: Game, name: ImpressionName): number {
  return Math.max(0, Math.min(100, Math.round(game.player.stats.get(name) ?? 0)))
}

/**
 * Get the final impression (0-100) for an NPC.
 * Starts from the impression stat, then applies NPC-specific modifiers.
 */
export function impression(game: Game, name: ImpressionName, npcId: string): number {
  let score = game.player.stats.get(name) ?? 0

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

// ── Impression base calculators ──────────────────────────────────────────

registerImpression('attraction', (player: Player) => {
  // Base attraction from Charm. Item/card modifiers add on top.
  return player.stats.get('Charm') ?? 0
})

registerImpression('decency', (player: Player) => {
  // 0=shameless, 20=naked, 40=barely acceptable, 60=normal, 80=well dressed, 100=exceptional
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
