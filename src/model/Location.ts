import type { Script } from "./Scripts"
import type { Game } from "./Game"

// Location definitions registry
// Locations can be added from various story modules
const LOCATION_DEFINITIONS: Record<LocationId, LocationDefinition> = {}

// Register location definitions (can be called from story modules)
export function registerLocation(id: LocationId, definition: LocationDefinition): void {
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
  secret?: boolean // If true, location starts as undiscovered (discovered = false)
}

export interface LocationLink {
  dest: LocationId
  time: number
  onFollow?: Script
  checkAccess?: (game: Game) => string | null | undefined // Returns reason string if access denied, null/undefined if allowed
}

export interface LocationActivity {
  name: string
  image?: string
  symbol?: string
  script: Script
  condition?: Script
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


