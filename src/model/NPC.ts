import { Game } from "./Game"
import { makeScript, parseArgs, interpolateString, type Accessor, type Instruction, type Script } from "./Scripts"
import { type InlineContent, speech } from "./Format"
import { capitalise } from "./Text"
import { getFaction } from "./Faction"
import { mapToRecord } from "../utils/mapRecord"
import { getDefinition } from "../utils/registry"

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
  /** Optional generate function that initializes the NPC instance (NPC is already constructed). */
  generate?: (game: Game, npc: NPC) => void
  /** Script to run when player approaches this NPC for the first time. */
  onFirstApproach?: Script
  /** Script to run when player approaches this NPC (used after first approach, or if no onFirstApproach) */
  onApproach?: Script

  /** Script to periodically for NPC movement (typically hourly) */
  onMove?: Script
  /**
   * Called when a NPC has a chance to approach the player (e.g. waiting).
   * May create a scene to interrupt.
   * Use for date intercepts, auto-greets, and NPC-initiated encounters.
   */
  maybeApproach?: Script
  /**
   * Called each 10-minute chunk when the player waits at a location where this NPC is present.
   * Receives { npc: string, minutes: number }. May create a scene to interrupt the wait.
   * Fires before the location's onWait. Use NPC state (e.g. nameKnown) to gate one-shot events.
   */
  onWait?: Script
  /**
   * Called each 10-minute chunk during waits for NPCs that are NOT at the player's location.
   * Use for NPCs that can visit the player (e.g. boyfriend dropping by in the evening).
   * May create a scene to interrupt the wait.
   */
  onWaitAway?: Script
  /**
   * Called when followSchedule is about to move this NPC away from the player's location.
   * Fires only if the player is awake and not already in a scene.
   * Use for farewell scenes (e.g. boyfriend leaving in the morning).
   * The NPC's location is updated after this script runs — no need to call moveNpc.
   */
  onLeavePlayer?: Script
  /**
   * Modify a computed impression score for this NPC. Called after the base
   * impression is calculated. Use to express NPC-specific preferences
   * (e.g. Gerald prefers modesty, Rob likes confidence).
   * Return the adjusted score (will be clamped to 0-100).
   * Access game via npc.game if needed.
   */
  modifyImpression?: (npc: NPC, impression: string, score: number) => number
  /** Called after every player action while this NPC is at the player's location. */
  afterUpdate?: Script
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
    let newLocation: string | null = null
    let found = false
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
        newLocation = locationId
        found = true
        break
      }
    }

    // Determine final location: if a schedule matched, go there.
    // If not, leave scheduled locations (e.g. end of shift) but stay put elsewhere.
    let finalLocation = this.location
    if (found) {
      finalLocation = newLocation
    } else {
      const scheduledLocations = new Set(schedule.map(e => e[2]))
      if (this.location && scheduledLocations.has(this.location)) {
        finalLocation = null
      }
    }

    // If the NPC is currently at the player's location and about to leave,
    // fire the onLeavePlayer hook (if player is awake and not in a scene).
    if (this.location === game.currentLocation && finalLocation !== this.location) {
      const hook = this.template.onLeavePlayer
      if (hook && !game.player.sleeping && !game.inScene) {
        game.scene.npc = this.id
        game.run(hook)
      }
    }

    this.location = finalLocation
  }

  /** Gets the NPC definition template. */
  get template(): NPCDefinition {
    return getDefinition(NPC_DEFINITIONS, this.id, 'NPC')
  }

  /** Gets this NPC's pronouns (defaults to they/them/their). */
  get pronouns(): Pronouns {
    return this.template.pronouns ?? PRONOUNS.they
  }

  /** Makes this NPC say something. Uses the NPC's speech color. Supports {interpolation}. Returns this for fluent chaining. */
  say(dialogText: string): this {
    let text = dialogText
    if (dialogText.includes('{')) {
      text = interpolateString(this.game, dialogText)
        .map(part => typeof part === 'string' ? part : part.text)
        .join('')
    }
    this.game.add(speech(text, this.template.speechColor))
    return this
  }

  /** Adds an option for an NPC interaction with this NPC. Returns this for fluent chaining. */
  option(label: string, npcInteractionName: string, params?: object): this {
    this.game.addOption(['interact', { script: npcInteractionName, params }], label)
    return this
  }

  /** Runs the onGeneralChat script for this NPC. Returns this for fluent chaining. */
  chat(): this {
    this.game.run('interact', { script: 'onGeneralChat' })
    return this
  }

  /** Ends the conversation by adding an endConversation option with exit. Returns this for fluent chaining. */
  leaveOption(text?: string, reply?: string, label: string = 'Leave'): this {
    const action: [string, Record<string, unknown>] = ['seq', { instructions: [
      ['endConversation', { text, reply }],
      ['exitScene', {}],
    ] }]
    this.game.addOption(action, label)
    return this
  }

  /** Adds a generic option. Action is a string expression or Instruction. Returns this for fluent chaining. */
  addOption(action: string | Instruction, label?: string): this {
    this.game.addOption(action, label)
    return this
  }

  toJSON(): NPCData {
    return {
      id: this.id,
      stats: mapToRecord(this.stats),
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
    getDefinition(NPC_DEFINITIONS, npcId, 'NPC')

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

// ============================================================================
// NPC ACCESSOR — expression chaining for {npc}, {npc:he}, {npc(rob):faction}
// ============================================================================

class NPCAccessor implements Accessor {
  npc: NPC | undefined
  constructor(npc: NPC | undefined) { this.npc = npc }

  default(_game: Game): InlineContent {
    return this.nameContent()
  }

  resolve(game: Game, rest: string): unknown {
    // Handle args: npc(rob) or npc(rob):he
    const args = parseArgs(rest)
    if (args) {
      const accessor = new NPCAccessor(game.getNPC(args.argline))
      return args.tail ? accessor.resolve(game, args.tail) : accessor.default(game)
    }

    const npc = this.requireNpc()

    switch (rest) {
      case 'name': return this.nameContent()
      case 'he': return npc.pronouns.subject
      case 'him': return npc.pronouns.object
      case 'his': return npc.pronouns.possessive
      case 'He': return capitalise(npc.pronouns.subject)
      case 'Him': return capitalise(npc.pronouns.object)
      case 'His': return capitalise(npc.pronouns.possessive)
      case 'faction': {
        const factionId = npc.template.faction
        if (!factionId) return 'unaffiliated'
        const faction = getFaction(factionId)
        if (!faction) return factionId
        return { type: 'text' as const, text: faction.name, color: faction.colour }
      }
      default: {
        const script = npc.template.scripts?.[rest]
        if (!script) throw new Error(`Unknown NPC accessor property: ${rest}`)
        return script
      }
    }
  }

  requireNpc(): NPC {
    if (!this.npc) throw new Error('NPC accessor: no NPC specified')
    return this.npc
  }

  nameContent(): InlineContent {
    const npc = this.requireNpc()
    const name = npc.nameKnown > 0 ? npc.template.name : npc.template.uname
    const color = npc.template.speechColor ?? '#888'
    return { type: 'text', text: name || 'someone', color }
  }
}

makeScript('npc', (game: Game): Accessor => {
  const npcId = game.scene.npc
  return new NPCAccessor(npcId ? game.getNPC(npcId) : undefined)
})
