import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { makeScripts } from '../model/Scripts'
import { option } from '../model/Format'

// Location definitions for the player's lodgings
export const LODGINGS_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  bedroom: {
    name: 'Bedroom',
    description: 'Your small but comfortable room in the backstreets.',
    image: '/images/room.jpg',
    links: [{ dest: 'bathroom', time: 1 }], // 1 minute to bathroom
    activities: [
      {
        name: 'Leave',
        symbol: 'X',
        script: (g: Game, _params: {}) => {
          g.run('timeLapse', { minutes: 2 })
          g.run('move', { location: 'backstreets' })
        },
      },
    ],
  },
  bathroom: {
    name: 'Bathroom',
    description: 'A small shared bathroom with steam-powered fixtures.',
    image: '/images/bathroom.jpg',
    links: [{ dest: 'bedroom', time: 1 }], // 1 minute back to bedroom
  },
}

// Scripts for lodgings interactions
export const lodgingsScripts = {
  enterLodgings: (g: Game, _params: {}) => {
    const bedroomLocation = g.getLocation('bedroom')
    const isFirstVisit = bedroomLocation.numVisits === 0
    
    if (isFirstVisit) {
      // First-time lodgings sequence - start phase 1
      g.run('enterLodgingsPhase1')
    } else {
      // Normal movement to lodgings
      g.run('timeLapse', { seconds: 2 * 60 })
      g.run('move', { location: 'bedroom' })
    }
  },

  enterLodgingsPhase1: (g: Game, _params: {}) => {
    // Phase 1: Landlord greets on backstreet
    g.add(`A weathered figure steps out from a doorway. "${g.player.name}, I presume? I'm your landlord. You're all paid up for two weeks. Let me show you around."`)
    g.run('timeLapse', { minutes: 5 }) // Walking to the building
    g.add(option('enterLodgingsPhase2', {}, 'Next'))
  },

  enterLodgingsPhase2: (g: Game, _params: {}) => {
    // Phase 2: Landlord shows bathroom
    g.run('timeLapse', { minutes: 2 })
    g.add('He leads you down the hallway. "This is the bathroom - it\'s shared with the other tenants. Keep it clean, won\'t you?"')
    g.run('move', { location: 'bathroom'})
    g.add(option('enterLodgingsPhase3', {}, 'Next'))
  },

  enterLodgingsPhase3: (g: Game, _params: {}) => {
    // Phase 3: Landlord hands over key
    const bedroomLocation = g.getLocation('bedroom')
    g.run('timeLapse', { minutes: 3 })
    g.run('move', { location: 'bedroom' })
    g.add('You follow him to your room. He produces a brass key from his pocket and hands it to you. "Here\'s your key. Welcome home."')
    g.run('gainItem', { item: 'room-key', number: 1 , text: 'You now have a key to your room.'})
    
    // Mark bedroom as visited to prevent this sequence from running again
    bedroomLocation.numVisits++
  },
}

// Register all lodgings scripts when module loads
makeScripts(lodgingsScripts)
