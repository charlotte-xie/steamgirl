import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { publicChecks } from './Public'

// Location definitions for the Pier
const PIER_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  pier: {
    name: 'The Pier',
    description: 'A weathered wooden pier stretching out over the lake. The boards creak underfoot, and the water laps gently against the pilings. Fishing boats bob at their moorings, and the occasional steam-powered vessel chugs past in the distance.',
    image: '/images/pier/pier.jpg',
    nightImage: '/images/pier/pier-night.jpg',
    links: [
      { dest: 'lake', time: 10 },
    ],
    onTick: publicChecks(8, 18),
  },
}

// Register all location definitions when module loads
Object.entries(PIER_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
