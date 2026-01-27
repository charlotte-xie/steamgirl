import { Game } from "./Game"
import type { Script } from "./Scripts"
import { speech } from "./Format"

export type NPCId = string

/** A single schedule entry: [startHour, endHour, locationId, days?]. Days is an optional
 *  array of day-of-week numbers (0 and 7 both mean Sunday, 1=Mon ... 6=Sat). */
export type ScheduleEntry = [number, number, string, number[]?]

/**
 * Known NPC stat names. These are the standard stats tracked for NPCs.
 * Additional custom stats can be added as string literals.
 */
export type NPCStatName =
  | 'approachCount'  // Number of times the player has approached this NPC
  | 'nameKnown'      // Whether the player knows the NPC's name (>0 = known, 0 = unknown)
  | 'affection'      // NPC's affection level toward the player (0-100, typically)
  | string           // Allow custom stat names for extensibility

// Mutable data for an NPC, used for serialization
export interface NPCData {
  id?: NPCId
  stats?: Record<NPCStatName, number> // NPC stats (e.g. approachCount, nameKnown)
  location?: string | null
  /** @deprecated Use stats.nameKnown instead. Kept for backwards compatibility. */
  nameKnown?: boolean
}

/** Subject/object/possessive pronoun set for an NPC (e.g. he/him/his). */
export interface Pronouns {
  /** Subject pronoun — 'he', 'she', 'they' */
  subject: string
  /** Object pronoun — 'him', 'her', 'them' */
  object: string
  /** Possessive pronoun — 'his', 'her', 'their' */
  possessive: string
}

/** Common pronoun presets. */
export const PRONOUNS = {
  he: { subject: 'he', object: 'him', possessive: 'his' } satisfies Pronouns,
  she: { subject: 'she', object: 'her', possessive: 'her' } satisfies Pronouns,
  they: { subject: 'they', object: 'them', possessive: 'their' } satisfies Pronouns,
}

// Static / library information for an NPC
export interface NPCDefinition {
  name?: string
  /** Unidentified name - generic description shown when name is not known (e.g. "barkeeper", "intimidating gangster"). */
  uname?: string
  description?: string
  image?: string
  /** Default colour for this NPC's speech/dialogue. Can be overridden per speech() call. */
  speechColor?: string
  /** NPC pronouns — defaults to they/them/their. Use PRONOUNS.he, PRONOUNS.she, etc. */
  pronouns?: Pronouns
  /** Faction this NPC belongs to (e.g. 'school', 'lowtown'). Informational — gating uses hasReputation(). */
  faction?: string
  // Optional generate function that initializes the NPC instance (NPC is already constructed)
  generate?: (game: Game, npc: NPC) => void
  // Script to run when player approaches this NPC for the first time
  onFirstApproach?: Script
  // Script to run when player approaches this NPC (used after first approach, or if no onFirstApproach)
  onApproach?: Script
  // Script to run when the hour changes (for NPC movement)
  onMove?: Script
  /**
   * Called each 10-minute chunk when the player waits at a location where this NPC is present.
   * Receives { npc: string, minutes: number }. May create a scene to interrupt the wait.
   * Fires before the location's onWait. Use NPC state (e.g. nameKnown) to gate one-shot events.
   */
  onWait?: Script
  /** NPC-specific scripts run via the global "interact" script with { npc, script, params? }. */
  scripts?: Record<string, Script>
}

/** Represents a game NPC instance with mutable state. Definitional data is accessed via the template property. */
export class NPC {
  /** Back-reference to the Game instance. Set in constructor, never changes. */
  readonly game: Game
  id: NPCId
  stats: Map<NPCStatName, number> // NPC stats (e.g. approachCount, nameKnown)
  location: string | null

  constructor(id: NPCId, game: Game) {
    this.game = game
    this.id = id
    this.stats = new Map<string, number>()
    this.stats.set('approachCount', 0)
    this.stats.set('nameKnown', 0) // Names are unknown by default (0 = unknown, >0 = known)
    this.stats.set('affection', 0) // Affection starts at 0
    this.location = null
  }

  /** Gets the approachCount stat (for convenience). */
  get approachCount(): number {
    return this.stats.get('approachCount') ?? 0
  }

  /** Sets the approachCount stat (for convenience). */
  set approachCount(value: number) {
    this.stats.set('approachCount', value)
  }

  /** Gets the nameKnown stat (for convenience). >0 = name is known. */
  get nameKnown(): number {
    return this.stats.get('nameKnown') ?? 0
  }

  /** Sets the nameKnown stat (for convenience). >0 = name is known. */
  set nameKnown(value: number) {
    this.stats.set('nameKnown', value)
  }

  /** Gets the affection stat (for convenience). */
  get affection(): number {
    return this.stats.get('affection') ?? 0
  }

  /** Sets the affection stat (for convenience). */
  set affection(value: number) {
    this.stats.set('affection', value)
  }

