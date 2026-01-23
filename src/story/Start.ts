import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { option, p, highlight, speech } from '../model/Format'
import type { CardDefinition } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { NPC, registerNPC } from '../model/NPC'
import { discoverAllLocations } from '../story/Utility'
import '../story/Effects' // Register effect definitions
import '../story/Lodgings' // Register lodgings scripts

// Register NPCs that appear at the station
registerNPC('automaton-greeter', {
  name: 'Automaton Greeter',
  description: 'A meticulously crafted brass automaton, polished to a warm golden sheen. Its clockwork mechanisms whir and click with mechanical precision as it performs its duties. The optics in its head glow with a soft blue light, and its voicebox produces clear, if somewhat stilted, speech. Despite its mechanical nature, there\'s something almost endearing about its unwavering dedication to welcoming visitors to Ironspark Terminus.',
  image: '/images/npcs/Greeter.jpg',
  speechColor: '#a8d4f0',
  generate: (_game: Game, npc: NPC) => {
    // Set initial location to station
    npc.location = 'station'
  },
  onApproach: (game: Game) => {
    const npc = game.npc
    game.add('The automaton greeter clicks and whirs, its brass voicebox producing a mechanical greeting:')
    npc.say('Welcome to Ironspark Terminus. How may I assist you today?')
    npc.leaveOption('The automaton whirs softly as you depart.', 'Safe travels. May your gears never seize.', 'Say goodbye')
    game.addOption('greeterGetDirections', {}, 'Get directions')
    game.addOption('greeterFlirt', {}, 'Flirt')
  },
})

registerNPC('tour-guide', {
  name: 'Rob Hayes',
  description: 'A genial man with a warm smile and a well-worn guidebook tucked under his arm. His clothes are practical but neat, and he moves with the easy confidence of someone who knows every street and alley of Aetheria. He takes genuine pleasure in showing newcomers around, and his enthusiasm for the city is infectious. The brass badge pinned to his coat marks him as an official tour guide.',
  image: '/images/npcs/TourGuide.jpg',
  speechColor: '#94a3b8',
  generate: (_game: Game, npc: NPC) => {
    npc.location = 'station'
  },
  onMove: (game: Game) => {
    const npc = game.getNPC('tour-guide')
    npc.followSchedule(game, [
      [9, 18, 'station'],
    ])
  },
  onApproach: (game: Game) => {
    const npc = game.npc
    game.add('A man with a well-worn guidebook catches your eye and steps over with a warm smile.')
    npc.say('Rob Hayes. I lead tours of the city for new arrivals. It takes about an hour and ends in the backstreets—handy if that\'s where you\'re headed. Fancy it?')
    game.addOption('tourCity', {}, 'Accept')
    npc.leaveOption('You politely decline the invitation.', "Whenever you're ready. I'm usually here at the station.", 'Decline')
  },
})

registerNPC('commuter', {
  name: 'Commuter',
  description: 'A typical city dweller, dressed in practical work clothes and carrying a worn leather satchel. They check their pocket watch frequently, a nervous habit born of years of relying on the city\'s steam-powered transit system. Their attention is fixed on the station clock, and they seem lost in their own thoughts, part of the endless flow of people that keeps Aetheria\'s gears turning.',
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
  },
})

