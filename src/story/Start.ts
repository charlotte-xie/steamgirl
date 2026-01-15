import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { option, p, highlight } from '../model/Format'
import type { CardDefinition } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { NPC, registerNPC } from '../model/NPC'
import '../story/Effects' // Register effect definitions
import '../story/Lodgings' // Register lodgings scripts

// Register NPCs that appear at the station
registerNPC('automaton-greeter', {
  name: 'Automaton Greeter',
  description: 'A brass-plated automaton that greets visitors to the station.',
  generate: (_game: Game, npc: NPC) => {
    // Set initial location to station
    npc.location = 'station'
  },
  onApproach: (game: Game) => {
    game.add('The automaton greeter clicks and whirs, its brass voicebox producing a mechanical greeting: "Welcome to Ironspark Terminus. How may I assist you today?"')
  },
})

registerNPC('commuter', {
  name: 'Commuter',
  description: 'A regular commuter waiting at the station.',
  // generate is optional - using default NPC instance
  onApproach: (game: Game) => {
    game.add('The commuter looks up from their pocket watch, giving you a brief nod before returning their attention to the station clock.')
  },
  onMove: (game: Game) => {
    const npc = game.getNPC('commuter')
    // Update location based on schedule when hour changes
    const schedule: [number, number, string][] = [
      [6, 7, 'station'],    // Morning rush hour
      [17, 18, 'default'],    // Heading home
      [18, 19, 'station'],   // Evening rush hour
    ]
    npc.followSchedule(game, schedule)
    // Update npcsPresent after NPC moves
    game.updateNPCsPresent()
  },
})

export const startScripts = {
  init: (g: Game) => {
    // Set player name
    g.player.name = 'Elise'
    
    // Set base stats to 30
    g.player.basestats.set('Agility', 30)
    g.player.basestats.set('Perception', 30)
    g.player.basestats.set('Wits', 30)
    g.player.basestats.set('Charm', 30)
    g.player.basestats.set('Willpower', 30)
    g.player.basestats.set('Strength', 30)
    
    // Set initial meter values (meters are now part of basestats)
    g.player.basestats.set('Energy', 80)
    g.player.basestats.set('Mood', 70)
    g.player.basestats.set('Composure', 50)
    // Arousal, Stress, Pain remain at 0 (initialized in constructor)
    
    // Recalculate stats after setting base stats
    g.run('calcStats', {})
    
    // Add initial items
    g.run('gainItem', { item: 'crown', number: 120 })
    g.run('gainItem', { item: 'pocket-watch', number: 1 })
    g.run('gainItem', { item: 'sweet-wine', number: 3 })
    g.run('gainItem', { item: 'acceptance-letter', number: 1 })
    g.run('gainItem', { item: 'magic-potion', number: 1 })
    g.run('gainItem', { item: 'fun-juice', number: 1 })
    
    // Generate NPCs that should be present at the start
    g.getNPC('automaton-greeter')
    g.getNPC('commuter')
    
    // Update npcsPresent after generating NPCs
    g.updateNPCsPresent()
    
    // Add initial quest
    g.addQuest('attend-university', {silent: true})
    
    // Move on to start script
    g.run('start', {})
  },

  start: (g: Game) => {
    g.add('The train exhales a long, wet hiss as it comes to a halt at the platform.')
      .add(p('You have travelled across the whole continent, and are finally here, in the city of ', highlight('Aetheria', '#fbbf24', 'Aetheria: The great steam-powered city of brass and gears, where mechanical marvels and Victorian elegance meet in a symphony of innovation and tradition.'), '.'))
      .add(option('startPlatform', {}, 'Step onto Platform'))
      .add(option('finishIntroduction', {}, 'Skip Intro'))
  },

  startPlatform: (g: Game) => {
    g
    .add('You step onto the platform of Ironspark Terminus.')
    .add('Coal smoke curls around your ankles like fingers. The station cathedral looms above: brass vertebrae, glass skin revealing grinding intestines of gear and piston. Somewhere a valve releases steam that tastes faintly of iron and skin.')
    .add(p('You are here. Alone. The ', highlight('acceptance letter', '#fbbf24', 'You managed to get accepted by the most prestigious University in Aetheria! A remarkable achievement for a country girl like you.'), ' pressed against your is your only connection to this place.'))
    .add(option('whatNow', {}, 'What Now?'))
    // add find-lodgings tutorial quest
    .addQuest('find-lodgings', {})
  },

  whatNow: (g: Game) => {
    g.add(p('You have a room booked in the ', highlight('backstreets', '#fbbf24', 'Not the most prestigious part of the city, but its the best we could afford.')," area. Might be a good idea to check it out first."))
    .add("It's tempting to explore the city and get to know your new home. You could explore yourself and find your way to your room. Or there is a guided tour of the city that you could take for about an hour, which ends in the backstreets.")
    .add(option('startExploring', {}, 'Explore'))
    .add(option('tourCity', {}, 'Tour the City'))
  },
  
  startExploring: (g: Game) => {
    g.add('The world is at your feet!')
    // Player can now navigate and explore from the station
  },
  
  tourCity: (g: Game) => {
    g.add('You decide to take a guided tour of the city, starting from the station where you arrived. Your guide approaches and offers to show you the key locations of Aetheria.')
      .run('go', { location: 'default', minutes: 15 })
      .add('The City Centre spreads before you in all its glory. Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city, and everywhere you look, there are wonders of engineering and artistry. This is Aetheria: awe-inspiring and magnificent.')
      .add(option('tourUniversity', {}, 'Continue the Tour'))
  },
  
  tourUniversity: (g: Game) => {
    g.run('go', { location: 'school', minutes: 15 })
      .add('The University stands as a testament to knowledge and innovation. Its grand brass doors open to reveal halls where you will study the mechanical arts, steam engineering, and the mysteries of clockwork. This is where your education begins, where you\'ll learn the skills that will shape your future in Aetheria.')
      .add(option('tourLake', {}, 'Continue the Tour'))
  },
  
  tourLake: (g: Game) => {
    g.run('go', { location: 'lake', minutes: 18 })
      .add('The Lake offers a peaceful respite from the mechanical bustle of the city. Steam gently rises from the surface, creating a serene mist. Here you can find moments of calm, a place to relax and reflect amidst the constant motion of Aetheria. It\'s a sanctuary where the mechanical and natural worlds blend beautifully.')
      .add(option('tourMarket', {}, 'Continue the Tour'))
  },
  
  tourMarket: (g: Game) => {
    g.run('go', { location: 'market', minutes: 15 })
      .add('The Market pulses with energy and excitement. Vendors display exotic mechanical trinkets, glowing brass devices, and intricate clockwork wonders. The air is filled with the sounds of haggling, the clinking of gears, and the hiss of steam. Every stall promises something fascinating—from precision tools to mysterious contraptions. This is where adventure and opportunity meet.')
      .add('The market throbs. Vendors call in low, hungry voices. Brass toys whir and caress the air; clockwork serpents coil around wrists for sale. Fingers brush you as you pass — accidental, deliberate, promising.')
      .add(option('tourBackstreets', {}, 'Continue the Tour'))
  },
  
  tourBackstreets: (g: Game) => {
    g.run('go', { location: 'backstreets', minutes: 15 })
    .add('The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.')
    .add('Your room waits on the third floor')    // Tour complete - they can now explore from backstreets
  },
}

