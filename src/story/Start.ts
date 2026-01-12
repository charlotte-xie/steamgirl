import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { option, p, highlight } from '../model/Format'
import type { CardDefinition } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import '../story/Effects' // Register effect definitions
import '../story/Lodgings' // Register lodgings scripts

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
  },

  whatNow: (g: Game) => {
    g.add(p('You have a room booked in the ', highlight('backstreets', '#fbbf24', 'Not the most prestigious part of the city, but its the best we could afford.')," area. Might be a good idea to check it out first."))
    .add("It's tempting to explore the city and get to know your new home. You could explore yourself and find your way to your room. Or there is a guided tour of the city that you could take for about an hour, which ends in the backstreets.")
    .addQuest('find-lodgings', {})
    .add(option('startExploring', {}, 'Explore'))
    .add(option('tourCity', {}, 'Tour the City'))
  },
  
  startExploring: (g: Game) => {
    g.add('You decide to start your exploration at the station. The world is at your feet!')
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

// Register the quest definition
registerCardDefinition('find-lodgings', findLodgingsQuest)

// Register all start scripts when module loads
makeScripts(startScripts)
