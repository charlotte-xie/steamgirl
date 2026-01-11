import type { Script } from "./Scripts"
import { LOCATION_DEFINITIONS as CITY_DEFINITIONS } from "../story/City"
import { LODGINGS_DEFINITIONS } from "../story/Lodgings"

// Combine all location definitions
const LOCATION_DEFINITIONS: Record<string, LocationDefinition> = {
  ...CITY_DEFINITIONS,
  ...LODGINGS_DEFINITIONS,
}

export type LocationId = string

// Mutable data for a location, used for serialization
export interface LocationData {
  id?: LocationId
  numVisits?: number
}

// Static / library information for a location
export interface LocationDefinition {
  name?: string
  description?: string
  image?: string
  links?: LocationLink[]
  activities?: LocationActivity[]
  onFirstArrive?: Script
  onArrive?: Script
}

export interface LocationLink {
  dest: LocationId
  time: number
  onFollow?: Script
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

  constructor(id: LocationId) {
    this.id = id
    this.numVisits = 0
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
    // Only serialize mutable state (numVisits) and id
    return {
      id: this.id,
      numVisits: this.numVisits,
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
    
    // Create location instance with id
    const location = new Location(locationId)
    
    // Apply serialized mutable state
    location.numVisits = data.numVisits ?? 0
    
    return location
  }
}

// Get a location definition by id
export function getLocation(id: LocationId): LocationDefinition | undefined {
  return LOCATION_DEFINITIONS[id]
}


