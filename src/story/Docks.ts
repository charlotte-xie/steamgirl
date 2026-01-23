import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'

const DOCKS_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  docks: {
    name: 'Docks',
    description: 'The harbour front. Cargo steamers, cranes, and warehouses line the wharf.',
    image: '/images/docks/docks.jpg',
    nightImage: '/images/docks/docks-night.jpg',

    mainLocation: true,
    links: [{ dest: 'subway-docks', time: 2, label: 'Underground' }],
  },
}

Object.entries(DOCKS_DEFINITIONS).forEach(([id, def]) => registerLocation(id, def))
