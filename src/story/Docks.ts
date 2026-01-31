import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { publicChecks } from './Public'

const DOCKS_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  docks: {
    name: 'Docks',
    description: 'The harbour front. Cargo steamers, cranes, and warehouses line the wharf.',
    image: '/images/docks/docks.jpg',
    nightImage: '/images/docks/docks-night.jpg',

    mainLocation: true,
    links: [
      { dest: 'subway-docks', time: 2, label: 'Underground' },
      { dest: 'industrial-district', time: 10 },
    ],
    onTick: publicChecks(8, 17),
  },
}

Object.entries(DOCKS_DEFINITIONS).forEach(([id, def]) => registerLocation(id, def))
