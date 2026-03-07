/**
 * NPC Planner Factories and Compositors
 *
 * Planners are stateless functions that examine game state and return a plan (Instruction)
 * or null. They're defined on NPCDefinition and never serialised — only their output is.
 *
 * See docs/NPC_AI.md for the full design.
 */

import type { Game } from './Game'
import type { Script } from './Scripts'
import type { NPC, Planner, ScheduleEntry } from './NPC'

// ============================================================================
// BUILT-IN PLANNERS
// ============================================================================

/**
 * Match a schedule entry for the current hour/day. Returns the location or null.
 */
function matchSchedule(game: Game, schedule: ScheduleEntry[]): string | null {
  const currentHour = Math.floor(game.hourOfDay)
  const currentDay = game.date.getDay() // 0=Sunday

  for (const [startHour, endHour, locationId, days] of schedule) {
    // Day filter
    if (days && !days.some(d => d % 7 === currentDay)) continue

    // Hour match (supports wrap-around e.g. [22, 2, ...])
    let matches = false
    if (startHour <= endHour) {
      matches = currentHour >= startHour && currentHour < endHour
    } else {
      matches = currentHour >= startHour || currentHour < endHour
    }

    if (matches) return locationId
  }
  return null
}

/** Follow a timetable. Returns beAt for the matching entry, or beAt(null) to leave. */
export function schedulePlanner(schedule: ScheduleEntry[]): Planner {
  return (game: Game, npc: NPC) => {
    const location = matchSchedule(game, schedule)
    if (!location) {
      if (npc.location) return ['beAt', { location: null }] // leave
      return null // already offscreen
    }
    if (npc.location === location) return null // already there
    return ['beAt', { location }]
  }
}

/** Return approachPlayer when a condition is met and NPC is co-located with player. */
export function approachPlayerPlanner(condition: Script): Planner {
  return (game: Game, npc: NPC) => {
    if (npc.location !== game.currentLocation) return null
    if (game.player.sleeping) return null
    if (!game.run(condition)) return null
    return ['approachPlayer', {}]
  }
}

/** Idle reaction definition for idlePlanner. */
export interface IdleReaction {
  chance?: number
  condition?: Script
  script: Script
}

/** Run ambient reactions when NPC is co-located with player. */
export function idlePlanner(reactions: IdleReaction[]): Planner {
  return (game: Game, npc: NPC) => {
    if (npc.location !== game.currentLocation) return null
    if (game.player.sleeping) return null
    for (const r of reactions) {
      if (r.chance !== undefined && Math.random() >= r.chance) continue
      if (r.condition && !game.run(r.condition)) continue
      // Run the reaction directly (one-shot, no intermediate plan)
      game.run(r.script)
      return null
    }
    return null
  }
}

// ============================================================================
// COMPOSITE PLANNERS
// ============================================================================

/** Try planners in order. Returns the first non-null plan. */
export function priority(...planners: Planner[]): Planner {
  return (game: Game, npc: NPC) => {
    for (const planner of planners) {
      const plan = planner(game, npc)
      if (plan) return plan
    }
    return null
  }
}

/** Shuffle planners, then try in random order. Returns the first non-null plan. */
export function randomPick(...planners: Planner[]): Planner {
  return (game: Game, npc: NPC) => {
    const shuffled = [...planners]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    for (const planner of shuffled) {
      const plan = planner(game, npc)
      if (plan) return plan
    }
    return null
  }
}

/** Weighted random selection. Entries are [weight, planner]. */
export function weighted(...entries: [number, Planner][]): Planner {
  return (game: Game, npc: NPC) => {
    const totalWeight = entries.reduce((sum, [w]) => sum + w, 0)
    let roll = Math.random() * totalWeight
    // Shuffle to avoid bias when multiple planners match
    const shuffled = [...entries]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    for (const [weight, planner] of shuffled) {
      roll -= weight
      if (roll <= 0) {
        const plan = planner(game, npc)
        if (plan) return plan
      }
    }
    // Fallback: try all remaining
    for (const [, planner] of shuffled) {
      const plan = planner(game, npc)
      if (plan) return plan
    }
    return null
  }
}
