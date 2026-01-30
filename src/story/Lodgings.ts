import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { registerNPC } from '../model/NPC'
import { makeScripts } from '../model/Scripts'
import { text, say, scene, scenes, move, time, hideNpcImage, addItem, addQuest, learnNpcName, discoverLocation } from '../model/ScriptDSL'
import { takeWash, freshenUp, applyRelaxation } from './Effects'
import { bedActivity } from './Sleep'

registerNPC('landlord', {
  name: 'Gerald Moss',
  uname: 'landlord',
  description: 'A weathered man with the tired eyes of someone who\'s managed properties in the backstreets for too long. His clothes are serviceable but worn, and he moves with the deliberate pace of someone conserving energy. Despite his gruff exterior, there\'s a hint of kindness in his manner—he\'s seen countless tenants come and go, and he knows how to spot the ones who\'ll cause trouble versus those who just need a place to rest their head.',
  image: '/images/npcs/Landlord.jpg',
  speechColor: '#b895ae',
  scripts: {
    showAround: scenes(
      // Scene 1: Landlord greets on backstreet and introduces himself
      scene(
        text('A weathered figure steps out from a doorway.'),
        say("{pc}, I presume? Gerald Moss—I'm your landlord. Pleasure to meet you. You're all paid up for two weeks. Let me show you around."),
        learnNpcName(),
        time(5),
      ),
      // Scene 2: Landlord leads you into the building
      scene(
        hideNpcImage(),
        time(1),
        move('stairwell'),
        discoverLocation('stairwell'),
        text('He leads you through a narrow doorway and into the building. The stairwell is dimly lit by gas lamps, the walls lined with faded wallpaper. The smell of coal smoke and old wood fills the air.'),
        say("Mind your step on these stairs. The third one creaks something awful."),
      ),
      // Scene 3: Landlord shows bathroom
      scene(
        time(2),
        text('He leads you down the hallway on the first floor.'),
        say("This is the bathroom - it's shared with the other tenants. Keep it clean, won't you?"),
        move('bathroom'),
      ),
      // Scene 4: Landlord shows bedroom and hands over key
      scene(
        time(3),
        move('bedroom'),
        text("You follow your landlord to your room. It's a small room, but nice enough and all you need right now. He produces a brass key from his pocket and hands it to you."),
        say("Here's your key. Enjoy your stay."),
        addItem('room-key'),
        addQuest('attend-university', { silent: true }),
      ),
    ),
  },
})

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
      { dest: 'backstreets', time: 1, label: 'Exit to Backstreets' },
    ],
  },
  bedroom: {
    name: 'Bedroom',
    description: 'Your small but comfortable room in the backstreets.',
    image: '/images/room.jpg',
    nightImage: '/images/room-night.jpg',
    secret: true, // Undiscovered until after initial "Go to Lodgings" / landlord intro; then appears as a Place in nav
    links: [
      { dest: 'bathroom', time: 1 },
      { dest: 'stairwell', time: 1, label: 'Exit to Stairwell' },
    ],
    activities: [
      bedActivity(),
    ],
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
