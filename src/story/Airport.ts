import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'

const AIRPORT_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  airport: {
    name: 'Airport',
    description: 'The airfield and dirigible station. Gantry cranes and mooring masts loom over the tarmac.',
    image: '/images/airport/airport.jpg',
    nightImage: '/images/airport/airport-night.jpg',
    mainLocation: true,
    links: [{ dest: 'subway-airport', time: 2, label: 'Underground' }],
  },
}

Object.entries(AIRPORT_DEFINITIONS).forEach(([id, def]) => registerLocation(id, def))
