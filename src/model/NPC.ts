import { Game } from "./Game"
import type { Script } from "./Scripts"

export type NPCId = string

// Mutable data for an NPC, used for serialization
export interface NPCData {
  id?: NPCId
  approachCount?: number
  location?: string | null
  nameKnown?: boolean // Whether the player knows the NPC's name
}

// Static / library information for an NPC
export interface NPCDefinition {
  name?: string
  description?: string
  image?: string
  // Optional generate function that initializes the NPC instance (NPC is already constructed)
  generate?: (game: Game, npc: NPC) => void
  // Script to run when player approaches this NPC
  onApproach?: Script
  // Script to run when the hour changes (for NPC movement)
  onMove?: Script
}

/** Represents a game NPC instance with mutable state. Definitional data is accessed via the template property. */
export class NPC {
  id: NPCId
  approachCount: number
  location: string | null
  nameKnown: boolean // Whether the player knows the NPC's name

  constructor(id: NPCId) {
    this.id = id
    this.approachCount = 0
    this.location = null
    this.nameKnown = false // Names are unknown by default
  }

  /**
   * Follow a schedule to determine NPC location based on current hour.
   * Schedule format: [[startHour, endHour, locationId], ...]
   * Hours are 0-23. If current hour falls within a range, NPC moves to that location.
   * If no schedule matches, NPC location is set to null.
   */
  followSchedule(game: Game, schedule: [number, number, string][]): void {
    const currentHour = Math.floor(game.hourOfDay)
    
    // Find matching schedule entry
    for (const [startHour, endHour, locationId] of schedule) {
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

  toJSON(): NPCData {
    // Only serialize mutable state and id
    return {
      id: this.id,
      approachCount: this.approachCount,
      location: this.location,
      nameKnown: this.nameKnown,
    }
  }

  static fromJSON(json: string | NPCData, _game: Game): NPC {
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
    const npc = new NPC(npcId)
    
    // Do NOT call generate() during deserialization - we're restoring from saved state
    // generate() should only be called when creating NPCs on demand via getNPC()
    
    // Apply serialized mutable state directly
    npc.approachCount = data.approachCount ?? 0
    npc.location = data.location ?? null
    npc.nameKnown = data.nameKnown ?? false
    
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
