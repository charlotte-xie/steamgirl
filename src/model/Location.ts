import { Game } from "./Game"
import type { Script } from "./Scripts"

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
  onFirstArrive?: Script
  onArrive?: Script
}

export interface LocationLink {
  dest: LocationId
  time: number
  onFollow?: Script
}

// Location definitions as a plain object for better ergonomics and editing
// These are the standard locations. Others might be added elsewhere
const LOCATION_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  station: {
    name: 'Main Station',
    description: 'The bustling main railway station, filled with travelers.',
    image: '/images/station.jpg',
    links: [{ dest: 'default', time: 10 }], // 10 minutes to city
  },
  default: {
    name: 'City Centre',
    description: 'The heart of the city, where commerce and culture meet.',
    image: '/images/city.jpg',
    links: [{ dest: 'station', time: 10 }, { dest: 'backstreets', time: 5 }, { dest: 'school', time: 5 }], // 10 minutes back to station, 5 minutes to backstreets, 5 minutes to school
  },
  backstreets: {
    name: 'Backstreets',
    description: 'The winding alleys and hidden passages of the city, where secrets lurk in the shadows.',
    image: '/images/backstreet.jpg',
    links: [{ dest: 'default', time: 5 }], // 5 minutes to city centre
    onFirstArrive: (g: Game) => {
      g.add('You arrive in the backstreets. The air is thick with the smell of coal and oil. You can hear the sound of steam engines in the distance.')
    },
  },
  school: {
    name: 'University',
    description: 'A grand educational institution where knowledge flows like steam through pipes.',
    image: '/images/school.jpg',
    links: [{ dest: 'default', time: 5 }, { dest: 'lake', time: 8 }], // 5 minutes to city centre, 8 minutes to lake
  },
  lake: {
    name: 'The Lake',
    description: 'A serene city lake, where steam gently rises from the surface.',
    image: '/images/lake.jpg',
    links: [{ dest: 'school', time: 8 }], // 8 minutes back to school
  },
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


