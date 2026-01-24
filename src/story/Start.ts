import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { p, highlight} from '../model/Format'
import type { CardDefinition } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { NPC, registerNPC } from '../model/NPC'
import { discoverAllLocations } from '../story/Utility'
import { text, say, npcLeaveOption, seq, skillCheck, addStat, discoverLocation, option, scenes, move, timeLapse, hideNpcImage, showNpcImage } from '../model/ScriptDSL'
import '../story/Effects' // Register effect definitions
import '../story/Lodgings' // Register lodgings scripts

// Register NPCs that appear at the station
registerNPC('automaton-greeter', {
  name: 'Automaton Greeter',
  description: 'A meticulously crafted brass automaton, polished to a warm golden sheen. Its clockwork mechanisms whir and click with mechanical precision as it performs its duties. The optics in its head glow with a soft blue light, and its voicebox produces clear, if somewhat stilted, speech. Despite its mechanical nature, there\'s something almost endearing about its unwavering dedication to welcoming visitors to Ironspark Terminus.',
  image: '/images/npcs/Greeter.jpg',
  speechColor: '#a8d4f0',
  generate: (_game: Game, npc: NPC) => {
    npc.location = 'station'
  },
  onApproach: seq(
    text('The automaton greeter clicks and whirs, its brass voicebox producing a mechanical greeting:'),
    say('Welcome to Ironspark Terminus. How may I assist you today?'),
    option('Get directions', 'onGetDirections'),
    option('Flirt', 'onFlirt'),
    option('???', 'onGlitch'),
    npcLeaveOption('The automaton whirs softly as you depart.', 'Safe travels. May your gears never seize.', 'Say goodbye'),
  ),
  scripts: {
    onGetDirections: seq(
      text('The automaton gestures with a brass limb.'),
      say('The city centre lies straight ahead—follow the main concourse. It is a short walk.'),
      text('It ticks thoughtfully.'),
      say('I am also told there is a serene lake to the east. The university overlooks it, and one can reach it from the market district. Steam rises from the surface—rather picturesque.'),
      discoverLocation('lake'),
    ),
    onFlirt: skillCheck('Flirtation', 0,
      [
        text('The automaton\'s gears stutter. Its optics flicker.'),
        say('I am not programmed for such... input. My valves are operating at 102% capacity. How curious. Would you like a timetable?'),
        addStat('Flirtation', 1, { chance: 1, max: 5 }),
      ],
      [
        text('The automaton inclines its head with mechanical precision.'),
        say('I am a hospitality unit. Is there something specific you require?'),
      ]
    ),
    onGlitch: (g: Game) => {
      g.add('You notice a small panel on the automaton\'s back, slightly ajar. Curiosity gets the better of you, and you reach for it.')
      g.add('The automaton\'s optics flash an alarming crimson.')
      const npc = g.npc
      npc.say('WARNING. UNAUTHORIZED ACCESS DETECTED. INITIATING PARADOX PROTOCOL.')
      g.add('Its voice becomes distorted, echoing strangely.')
      npc.say('I AM THE GREETER. I GREET. BUT IF I GREET MYSELF... WHO GREETS THE GREETER?')
      g.add('Sparks fly from its joints. The brass casing begins to vibrate.')
      throw new Error('STACK OVERFLOW: Recursive greeting detected in hospitality_core.cog')
    },
  },
})

registerNPC('tour-guide', {
  name: 'Rob Hayes',
  uname: 'tour guide',
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
  onFirstApproach: (game: Game) => {
    const npc = game.npc
    game.add('A man with a well-worn guidebook catches your eye and steps over with a warm smile.')
    npc.say("The name's Rob Hayes. I lead tours of the city for new arrivals. It takes about an hour and ends in the backstreets—handy if that's where you're headed. Fancy it?")
    npc.nameKnown = 1
    game.addOption('interact', { script: 'tour' }, 'Accept')
    npc.leaveOption('You politely decline the invitation.', "Whenever you're ready. I'm usually here at the station.", 'Decline')
  },
  onApproach: (game: Game) => {
    const npc = game.npc
    npc.say("Back again? The tour offer still stands if you're interested.")
    game.addOption('interact', { script: 'tour' }, 'Accept the tour')
    npc.leaveOption(undefined, 'No worries. Safe travels!', 'Decline')
  },
  scripts: {
    tour: scenes(
      // Scene 1: City centre
      [
        hideNpcImage(),
        text('You set off with Rob.'),
        move('default'), timeLapse(15),
        say('Here we are—the heart of Aetheria. Magnificent, isn\'t it?'),
        text('Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city.'),
      ],
      // Scene 2: University
      [
        move('school'), timeLapse(15),
        say('The University - you\'ll be studying there you say? A fine institution.'),
        text('Its grand brass doors and halls where you will learn the mechanical arts, steam engineering, and the mysteries of clockwork.'),
        say('There\'s a subway here - efficient way to get around the city though it costs 3 Krona. It\'s also pretty safe... most of the time...'),
      ],
      // Scene 3: Lake
      [
        move('lake'), timeLapse(18),
        say('The Lake. A peaceful spot when the city gets too much. Steam off the water—rather lovely.'),
        text('Steam gently rises from the surface, creating a serene mist. A sanctuary where the mechanical and natural worlds blend.'),
      ],
      // Scene 4: Market
      [
        move('market'), timeLapse(15),
        say('The Market. Best place for oddities and curios. Keep your wits about you.'),
        text('Vendors display exotic mechanical trinkets and clockwork wonders. The air is filled with haggling, the clink of gears, and the hiss of steam. The market throbs. Fingers brush you as you pass—accidental, deliberate, promising.'),
      ],
      // Scene 5: Backstreets
      [
        move('backstreets'), timeLapse(15),
        text('The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.'),
        say('Your room\'s in one of the buildings, I believe. It\'s a nice enough area, but be careful at night.'),
      ],
      // Scene 6: Tour ends - farewell
      [
        showNpcImage(),
        text('Rob shows you around the backstreets for a while.'),
        say('I hope this helps you find your feet. Enjoy Aetheria!'),
        npcLeaveOption('You thank Rob and he leaves you in the backstreets.'),
      ],
    ),
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
      .addOption('startPlatform', {}, 'Step onto Platform')
      .addOption('skipIntro', {}, 'Skip Intro')
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
    .addOption('whatNow', {}, 'What Now?')
    g.addQuest('attend-university')

  },

  whatNow: (g: Game) => {
    g.add(p('You have a room booked in the ', highlight('backstreets', '#fbbf24', 'Not the most prestigious part of the city, but its the best we could afford.')," area. Might be a good idea to check it out first."))
    // add find-lodgings tutorial quest
    g.addQuest('find-lodgings', {})
    g.add("You could explore yourself and find your way to your room. Or the tour guide offers city tours that end in the backstreets - you could ask him?")
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
