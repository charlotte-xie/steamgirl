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
  // Collect all scheduled locations so we know which are "ours" to manage
  const scheduledLocations = new Set<string | null>(
    schedule.filter(e => typeof e[2] === 'string').map(e => e[2] as string),
  )
  scheduledLocations.add(null) // offscreen is always a scheduled state

  return (game: Game, npc: NPC) => {
    const target = matchSchedule(game, schedule)
    if (target === null) {
      // No scheduled destination — if the NPC is at an unscheduled location,
      // let them stay (they have nowhere to be). Otherwise send them offscreen.
      if (!scheduledLocations.has(npc.location)) return null
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

// ============================================================================
// ACTION PLANNER — rate-driven NPC actions
// ============================================================================

/** Entry for actionPlanner: a rate-driven NPC action. */
export interface ActionEntry {
  /** Average time between occurrences in seconds (e.g. 3600 = once per hour). */
  rate: number
  /** Optional condition — entry is skipped if this returns falsy. */
  condition?: Script
  /** Script to run when this action fires. */
  script: Script
  /** If true, fires when NPC is NOT at the player's location (default: co-located only). */
  away?: boolean
}

/**
 * Rate-driven planner for NPC actions — interactions, ambient behaviour, independent plans.
 *
 * Each tick, calculates elapsed time since the NPC's last action tick and uses
 * Poisson probability: p = 1 - e^(-elapsed/rate). Entries are checked in order;
 * the first that passes its probability roll and condition fires.
 *
 * Entries default to co-located (fires when NPC is at the player's location).
 * Set `away: true` for actions when the NPC is elsewhere (e.g. boyfriend visits).
 *
 * The NPC's `_lastTick` stat tracks timing. The first tick sets a baseline
 * without firing.
 */
export function actionPlanner(entries: ActionEntry[]): Planner {
  return (game: Game, npc: NPC) => {
    if (game.player.sleeping) return null

    const now = game.time
    const lastTick = npc.stats.get('_lastTick')

    // First tick — set baseline, don't fire
    if (lastTick === undefined) {
      npc.stats.set('_lastTick', now)
      return null
    }

    const elapsed = now - lastTick

    // No time has passed — nothing to roll
    if (elapsed <= 0) return null

    const coLocated = npc.location === game.currentLocation

    for (const entry of entries) {
      // Location filter: away entries fire when NOT co-located, default when co-located
      if (entry.away ? coLocated : !coLocated) continue

      // Poisson probability: p = 1 - e^(-elapsed/rate)
      const p = 1 - Math.exp(-elapsed / entry.rate)
      if (Math.random() >= p) continue
      if (entry.condition && !game.run(entry.condition)) continue

      // Fire this action
      npc.stats.set('_lastTick', now)
      game.run(entry.script)
      return null
    }

    return null
  }
}

/** @deprecated Use actionPlanner instead. */
export const interactPlanner = actionPlanner

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