// Register the find-lodgings tutorial quest
export const findLodgingsQuest: CardDefinition = {
  name: 'Find Lodgings',
  description: 'Check into your lodgings in the backstreets.',
  type: 'Quest',
  afterUpdate: (game: Game, _params: {}) => {
    // Check if player is in bedroom (lodgings)
    if (game.currentLocation === 'bedroom') {
      game.completeQuest('find-lodgings')
    }
  },
}

// Register the find-lodgings quest definition
registerCardDefinition('find-lodgings', findLodgingsQuest)

// Register the attend-university quest definition
export const attendUniversityQuest: CardDefinition = {
  name: 'Attend University',
  description: 'Important! Be at the university between 8-10am on 6th Jan for Induction.',
  type: 'Quest',
  afterUpdate: (game: Game, _params: {}) => {
    const quest = game.player.cards.find(card => card.id === 'attend-university')
    if (!quest || quest.completed || quest.failed) {
      return // Already completed or failed
    }
    
    // Check if it's past 10am on Jan 6th, 1902
    const currentDate = new Date(game.time * 1000)
    const inductionDate = new Date(1902, 0, 6, 10, 0, 0) // Jan 6, 1902, 10:00am
    
    if (currentDate >= inductionDate) {
      // Time has passed - check if quest was completed
      const hallwayLocation = game.getLocation('hallway')
      if (!hallwayLocation.discovered) {
        // Player didn't attend - mark as failed
        quest.failed = true
        game.add({ type: 'text', text: 'You failed to attend University induction.... this could be bad....', color: '#ef4444' })
      }
    }
  },
}

// Register the quest definition
registerCardDefinition('attend-university', attendUniversityQuest)

// Register all start scripts when module loads
makeScripts(startScripts)
