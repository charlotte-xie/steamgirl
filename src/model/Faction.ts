/**
 * Faction & Reputation System
 *
 * Provides reputation-based gating for story content. The model layer defines
 * the generic mechanics; story modules register specific factions and their
 * reputation tracks at import time.
 *
 * Architecture:
 * - FactionDefinition (immutable) — registered via registerFaction()
 * - ReputationDefinition (immutable) — registered via registerReputation()
 * - Player.reputation (mutable) — Map<string, number> storing scores 0-100
 * - No Faction instances — factions have no per-game mutable state
 *
 * IDs are kebab-case strings (e.g. 'school', 'academic', 'bad-girl').
 * New factions and reputations can be added by story modules at any time.
 */

export type FactionId = string
export type ReputationId = string

export interface ReputationDefinition {
  /** Display name (e.g. "Academic") */
  name: string
  /** Flavour description of what this reputation represents */
  description: string
  /** The faction this reputation belongs to */
  faction: FactionId
  /** Colour for positive change feedback text */
  gainColor: string
  /** Colour for negative change feedback text */
  lossColor: string
}

export interface FactionDefinition {
  /** Display name (e.g. "School") */
  name: string
  /** Flavour description of the faction */
  description: string
  /** Display colour for the faction name */
  colour?: string
  /** Reputation track IDs belonging to this faction */
  reputations: ReputationId[]
}

// ── Registries ──

const FACTION_DEFINITIONS: Record<FactionId, FactionDefinition> = {}
const REPUTATION_DEFINITIONS: Record<ReputationId, ReputationDefinition> = {}

// ── Registration ──

/** Register a faction definition. Called by story modules at import time. */
export function registerFaction(id: FactionId, definition: FactionDefinition): void {
  if (id in FACTION_DEFINITIONS) {
    throw new Error(`Duplicate faction ID: '${id}'`)
  }
  FACTION_DEFINITIONS[id] = definition
}

/** Register a reputation track. Called by story modules at import time. */
export function registerReputation(id: ReputationId, definition: ReputationDefinition): void {
  if (id in REPUTATION_DEFINITIONS) {
    throw new Error(`Duplicate reputation ID: '${id}'`)
  }
  REPUTATION_DEFINITIONS[id] = definition
}

// ── Lookups ──

/** Get a faction definition by ID. */
export function getFaction(id: FactionId): FactionDefinition | undefined {
  return FACTION_DEFINITIONS[id]
}

/** Get a reputation definition by ID. */
export function getReputation(id: ReputationId): ReputationDefinition | undefined {
  return REPUTATION_DEFINITIONS[id]
}

/** Get all reputation IDs belonging to a faction. */
export function getReputationsForFaction(factionId: FactionId): ReputationId[] {
  return FACTION_DEFINITIONS[factionId]?.reputations ?? []
}

/** Get all registered faction IDs. */
export function getAllFactionIds(): FactionId[] {
  return Object.keys(FACTION_DEFINITIONS)
}

/** Get all registered reputation IDs. */
export function getAllReputationIds(): ReputationId[] {
  return Object.keys(REPUTATION_DEFINITIONS)
}
