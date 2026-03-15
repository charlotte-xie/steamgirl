/** Core NPC AI scripts: plan, basePlanner, beAt, idle, approachPlayer. */

import type { Game } from '../Game'
import { type ScriptFn, type Instruction, makeScripts } from '../Scripts'

const npcAIScripts: Record<string, ScriptFn> = {
  /** AI loop: run the current plan, call the planner when it completes. */
  plan: (game: Game, params: { current?: Instruction | null; planner?: Instruction | null }) => {
    let current = (params.current ?? null) as Instruction | null

    // 1. Run the current inner plan
    if (current) {
      current = game.run(current) as Instruction | null
    }

    // 2. If plan completed, ask the planner for a new one
    if (!current && params.planner) {
      current = game.run(params.planner) as Instruction | null
      if (current) {
        // Run the new plan immediately (it may complete in one tick)
        current = game.run(current) as Instruction | null
      }
    }

    // 3. Return the updated plan instruction
    return ['plan', { current, planner: params.planner }]
  },

  /** Bridge from serialisable instruction to NPC definition's planner closure. */
  basePlanner: (game: Game) => {
    const planner = game.npc.template.planner
    if (!planner) return null
    return planner(game, game.npc)
  },

  /** One-shot plan: set NPC location, show arrival/departure text. */
  beAt: (game: Game, params: { location?: string | null }) => {
    const npc = game.npc
    const oldLocation = npc.location
    const newLocation = (params.location as string | null) ?? null

    if (oldLocation !== newLocation) {
      // Departure text if leaving the player's location
      if (oldLocation === game.currentLocation && !game.player.sleeping) {
        if (npc.template.onLeavePlayer && !game.inScene) {
          game.run(npc.template.onLeavePlayer)
        } else {
          game.add(`{npc} leaves.`)
        }
      }
      npc.location = newLocation
      // Arrival text if entering the player's location (not on initial placement)
      if (newLocation === game.currentLocation && !game.player.sleeping && oldLocation !== null) {
        game.add(`{npc} arrives.`)
      }
    }

    return null // one-shot
  },

  /** Extended plan: do nothing until a time, then complete. */
  idle: (game: Game, params: { until?: number }) => {
    if (params.until !== undefined && game.time >= params.until) return null
    return ['idle', params] // keep waiting
  },

  /** One-shot plan: NPC approaches the player. */
  approachPlayer: (game: Game) => {
    if (game.npc.location !== game.currentLocation) return null
    game.run('approach', { npc: game.npc.id })
    return null
  },
}

makeScripts(npcAIScripts)