  /**
   * Follow a schedule to determine NPC location based on current hour and day.
   * Schedule entries: [startHour, endHour, locationId, days?]
   * Hours are 0-23. If current hour falls within a range, NPC moves to that location.
   * Optional `days` array restricts the entry to specific days of the week
   * (0 and 7 both mean Sunday, 1=Monday ... 6=Saturday).
   * If no schedule matches, NPC location is set to null.
   */
  followSchedule(game: Game, schedule: ScheduleEntry[]): void {
    const currentHour = Math.floor(game.hourOfDay)
    const currentDay = game.date.getDay() // 0=Sunday

    // Find matching schedule entry
    for (const entry of schedule) {
      const [startHour, endHour, locationId, days] = entry

      // Day filter: skip if days are specified and today isn't one of them
      if (days && !days.some(d => d % 7 === currentDay)) continue

      // Handle wrap-around (e.g., 22-2 means 22:00 to 02:00 next day)
      let matches = false
      if (startHour <= endHour) {
        // Normal case: startHour to endHour within same day
        matches = currentHour >= startHour && currentHour < endHour
      } else {
        // Wrap-around case: e.g., 22 to 2 means 22:00-23:59 and 00:00-01:59
        matches = currentHour >= startHour || currentHour < endHour
      }

      if (matches) {
        this.location = locationId
        return
      }
    }

    // No schedule matches, set location to null
    this.location = null
  }

  /** Gets the NPC definition template. */
  get template(): NPCDefinition {
    const definition = NPC_DEFINITIONS[this.id]
    if (!definition) {
      throw new Error(`NPC definition not found: ${this.id}`)
    }
    return definition
  }

  /** Gets this NPC's pronouns (defaults to they/them/their). */
  get pronouns(): Pronouns {
    return this.template.pronouns ?? PRONOUNS.they
  }

  /** Makes this NPC say something. Uses the NPC's speech color. Returns this for fluent chaining. */
  say(dialogText: string): this {
    this.game.add(speech(dialogText, this.template.speechColor))
    return this
  }

  /** Adds an option for an NPC interaction with this NPC. Returns this for fluent chaining. */
  option(label: string, npcInteractionName: string, params?: object): this {
    this.game.addOption('interact', { script: npcInteractionName, params }, label)
    return this
  }

  /** Runs the onGeneralChat script for this NPC. Returns this for fluent chaining. */
  chat(): this {
    this.game.run('interact', { script: 'onGeneralChat' })
    return this
  }

  /** Ends the conversation by adding an endConversation option. Returns this for fluent chaining. */
  leaveOption(text?: string, reply?: string, label: string = 'Leave'): this {
    this.game.addOption('endConversation', { text, reply }, label)
    return this
  }

  /** Adds a generic option (for non-NPC scripts). Returns this for fluent chaining. */
  addOption(scriptName: string, params: {} = {}, label?: string): this {
    this.game.addOption(scriptName, params, label)
    return this
  }

  toJSON(): NPCData {
    // Convert stats Map to Record for JSON serialization
    const statsRecord: Record<string, number> = {}
    this.stats.forEach((value, key) => {
      statsRecord[key] = value
    })
    
    // Only serialize mutable state and id
    return {
      id: this.id,
      stats: statsRecord,
      location: this.location,
    }
  }

  static fromJSON(json: string | NPCData, game: Game): NPC {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const npcId = data.id
    
    if (!npcId) {
      throw new Error('NPC.fromJSON requires an id')
    }
    
    // Verify definition exists
    const definition = NPC_DEFINITIONS[npcId]
    if (!definition) {
      throw new Error(`NPC definition not found: ${npcId}`)
    }
    
    // Create the NPC instance
    const npc = new NPC(npcId, game)
    
    // Do NOT call generate() during deserialization - we're restoring from saved state
    // generate() should only be called when creating NPCs on demand via getNPC()
    
    // Deserialize stats
    if (data.stats) {
      npc.stats.clear()
      Object.entries(data.stats).forEach(([key, value]) => {
        if (typeof value === 'number') {
          npc.stats.set(key, value)
        }
      })
    }
    
    // Apply serialized mutable state directly
    npc.location = data.location ?? null

    return npc
  }
}

// NPC definitions registry
// NPCs can be added from various story modules
const NPC_DEFINITIONS: Record<NPCId, NPCDefinition> = {}

// Register NPC definitions (can be called from story modules)
export function registerNPC(id: NPCId, definition: NPCDefinition): void {
  NPC_DEFINITIONS[id] = definition
}

// Get an NPC definition by id
export function getNPCDefinition(id: NPCId): NPCDefinition | undefined {
  return NPC_DEFINITIONS[id]
}

// Get all registered NPC IDs
export function getAllNPCIds(): NPCId[] {
  return Object.keys(NPC_DEFINITIONS)
}
