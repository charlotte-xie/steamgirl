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
  script: Script
  condition?: Script
  label?: string
}

// Location definitions as a plain object for better ergonomics and editing
// These are the standard locations. Others might be added elsewhere
const LOCATION_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  station: {
    name: 'Main Station',
    description: 'The bustling main railway station, filled with travelers.',
    image: '/images/station.jpg',
    links: [{ dest: 'default', time: 10 }, { dest: 'backstreets', time: 10 }], // 10 minutes to city, 10 minutes to backstreets
    activities: [
      {
        name: 'Explore',
        script: (g: Game, _params: {}) => {
          // Advance time by 10 minutes (600 seconds)
          g.run('timeLapse', { seconds: 10 * 60 })
          
          // Random encounters for the station
          const encounters = [
            'A steam whistle echoes through the air as a train arrives at the platform. Passengers disembark, their luggage clinking with brass fittings and gears.',
            'A ticket vendor with mechanical enhancements calls out destinations, her voice amplified by a small brass mechanism at her throat. Travelers queue patiently before her window.',
            'Through the steam, you notice a group of porters loading luggage onto a train car. Clockwork assistants help with the heavier trunks, their gears whirring as they work.',
            'An announcement automaton clicks to life, its brass voicebox broadcasting the next departure times. The mechanical voice echoes through the station halls.',
            'You watch as a steam-powered baggage cart trundles past, its wheels clicking rhythmically on the platform stones. The driver tips his cap as he passes.',
            'A family with elaborate mechanical travel cases waits on a bench. The children\'s toys—tiny steam-powered contraptions—whir and click as they play.',
            'A station worker adjusts the valves on an overhead steam pipe, releasing a controlled burst of vapour. The warm, oily mist briefly obscures the platform.',
            'The station clock, a massive brass mechanism with visible gears, chimes the hour. Travelers check their own pocket watches, synchronizing time before their journeys.',
            'A conductor in a pressed uniform checks tickets with a mechanical scanner. The device clicks and whirs as it validates each passenger\'s passage.',
            'You spot a news vendor selling papers from a brass-plated cart. Steam rises from a small boiler keeping the papers warm, and mechanical print headlines flash on a tiny display.',
          ]
          
          const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)]
          
          g.add([
            'You explore the station and observe your surroundings.',
            randomEncounter
          ])
        },
      },
    ],
  },
  default: {
    name: 'City Centre',
    description: 'The heart of the city, where commerce and culture meet.',
    image: '/images/city.jpg',
    links: [{ dest: 'station', time: 10 }, { dest: 'backstreets', time: 5 }, { dest: 'school', time: 5 }, { dest: 'market', time: 3 }], // 10 minutes back to station, 5 minutes to backstreets, 5 minutes to school, 3 minutes to market
  },
  backstreets: {
    name: 'Backstreets',
    description: 'The winding alleys and hidden passages of the city, where secrets lurk in the shadows.',
    image: '/images/backstreet.jpg',
    links: [{ dest: 'default', time: 5 }, { dest: 'market', time: 5 }], // 5 minutes to city centre, 5 minutes to market
    activities: [
      {
        name: 'Explore',
        script: (g: Game, _params: {}) => {
          // Advance time by 10 minutes (600 seconds)
          g.run('timeLapse', { seconds: 10 * 60 })
          
          // Random encounters for the backstreets
          const encounters = [
            'Shadows shift in the alleys ahead, and you catch a glimpse of someone—or something—ducking around a corner. The sound of mechanical whirring fades quickly into the darkness.',
            'A figure with a mechanical arm emerges from a doorway, casting a wary glance in your direction before melting back into the shadows. The smell of oil and coal hangs heavy in the air.',
            'You notice a stack of discarded gears and brass fittings in a corner, still warm to the touch. Someone has been tinkering here recently, leaving only traces of their work.',
            'A steam pipe hisses from above, releasing a cloud of vapour that obscures the narrow passage ahead. Through the mist, you hear muffled voices and the click of mechanical parts.',
            'An alley cat with a small brass enhancement on its collar watches you from a windowsill. Its mechanical eye gleams in the dim light, tracking your movements with unnerving precision.',
            'You spot a small mechanical device half-hidden in the gutter—a spyglass or listening device, perhaps. It whirs faintly, its gears still turning despite the grime.',
            'The sound of a deal being made echoes from a nearby doorway. The conversation is hushed, punctuated by the clink of brass coins and the whir of a mechanical lock.',
            'A maintenance access panel stands ajar, steam escaping in thin wisps. Someone has clearly tampered with the city\'s infrastructure here, leaving their mark in the machinery.',
            'Graffiti etched into the brickwork shows crude mechanical diagrams—plans or warnings, perhaps. The symbols are mysterious, a language known only to the backstreets\' residents.',
            'You notice a hidden passage between buildings, marked only by a small brass marker. The entrance is obscured by steam and shadow, leading to unknown depths.',
          ]
          
          const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)]
          
          g.add([
            'You explore the backstreets.',
            randomEncounter
          ])
        },
      },
    ],
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
    links: [{ dest: 'school', time: 8 }, { dest: 'market', time: 5 }], // 8 minutes back to school, 5 minutes to market
  },
  market: {
    name: 'Market',
    image: '/images/market.jpg',
    description: 'A bustling marketplace filled with exotic goods and mechanical wonders.',
    links: [{ dest: 'lake', time: 5 }, { dest: 'backstreets', time: 5 }, { dest: 'default', time: 3 }], // 5 minutes to lake, 5 minutes to backstreets, 3 minutes to city centre
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


