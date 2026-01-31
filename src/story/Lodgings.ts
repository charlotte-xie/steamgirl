import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { makeScripts } from '../model/Scripts'
import { takeWash, freshenUp, applyRelaxation } from './Effects'
import { bedActivity } from './Sleep'

// Location definitions for the player's lodgings
const LODGINGS_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  stairwell: {
    name: 'Stairwell',
    description: 'The entrance stairwell of your lodgings. Gas lamps cast a warm glow on faded wallpaper, and the scent of coal smoke lingers in the air.',
    image: '/images/lodgings/stairwell.jpg',
    secret: true, // Discovered during landlord tour
    links: [
      { dest: 'bedroom', time: 1, label: 'Your Room' },
      { dest: 'bathroom', time: 1 },
      { dest: 'landlord-office', time: 1, label: 'Landlord\'s Office' },
      { dest: 'backstreets', time: 1, label: 'Exit to Backstreets' },
    ],
  },
  bedroom: {
    name: 'Bedroom',
    description: 'Your small but comfortable room in the backstreets.',
    image: '/images/room.jpg',
    nightImage: '/images/room-night.jpg',
    isBedroom: true,
    secret: true, // Undiscovered until after initial "Go to Lodgings" / landlord intro; then appears as a Place in nav
    links: [
      { dest: 'bathroom', time: 1 },
      { dest: 'stairwell', time: 1, label: 'Exit to Stairwell' },
    ],
    activities: [
      bedActivity(),
    ],
  },
  'landlord-office': {
    name: 'Landlord\'s Office',
    description: 'A cramped room off the stairwell, piled high with ledgers, rent receipts, and the accumulated paperwork of decades of tenancy management.',
    image: '/images/lodgings/office.webp',
    links: [
      { dest: 'stairwell', time: 1 },
    ],
    onArrive: (g: Game) => {
      const npc = g.npcs.get('landlord')
      if (!npc || npc.location !== 'landlord-office') {
        g.add('The office is empty. Gerald\'s chair is pushed back from the desk, a half-drunk cup of tea growing cold beside a stack of ledgers. A brass clock on the wall ticks steadily.')
      }
    },
  },
  bathroom: {
    name: 'Bathroom',
    description: 'A small shared bathroom with steam-powered fixtures.',
    image: '/images/bathroom.jpg',
    links: [
      { dest: 'bedroom', time: 1, label: 'Back to Your Room' },
      { dest: 'stairwell', time: 1 },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
      {
        name: 'Take Shower',
        script: (g: Game, _params: {}) => {
          g.add('You step into the shower. The warm steam-powered water cascades over you, washing away the grime of the city. The brass fixtures gleam as steam rises around you.')
          g.timeLapse(10)
          takeWash(g)
        },
      },
      {
        name: 'Relaxing Bath',
        script: (g: Game, _params: {}) => {
          g.add('You fill the tub with steaming hot water and sink into its warmth. The steam-powered heating coils keep the water at a perfect temperature. You close your eyes and let the stress of the day melt away.')
          g.timeLapse(60)
          takeWash(g)
          applyRelaxation(g, 60, 1.0)
        },
      },
    ],
  },
}

// Scripts for lodgings interactions
export const lodgingsScripts = {
  enterLodgings: (g: Game, _params: {}) => {
    const stairwellLocation = g.getLocation('stairwell')
    const isFirstVisit = !stairwellLocation.discovered

    if (isFirstVisit) {
      // First-time lodgings sequence - landlord shows you around
      g.scene.npc = 'landlord'
      g.run('interact', { script: 'showAround' })
      // Mark bedroom as visited and discovered so it appears as a Place in nav
      const bedroomLocation = g.getLocation('bedroom')
      bedroomLocation.numVisits++
      bedroomLocation.discovered = true
    } else {
      // Normal movement to stairwell
      g.timeLapse(1)
      g.run('move', { location: 'stairwell' })
    }
  },
}

// Register all lodgings scripts when module loads
makeScripts(lodgingsScripts)

// Register all location definitions when module loads
Object.entries(LODGINGS_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
