/** Core predicate scripts: stat checks, conditions, boolean logic, comparisons. */

import type { Game } from '../Game'
import type { StatName } from '../Stats'
import type { ImpressionName } from '../Stats'
import type { TimerName } from '../Player'
import { isClothingPosition, type ClothingPosition, type ClothingLayer } from '../Item'
import { impression, getImpressionStat } from '../Impression'
import { type ScriptFn, type Instruction, makeScripts } from '../Scripts'
import { exec, isTruthy } from './helpers'

const predicateScripts: Record<string, ScriptFn> = {
  /** Check if player has item */
  hasItem: (game: Game, params: { item?: string; count?: number }): boolean => {
    if (!params.item) return false
    return game.player.inventory.some(
      i => i.id === params.item && i.number >= (params.count ?? 1)
    )
  },

  /** Player stat: returns value (number) if no min/max, boolean if threshold specified. */
  stat: (game: Game, params: { stat?: string; min?: number; max?: number }): number | boolean => {
    if (!params.stat) return 0
    const value = game.player.stats.get(params.stat as StatName) ?? 0
    // No range: return raw value (works in conditionals via isTruthy)
    if (params.min === undefined && params.max === undefined) return value
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  /** Faction reputation: returns value (number) if no min/max, boolean if threshold specified. */
  reputation: (game: Game, params: { reputation?: string; min?: number; max?: number }): number | boolean => {
    if (!params.reputation) return 0
    const value = game.player.reputation.get(params.reputation) ?? 0
    // No range: return raw value (works in conditionals via isTruthy)
    if (params.min === undefined && params.max === undefined) return value
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  /** Check if player is at location */
  inLocation: (game: Game, params: { location?: string }): boolean => {
    return game.currentLocation === params.location
  },

  /** Check if player is in a bedroom (any location with isBedroom flag) */
  inBedroom: (game: Game): boolean => {
    return game.location.template.isBedroom === true
  },

  /** Check if player is in a private location (bedroom, bathroom, etc.) */
  inPrivate: (game: Game): boolean => {
    return game.location.template.private === true
  },

  /** True if a body position is exposed (nothing worn at under, inner, or outer layers). */
  exposed: (game: Game, params: { position?: string }): boolean => {
    const position = params.position
    if (!position || !isClothingPosition(position)) return false
    const layers: ClothingLayer[] = ['under', 'inner', 'outer']
    return layers.every(layer => !game.player.getWornAt(position, layer))
  },

  /** True if the player is wearing anything on clothing layers (under/inner/outer).
   *  Optional position filter narrows the check to a single body position. */
  dressed: (game: Game, params: { position?: string }): boolean => {
    const layers: ClothingLayer[] = ['under', 'inner', 'outer']
    if (params.position && isClothingPosition(params.position)) {
      return layers.some(layer => !!game.player.getWornAt(params.position as ClothingPosition, layer))
    }
    // No position — check all positions
    const positions: ClothingPosition[] = ['head', 'face', 'neck', 'chest', 'belly', 'arms', 'wrists', 'hands', 'waist', 'hips', 'legs', 'feet']
    return positions.some(pos => layers.some(layer => !!game.player.getWornAt(pos, layer)))
  },

  /** Check if currently in a scene (has options) */
  inScene: (game: Game): boolean => {
    return game.inScene
  },

  /** True when the current scene already has content (text, paragraphs, etc.) */
  hasContent: (game: Game): boolean => {
    return game.scene.content.length > 0
  },

  /** NPC stat: returns value (number) if no min/max, boolean if threshold specified. Uses scene NPC if npc omitted. */
  npcStat: (game: Game, params: { npc?: string; stat?: string; min?: number; max?: number }): number | boolean => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId || !params.stat) return 0
    const npc = game.npcs.get(npcId)
    if (!npc) return 0
    const value = npc.stats.get(params.stat) ?? 0
    // No range: return raw value (works in conditionals via isTruthy)
    if (params.min === undefined && params.max === undefined) return value
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  /** Computed impression score: returns value (0-100) if no range, boolean if min/max specified. Uses scene NPC if npc omitted. */
  impression: (game: Game, params: { impression?: string; npc?: string; min?: number; max?: number }): number | boolean => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId || !params.impression) return 0
    const value = impression(game, params.impression as ImpressionName, npcId)
    if (params.min === undefined && params.max === undefined) return value
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  /** Check if player has a card */
  hasCard: (game: Game, params: { cardId?: string }): boolean => {
    if (!params.cardId) return false
    return game.player.hasCard(params.cardId)
  },

  /** Check if player has a specific relationship with an NPC. If no relationship specified, checks if any exists. Uses scene NPC if npc omitted. */
  hasRelationship: (game: Game, params: { relationship?: string; npc?: string }): boolean => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId) return false
    const rel = game.player.relationships.get(npcId)
    if (!rel) return false
    if (params.relationship) return rel === params.relationship
    return true
  },

  /** Set a relationship with an NPC. Uses scene NPC if npc omitted. Omit relationship to clear. */
  setRelationship: (game: Game, params: { relationship?: string; npc?: string }) => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId) throw new Error('setRelationship requires an npc parameter or active scene NPC')
    if (params.relationship) {
      game.player.relationships.set(npcId, params.relationship)
    } else {
      game.player.relationships.delete(npcId)
    }
  },

  /** Check if a card is completed */
  cardCompleted: (game: Game, params: { cardId?: string }): boolean => {
    if (!params.cardId) return false
    const card = game.player.cards.find(c => c.id === params.cardId)
    return card?.completed === true
  },

  /** Check if a location has been discovered */
  locationDiscovered: (game: Game, params: { location?: string }): boolean => {
    if (!params.location) return false
    const loc = game.locations.get(params.location)
    return loc ? loc.discovered : false
  },

  /** Check that no NPCs are present at the current location */
  nobodyPresent: (game: Game): boolean => {
    return game.npcsPresent.length === 0
  },

  /** Check if a specific NPC is at the player's current location */
  npcPresent: (game: Game, params: { npc?: string } = {}): boolean => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId) return false
    const npc = game.getNPC(npcId)
    return npc.location === game.currentLocation
  },

  /** Get an NPC's current location ID, or check if they're at a specific location (predicate mode). */
  npcLocation: (game: Game, params: { npc?: string; location?: string } = {}): string | null | boolean => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId) return params.location ? false : null
    const npc = game.getNPC(npcId)
    if (params.location) return npc.location === params.location
    return npc.location
  },

  // --- Generic value & arithmetic scripts ---

  /** Returns the current game time (epoch seconds). */
  gameTime: (game: Game): number => game.time,

  /** Subtract: evaluates `a` and `b` (numbers or Instructions) and returns a - b. */
  sub: (game: Game, params: { a?: number | Instruction; b?: number | Instruction }): number => {
    const a = typeof params.a === 'number' ? params.a : Number(game.run(params.a) ?? 0)
    const b = typeof params.b === 'number' ? params.b : Number(game.run(params.b) ?? 0)
    return a - b
  },

  /** True if the player is indecently dressed in a public place (decency below level, not private). Default level 40. */
  indecent: (game: Game, params: { level?: number } = {}): boolean => {
    const loc = game.location.template
    if (loc.private || loc.isBedroom) return false
    return getImpressionStat(game, 'decency') < (params.level ?? 40)
  },

  /** Move the player to a destination immediately (no time cost). Used for ejecting from locations. */
  ejectPlayer: (game: Game, params: { location?: string } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('ejectPlayer script requires a location parameter')
    }
    game.run('move', { location: locationId })
  },

  /** Check if the current day is a weekday (Mon-Fri) */
  isWeekday: (game: Game): boolean => {
    const day = game.date.getDay()
    return day >= 1 && day <= 5
  },

  /** Check if the current hour is within a range (supports wrap-around, e.g. 22 to 6) */
  hourBetween: (game: Game, params: { from?: number; to?: number }): boolean => {
    const from = params.from ?? 0
    const to = params.to ?? 24
    const hour = game.hourOfDay
    if (from < to) {
      return hour >= from && hour < to
    }
    // Wrap-around (e.g. 22 to 6 means 10pm-6am)
    return hour >= from || hour < to
  },

  /** Negate a predicate */
  not: (game: Game, params: { predicate?: Instruction }): boolean => {
    if (!params.predicate) return true
    return !isTruthy(exec(game, params.predicate))
  },

  /** All predicates must be true */
  and: (game: Game, params: { predicates?: Instruction[] }): boolean => {
    if (!params.predicates) return true
    return params.predicates.every(p => isTruthy(exec(game, p)))
  },

  /** Any predicate must be true */
  or: (game: Game, params: { predicates?: Instruction[] }): boolean => {
    if (!params.predicates) return false
    return params.predicates.some(p => isTruthy(exec(game, p)))
  },

  /** True with the given probability (0-1). Evaluated at runtime. */
  chance: (_game: Game, params: { probability?: number }): boolean => {
    const p = params.probability ?? 0.5
    return Math.random() < p
  },

  /** True when debug mode is enabled */
  debug: (game: Game): boolean => {
    return game.isDebug
  },

  /** True when steamy content is enabled */
  steamy: (game: Game): boolean => {
    return game.settings.get('steamy') ?? false
  },

  // ── Comparison predicates ───────────────────────────────────────

  /** Compare two values. Operands can be numbers or value-returning instructions. op: '>' (default), '<', '>=', '<=', '==' */
  compare: (game: Game, params: { a?: Instruction | number; b?: Instruction | number; op?: string }): boolean => {
    if (params.a == null || params.b == null) return false
    const a = typeof params.a === 'number' ? params.a : Number(game.run(params.a) ?? 0)
    const b = typeof params.b === 'number' ? params.b : Number(game.run(params.b) ?? 0)
    switch (params.op) {
      case '<': return a < b
      case '>=': return a >= b
      case '<=': return a <= b
      case '==': return a === b
      default: return a > b
    }
  },

  /** Check if at least `minutes` have elapsed since a recorded timer */
  timeElapsed: (game: Game, params: { timer?: string; minutes?: number }): boolean => {
    if (!params.timer || typeof params.timer !== 'string') {
      throw new Error('timeElapsed requires a timer parameter (string name)')
    }
    if (params.minutes === undefined || typeof params.minutes !== 'number') {
      throw new Error('timeElapsed requires a minutes parameter (number)')
    }
    const recorded = game.player.timers.get(params.timer as TimerName)
    if (recorded === undefined) return true // No record means "long enough ago"
    const elapsed = game.time - recorded
    const required = params.minutes * 60 // Convert minutes to seconds
    return elapsed >= required
  },
}

makeScripts(predicateScripts)
