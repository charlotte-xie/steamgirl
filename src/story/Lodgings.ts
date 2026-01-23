import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { registerNPC } from '../model/NPC'
import { makeScripts } from '../model/Scripts'
import { option} from '../model/Format'

registerNPC('landlord', {
  name: 'Landlord',
  description: 'A weathered man with the tired eyes of someone who\'s managed properties in the backstreets for too long. His clothes are serviceable but worn, and he moves with the deliberate pace of someone conserving energy. Despite his gruff exterior, there\'s a hint of kindness in his manner—he\'s seen countless tenants come and go, and he knows how to spot the ones who\'ll cause trouble versus those who just need a place to rest their head.',
  image: '/images/npcs/Landlord.jpg',
  speechColor: '#b895ae',
})

// Location definitions for the player's lodgings
const LODGINGS_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  bedroom: {
    name: 'Bedroom',
    description: 'Your small but comfortable room in the backstreets.',
    image: '/images/room.jpg',
    nightImage: '/images/room-night.jpg',
    secret: true, // Undiscovered until after initial "Go to Lodgings" / landlord intro; then appears as a Place in nav
    links: [
      { dest: 'bathroom', time: 1 },
      { dest: 'backstreets', time: 2, label: 'Leave for Backstreets' },
    ],
    activities: [
      {
        name: 'Nap',
        symbol: 'z',
        script: (g: Game, _params: {}) => {
          g.add('You lie down on your bed for a brief nap. The steady hum of the building\'s steam pipes lulls you into a light sleep.')
          g.timeLapse(30)
          g.player.timers.set('lastNap', g.time)
        },
      },
      {
        name: 'Sleep',
        symbol: 'zz',
        condition: (g: Game) => g.hourOfDay >= 21,
        script: (g: Game, _params: {}) => {
          const currentDate = g.date
          const nextDay = new Date(currentDate)
          nextDay.setDate(nextDay.getDate() + 1)
          nextDay.setHours(7, 0, 0, 0)
          const secondsUntil7am = Math.floor((nextDay.getTime() - currentDate.getTime()) / 1000)
          g.add('You slip into bed and sleep soundly through the night. When you wake, the morning light filters through the window as steam pipes begin to hiss with the start of a new day.')
          g.run('timeLapse', { seconds: secondsUntil7am })
          g.player.timers.set('lastSleep', g.time)
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
          g.timeLapse(10)
          // Set timer to finish time (after timeLapse)
          g.player.timers.set('lastWash', g.time)
        },
      },
      {
        name: 'Relaxing Bath',
        script: (g: Game, _params: {}) => {
          g.add('You fill the tub with steaming hot water and sink into its warmth. The steam-powered heating coils keep the water at a perfect temperature. You close your eyes and let the stress of the day melt away.')
          g.timeLapse(60)
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
      g.timeLapse(2)
      g.run('move', { location: 'bedroom' })
    }
  },

  enterLodgingsPhase1: (g: Game, _params: {}) => {
    // Phase 1: Landlord greets on backstreet
    g.scene.npc = 'landlord'
    g.add('A weathered figure steps out from a doorway.')
    const npc = g.npc
    npc.say(`${g.player.name}, I presume? I'm your landlord. You're all paid up for two weeks. Let me show you around.`)
    g.timeLapse(5) // Walking to the building
    g.add(option('enterLodgingsPhase2', {}, 'Next'))
  },

  enterLodgingsPhase2: (g: Game, _params: {}) => {
    // Phase 2: Landlord shows bathroom — hide NPC image while showing rooms
    g.scene.hideNpcImage = true
    g.timeLapse(2)
    g.add('He leads you down the hallway.')
    const npc = g.npc
    npc.say("This is the bathroom - it's shared with the other tenants. Keep it clean, won't you?")
    g.run('move', { location: 'bathroom'})
    g.add(option('finishIntroduction', {}, 'Next'))
  },

  finishIntroduction: (g: Game, _params: {}) => {
    // Phase 3: Landlord hands over key — hide NPC image while showing rooms
    const bedroomLocation = g.getLocation('bedroom')
    g.timeLapse(3)
    g.run('move', { location: 'bedroom' })
    g.scene.hideNpcImage = true
    g.add('You follow your landlord to your room. It\'s a small room, but nice enough and all you need right now. He produces a brass key from his pocket and hands it to you.')
    const npc = g.npc
    npc.say("Here's your key. Enjoy your stay.")
    g.run('gainItem', { item: 'room-key', number: 1 , text: 'You now have a key to your room.'})
    g.addQuest('attend-university', {silent: true})

    // Mark bedroom as visited and discovered so it appears as a Place in nav from backstreets
    bedroomLocation.numVisits++
    bedroomLocation.discovered = true
  },
}

// Register all lodgings scripts when module loads
makeScripts(lodgingsScripts)

// Register all location definitions when module loads
Object.entries(LODGINGS_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
