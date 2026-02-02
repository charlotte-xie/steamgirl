/**
 * Intimacy.ts - Shared functions and scripts for NPC intimacy scenes.
 */

import { Game } from '../../model/Game'
import { makeScript } from '../../model/Scripts'

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
}

makeScript('madeLove', (game: Game, params: { npc?: string }) => {
  madeLove(game, params.npc)
})
