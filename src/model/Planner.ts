/**
 * NPC Planner Factories and Compositors
 *
 * Planners are stateless functions that examine game state and return a plan (Instruction)
 * or null. They're defined on NPCDefinition and never serialised — only their output is.
 *
 * See docs/NPC_AI.md for the full design.
 */

import type { Game } from './Game'
import type { Instruction, Script } from './Scripts'
import type { NPC, Planner } from './NPC'

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

/**
 * Schedule entry: [startHour, endHour, target, days?]
 *
 * target: string → beAt(location), Instruction → run as plan.
 * days: optional array of day-of-week numbers (0/7=Sun, 1=Mon ... 6=Sat).
 * Hours support wrap-around (e.g. [22, 2, ...] = 10pm to 2am).
 */
export type SchedulePlanEntry = [number, number, string | Instruction, number[]?]

// ============================================================================
// BUILT-IN PLANNERS
// ============================================================================

/**
 * Match a schedule entry for the current hour/day. Returns the target or null.
 */
function matchSchedule(game: Game, schedule: SchedulePlanEntry[]): string | Instruction | null {
  const currentHour = Math.floor(game.hourOfDay)
  const currentDay = game.date.getDay() // 0=Sunday

  for (const [startHour, endHour, target, days] of schedule) {
    // Day filter
    if (days && !days.some(d => d % 7 === currentDay)) continue

    // Hour match (supports wrap-around e.g. [22, 2, ...])
    let matches = false
    if (startHour <= endHour) {
      matches = currentHour >= startHour && currentHour < endHour
    } else {
      matches = currentHour >= startHour || currentHour < endHour
    }

    if (matches) return target
  }
  return null
}

/**
 * Follow a timetable. Entries map time windows to locations or plans.
 * String targets → beAt(location). Instruction targets → run as plan.
 * No match → beAt(null) to go offscreen (if currently somewhere).
 */
export function schedulePlanner(schedule: SchedulePlanEntry[]): Planner {
  return (game: Game, npc: NPC) => {
    const target = matchSchedule(game, schedule)
    if (target === null) {
      if (npc.location) return ['beAt', { location: null }] // leave
      return null // already offscreen
    }
    if (typeof target === 'string') {
      if (npc.location === target) return null // already there
      return ['beAt', { location: target }]
    }
    // Custom plan for this time window
    return target
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

/**
 * Stay in a bedroom with the player instead of following the schedule.
 * Returns null (absorbs the tick) if the NPC is in a bedroom at the player's location.
 * Optional `before` hour: only stay if current hour < before (e.g. morning departures).
 */
export function bedroomStayPlanner(opts?: { before?: number }): Planner {
  return (game: Game, npc: NPC) => {
    if (npc.location !== game.currentLocation) return null
    const loc = npc.location ? game.getLocation(npc.location) : undefined
    if (!loc?.template.isBedroom) return null
    if (opts?.before !== undefined && game.hourOfDay >= opts.before) return null
    return null // absorb — NPC stays put
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
