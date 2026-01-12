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
    nightImage: '/images/room-night.jpg',
    links: [{ dest: 'bathroom', time: 1 }], // 1 minute to bathroom
    activities: [
      {
        name: 'Sleep',
        symbol: 'zz',
        script: (g: Game, _params: {}) => {
          // Check current time (game.time is unix timestamp in seconds)
          const currentDate = new Date(g.time * 1000)
          const currentHour = currentDate.getHours()
          const isAfter9pm = currentHour >= 21
          
          if (isAfter9pm) {
            // Sleep until 7am the next day
            const nextDay = new Date(currentDate)
            nextDay.setDate(nextDay.getDate() + 1)
            nextDay.setHours(7, 0, 0, 0)
            
            const secondsUntil7am = Math.floor((nextDay.getTime() - currentDate.getTime()) / 1000)
            g.add('You slip into bed and sleep soundly through the night. When you wake, the morning light filters through the window as steam pipes begin to hiss with the start of a new day.')
            g.run('timeLapse', { seconds: secondsUntil7am })
            // Set timer to finish time (after timeLapse)
            g.player.timers.set('lastSleep', g.time)
          } else {
            // Take a 30 minute nap
            g.add('You lie down on your bed for a brief nap. The steady hum of the building\'s steam pipes lulls you into a light sleep.')
            g.run('timeLapse', { minutes: 30 })
            // Set timer to finish time (after timeLapse)
            g.player.timers.set('lastNap', g.time)
          }
        },
      },
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
    activities: [
      {
        name: 'Take Shower',
        script: (g: Game, _params: {}) => {
          g.add('You step into the shower. The warm steam-powered water cascades over you, washing away the grime of the city. The brass fixtures gleam as steam rises around you.')
          g.run('timeLapse', { minutes: 10 })
          // Set timer to finish time (after timeLapse)
          g.player.timers.set('lastWash', g.time)
        },
      },
      {
        name: 'Relaxing Bath',
        script: (g: Game, _params: {}) => {
          g.add('You fill the tub with steaming hot water and sink into its warmth. The steam-powered heating coils keep the water at a perfect temperature. You close your eyes and let the stress of the day melt away.')
          g.run('timeLapse', { minutes: 60 })
          // Set timer to finish time (after timeLapse)
          g.player.timers.set('lastWash', g.time)
        },
      },
    ],
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
    g.add(option('finishIntroduction', {}, 'Next'))
  },

  finishIntroduction: (g: Game, _params: {}) => {
    // Phase 3: Landlord hands over key
    const bedroomLocation = g.getLocation('bedroom')
    g.run('timeLapse', { minutes: 3 })
    g.run('move', { location: 'bedroom' })
    g.add('You follow your landlord to your room. He produces a brass key from his pocket and hands it to you. "Here\'s your key. Welcome home."')
    g.run('gainItem', { item: 'room-key', number: 1 , text: 'You now have a key to your room.'})
    
    // Mark bedroom as visited to prevent this sequence from running again
    bedroomLocation.numVisits++
  },
}

// Register all lodgings scripts when module loads
makeScripts(lodgingsScripts)