export const startScripts = {
  init: (g: Game) => {
    const pc=g.player

    // Set player name
    pc.name = 'Elise'
    
    // Set base stats to 30
    pc.basestats.set('Agility', 30)
    pc.basestats.set('Perception', 30)
    pc.basestats.set('Wits', 30)
    pc.basestats.set('Charm', 30)
    pc.basestats.set('Willpower', 30)
    pc.basestats.set('Strength', 30)
    
    // Set initial meter values (meters are now part of basestats)
    pc.basestats.set('Energy', 80)
    pc.basestats.set('Mood', 70)
    pc.basestats.set('Composure', 50)
    // Arousal, Stress, Pain remain at 0 (initialized in constructor)
    
    // Set initial skill values
    pc.basestats.set('Mechanics', 20)

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
    g.getNPC('tour-guide')
    g.getNPC('commuter')
    
    // Update npcsPresent after generating NPCs
    g.updateNPCsPresent()

    
    // Move on to start script
    g.run('start', {})
  },

  start: (g: Game) => {
    g.add('The train exhales a long, wet hiss as it comes to a halt at the platform.')
      .add(p('You have travelled across the whole continent, and are finally here, in the city of ', highlight('Aetheria', '#fbbf24', 'Aetheria: The great steam-powered city of brass and gears, where mechanical marvels and Victorian elegance meet in a symphony of innovation and tradition.'), '.'))
      .add(option('startPlatform', {}, 'Step onto Platform'))
      .add(option('skipIntro', {}, 'Skip Intro'))
  },

  /** Skip intro: discover all locations for debug access, then jump to bedroom with key and goals. */
  skipIntro: (g: Game) => {
    discoverAllLocations(g)
    g.timeLapse(3)
    g.run('move', { location: 'bedroom' })
    g.scene.hideNpcImage = true
    g.add('You skip ahead to your room in the backstreets. Your key is in your hand; your goals, ahead.')
    g.run('gainItem', { item: 'room-key', number: 1, text: 'You have your room key.' })
    g.addQuest('attend-university', { silent: true })
    const bedroom = g.getLocation('bedroom')
    bedroom.numVisits++
    bedroom.discovered = true
  },

  startPlatform: (g: Game) => {
    g
    .add('You step onto the platform of Ironspark Terminus.')
    .add('Coal smoke curls around your ankles like fingers. The station cathedral looms above: brass vertebrae, glass skin revealing grinding intestines of gear and piston. Somewhere a valve releases steam that tastes faintly of iron and skin.')
    .add(p('You are here. Alone. The ', highlight('acceptance letter', '#fbbf24', 'You managed to get accepted by the most prestigious University in Aetheria! A remarkable achievement for a country girl like you.'), ' pressed against your is your only connection to this place.'))
    .add(option('whatNow', {}, 'What Now?'))
    g.addQuest('attend-university')

  },

  whatNow: (g: Game) => {
    g.add(p('You have a room booked in the ', highlight('backstreets', '#fbbf24', 'Not the most prestigious part of the city, but its the best we could afford.')," area. Might be a good idea to check it out first."))
    // add find-lodgings tutorial quest
    g.addQuest('find-lodgings', {})
    g.add("You could explore yourself and find your way to your room. Or the tour guide offers city tours that end in the backstreets - you could ask him?")
  },


  greeterFlirt: (g: Game) => {
    const success = g.player.skillTest('Flirtation', 0)
    if (success) {
      g.add('The automaton\'s gears stutter. Its optics flicker.')
      const npc = g.npc
      npc.say('I am not programmed for such... input. My valves are operating at 102% capacity. How curious. Would you like a timetable?')
      g.run('addStat', { stat: 'Flirtation', change: 1, chance: 1, max: 5 })
    } else {
      g.add('The automaton inclines its head with mechanical precision.')
      const npc = g.npc
      npc.say('I am a hospitality unit. Is there something specific you require?')
    }
  },

  greeterGetDirections: (g: Game) => {
    g.add('The automaton gestures with a brass limb.')
    const npc = g.npc
    npc.say('The city centre lies straight ahead—follow the main concourse. It is a short walk.')
    g.add('It ticks thoughtfully.')
    npc.say('I am also told there is a serene lake to the east. The university overlooks it, and one can reach it from the market district. Steam rises from the surface—rather picturesque.')
    g.run('discoverLocation', { location: 'lake' })
  },

  greeterEndScene: (_g: Game, _params: {}) => {
    // No-op: takeAction has already cleared the scene; this just closes the overlay
  },
  
  tourCity: (g: Game) => {
    g.scene.npc = 'tour-guide'
    g.scene.hideNpcImage = true // Hide NPC image because we're showing off location scenery
    g.add('You set off with Rob.')
    g.run('go', { location: 'default', minutes: 15 })
    const npc = g.npc
    npc.say('Here we are—the heart of Aetheria. Magnificent, isn\'t it?')
    g.add('Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city.')
    g.add(option('tourUniversity', {}, 'Continue the Tour'))
  },

  tourUniversity: (g: Game) => {
    g.run('go', { location: 'school', minutes: 15 })
    const npc = g.npc
    npc.say('The University - you\'ll be studying there you say? A fine institution.')
    g.add('Its grand brass doors and halls where you will learn the mechanical arts, steam engineering, and the mysteries of clockwork.')
    npc.say('There\'s a subway here - efficient way to get around the city though it costs 3 Krona. It\'s also pretty safe... most of the time...')
    g.add(option('tourLake', {}, 'Continue the Tour'))
  },

  tourLake: (g: Game) => {
    g.run('go', { location: 'lake', minutes: 18 })
    const npc = g.npc
    npc.say('The Lake. A peaceful spot when the city gets too much. Steam off the water—rather lovely.')
    g.add('Steam gently rises from the surface, creating a serene mist. A sanctuary where the mechanical and natural worlds blend.')
    g.add(option('tourMarket', {}, 'Continue the Tour'))
  },

  tourMarket: (g: Game) => {
    g.run('go', { location: 'market', minutes: 15 })
    const npc = g.npc
    npc.say('The Market. Best place for oddities and curios. Keep your wits about you.')
    g.add('Vendors display exotic mechanical trinkets and clockwork wonders. The air is filled with haggling, the clink of gears, and the hiss of steam. The market throbs. Fingers brush you as you pass—accidental, deliberate, promising.')
    g.add(option('tourBackstreets', {}, 'Continue the Tour'))
  },

  tourBackstreets: (g: Game) => {
    g.run('go', { location: 'backstreets', minutes: 15 })
    g.add('The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.')
    const npc = g.npc
    npc.say('Your room\'s in one of the buildings, I believe. It\'s a nice enough area, but be careful at night.') 
    g.add(option('tourEnds', {}, 'Finish the Tour'))
  },

  tourEnds: (g: Game) => {
    g.scene.hideNpcImage = false
    g.add('Rob shows you around the backstreets for a while.')
    const npc = g.npc
    npc.say('I hope this helps you find your feet. Enjoy Aetheria!')
    g.add(option('endScene', {text: 'You thank Rob and he leaves you in the backstreets.'}, 'Say goodbye'))
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
    const currentDate = game.date
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
