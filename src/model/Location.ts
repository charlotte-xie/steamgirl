import type { Script } from "./Scripts"
import type { Game } from "./Game"

// Location definitions registry
// Locations can be added from various story modules
const LOCATION_DEFINITIONS: Record<LocationId, LocationDefinition> = {}

// Register location definitions (can be called from story modules)
export function registerLocation(id: LocationId, definition: LocationDefinition): void {
  if (definition.isBedroom) definition.private = true
  LOCATION_DEFINITIONS[id] = definition
}

export type LocationId = string

// Mutable data for a location, used for serialization
export interface LocationData {
  id?: LocationId
  numVisits?: number
  discovered?: boolean
}

// Static / library information for a location
export interface LocationDefinition {
  name?: string
  description?: string
  image?: string
  nightImage?: string
  links?: LocationLink[]
  activities?: LocationActivity[]
  onFirstArrive?: Script
  onArrive?: Script
  onRelax?: Script
  /**
   * Called each 10-minute chunk when the player waits at this location.
   * Receives { minutes: number }. May create a scene to interrupt the wait.
   * Fires after NPC onWait hooks (so NPC interactions take priority over ambient events).
   */
  onWait?: Script
  /**
   * Called each 10-minute chunk when the player waits at this location, before onWait.
   * Used for system-level checks (public indecency, curfew, etc.) that are separate
   * from ambient flavour events. May create a scene to interrupt the wait.
   */
  onTick?: Script
  /** If true, this is a bedroom — NPCs can visit/stay overnight. Implies `private`. */
  isBedroom?: boolean
  /** If true, this is a private space (bedroom, bathroom, etc.) — player cannot be indecent here. Set automatically for bedrooms. */
  private?: boolean
  secret?: boolean // If true, location starts as undiscovered (discovered = false)
  /** If true, this is a main area for travel (e.g. City Centre, Station). Links between two mainLocation sites appear under Travel. */
  mainLocation?: boolean
}

export interface LocationLink {
  dest: LocationId
  time: number
  /** If set, overrides the destination location name in the nav (e.g. "Leave for Backstreets"). */
  label?: string
  onFollow?: Script
  checkAccess?: (game: Game) => string | null | undefined // Returns reason string if access denied, null/undefined if allowed
  /** If true, show this link under Travel instead of Places (e.g. subway-to-subway). */
  travel?: boolean
  /** Cost in Krona; shown in nav e.g. "5 min, 3 kr" when set. */
  cost?: number
  /** If set, the nav uses this location's image for the thumbnail instead of dest (e.g. for subway links, the main area you're travelling toward). */
  imageLocation?: LocationId
  /** If true, show this link even when the destination is undiscovered. Following the link will discover the location. */
  alwaysShow?: boolean
}

export interface LocationActivity {
  name: string
  image?: string
  symbol?: string
  script: Script
  condition?: Script
  checkAccess?: (game: Game) => string | null | undefined
  label?: string
}

/** Represents a game location instance with mutable state. Definitional data is accessed via the template property. */
export class Location {
  id: LocationId
  numVisits: number
  discovered: boolean

  constructor(id: LocationId) {
    this.id = id
    this.numVisits = 0
    // Check if location definition has secret flag - if so, start undiscovered
    const definition = LOCATION_DEFINITIONS[id]
    this.discovered = definition?.secret === true ? false : true
  }

  /** Gets the location definition template. */
  get template(): LocationDefinition {
    const definition = LOCATION_DEFINITIONS[this.id]
    if (!definition) {
      throw new Error(`Location definition not found: ${this.id}`)
    }
    return definition
  }

  toJSON(): LocationData {
    // Only serialize mutable state (numVisits, discovered) and id
    return {
      id: this.id,
      numVisits: this.numVisits,
      discovered: this.discovered,
    }
  }

  static fromJSON(json: string | LocationData): Location {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const locationId = data.id
    
    if (!locationId) {
      throw new Error('Location.fromJSON requires an id')
    }
    
    // Verify definition exists
    if (!LOCATION_DEFINITIONS[locationId]) {
      throw new Error(`Location definition not found: ${locationId}`)
    }
    
    // Create location instance with id (this will set discovered based on secret field if not overridden)
    const location = new Location(locationId)
    
    // Apply serialized mutable state
    location.numVisits = data.numVisits ?? 0
    location.discovered = data.discovered ?? location.discovered
    
    return location
  }
}

// Get a location definition by id
export function getLocation(id: LocationId): LocationDefinition | undefined {
  return LOCATION_DEFINITIONS[id]
}

// Get all registered location IDs (for iteration, e.g. discover-all in debug)
export function getAllLocationIds(): LocationId[] {
  return Object.keys(LOCATION_DEFINITIONS)
}


