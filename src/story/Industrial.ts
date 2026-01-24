import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'

// Location definitions for the Industrial District
const INDUSTRIAL_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  'industrial-district': {
    name: 'Industrial District',
    description: 'The beating heart of Aetheria\'s industry. Towering smokestacks belch steam and smoke into the sky, while the constant clang of machinery echoes through the soot-stained streets. Workers in overalls hurry between factories, their faces blackened with coal dust.',
    image: '/images/industry/industrial.jpg',
    mainLocation: true,
    links: [
      { dest: 'docks', time: 10 },
      { dest: 'factory', time: 3 },
      { dest: 'warehouse', time: 3 },
      { dest: 'pipeworks', time: 5 },
    ],
  },
  factory: {
    name: 'Factory',
    description: 'A massive brick building filled with the rhythmic pounding of steam-powered machinery. Gears turn overhead, pistons pump, and workers tend to the great mechanical looms and presses that produce Aetheria\'s goods.',
    image: '/images/industry/factory.jpg',
    links: [
      { dest: 'industrial-district', time: 3 },
    ],
  },
  warehouse: {
    name: 'Warehouse',
    description: 'A cavernous storage facility stacked high with crates and barrels. The air is thick with dust and the smell of packing materials. Mechanical lifts whir and clank as workers load and unload cargo.',
    image: '/images/industry/warehouse.jpg',
    links: [
      { dest: 'industrial-district', time: 3 },
    ],
  },
  pipeworks: {
    name: 'Pipeworks',
    description: 'A labyrinth of pipes, valves, and pressure gauges that distribute steam power throughout the district. The air is hot and humid, filled with the hiss of escaping steam and the drip of condensation.',
    image: '/images/industry/pipeworks.jpg',
    links: [
      { dest: 'industrial-district', time: 5 },
    ],
  },
}

// Register all location definitions when module loads
Object.entries(INDUSTRIAL_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
