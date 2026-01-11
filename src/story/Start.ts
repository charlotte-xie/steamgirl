import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { option } from '../model/Format'

export const startScripts = {
  start: (g: Game) => {
    g.player.name = 'Elise'
    g.add('Steam hisses as the train grinds to a halt.')
      .add('You have travelled across the whole continent, and are finally here, in the city of Aetheria.')
      .add(option('platform', {}, 'Step onto Platform'))
  },

  platform: (g: Game) => {
    g
    .add('You step onto the platform of Ironspark Terminus.')
    .add('Coal smoke curls around your ankles like fingers. The station cathedral looms above: brass vertebrae, glass skin revealing grinding intestines of gear and piston. Somewhere a valve releases steam that tastes faintly of iron and skin.')
    .add('You are here. Alone. The acceptance letter pressed against your is your only connection to this place.')
    .add(option('startExploring', {}, 'Start Exploring'))
    .add(option('tourCity', {}, 'Tour the City'))
  },
  
  startExploring: (g: Game) => {
    g.add('You decide to start your exploration at the station. The world is at your feet!')
    // Player can now navigate and explore from the station
  },
  
  tourCity: (g: Game) => {
    g.add('You decide to take a guided tour of the city, starting from the station where you arrived. Your guide approaches and offers to show you the key locations of Aetheria.')
      .run('go', { location: 'default', time: 15 })
      .add('The City Centre spreads before you in all its glory. Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city, and everywhere you look, there are wonders of engineering and artistry. This is Aetheria: awe-inspiring and magnificent.')
      .add(option('tourUniversity', {}, 'Continue the Tour'))
  },
  
  tourUniversity: (g: Game) => {
    g.run('go', { location: 'school', time: 15 })
      .add('The University stands as a testament to knowledge and innovation. Its grand brass doors open to reveal halls where you will study the mechanical arts, steam engineering, and the mysteries of clockwork. This is where your education begins, where you\'ll learn the skills that will shape your future in Aetheria.')
      .add(option('tourLake', {}, 'Continue the Tour'))
  },
  
  tourLake: (g: Game) => {
    g.run('go', { location: 'lake', time: 18 })
      .add('The Lake offers a peaceful respite from the mechanical bustle of the city. Steam gently rises from the surface, creating a serene mist. Here you can find moments of calm, a place to relax and reflect amidst the constant motion of Aetheria. It\'s a sanctuary where the mechanical and natural worlds blend beautifully.')
      .add(option('tourMarket', {}, 'Continue the Tour'))
  },
  
  tourMarket: (g: Game) => {
    g.run('go', { location: 'market', time: 15 })
      .add('The Market pulses with energy and excitement. Vendors display exotic mechanical trinkets, glowing brass devices, and intricate clockwork wonders. The air is filled with the sounds of haggling, the clinking of gears, and the hiss of steam. Every stall promises something fascinating—from precision tools to mysterious contraptions. This is where adventure and opportunity meet.')
      .add('The market throbs. Vendors call in low, hungry voices. Brass toys whir and caress the air; clockwork serpents coil around wrists for sale. Fingers brush you as you pass — accidental, deliberate, promising.')
      .add(option('tourBackstreets', {}, 'Continue the Tour'))
  },
  
  tourBackstreets: (g: Game) => {
    g.run('go', { location: 'backstreets', time: 15 })
    .add('The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.')
    .add('Your room waits on the third floor')    // Tour complete - they can now explore from backstreets
  },
}

// Register all start scripts when module loads
makeScripts(startScripts)
