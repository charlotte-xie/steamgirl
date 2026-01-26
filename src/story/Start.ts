import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { p, highlight} from '../model/Format'
import type { Card, CardDefinition, Reminder } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { NPC, registerNPC } from '../model/NPC'
import { discoverAllLocations } from '../story/Utility'
import { text, say, npcLeaveOption, seq, when, random, skillCheck, addStat, addNpcStat, moveNpc, discoverLocation, option, scenes, move, timeLapse, hideNpcImage, showNpcImage, hasCard, inLocation, cond, run } from '../model/ScriptDSL'
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
    // If the guide is visiting the hotel room, keep him there until the player leaves
    if (npc.location === 'dorm-suite') {
      if (game.currentLocation == 'dorm-suite') {
        return // Don't override with schedule while visiting
      }
      
    }
    npc.followSchedule(game, [
      [9, 18, 'station'],
    ])
  },
  // If you wait at the station and haven't met Rob yet, he approaches you.
  // This only fires once — after onFirstApproach sets nameKnown, the guard prevents repeats.
  onWait: (game: Game) => {
    const npc = game.getNPC('tour-guide')
    if (npc.nameKnown === 0) {
      game.run('approach', { npc: 'tour-guide' })
    }
  },
  onFirstApproach: (game: Game) => {
    const npc = game.npc
    game.add('A man with a well-worn guidebook catches your eye and steps over with a warm smile.')
    npc.say("The name's Rob Hayes. I lead tours of the city for new arrivals. It takes about an hour and ends in the backstreets—handy if that's where you're headed. Fancy it?")
    npc.nameKnown = 1
    game.addOption('interact', { script: 'tour' }, 'Accept')
    npc.leaveOption('You politely decline the invitation.', "Whenever you're ready. I'm usually here at the station.", 'Decline')
  },
  onApproach: cond(
    // In the hotel room — random impressed comments
    inLocation('dorm-suite'),
    run('interact', { script: 'roomChat' }),

    // Default: station approach
    seq(
      say('"Back again? The tour offer still stands if you\'re interested."'),
      option('Accept the tour', 'interact', { script: 'tour' }),
      when(hasCard('hotel-booking'),
        option('Invite to see your hotel room', 'interact', { script: 'inviteToRoom' }),
      ),
      npcLeaveOption(undefined, 'No worries. Safe travels!', 'Decline'),
    ),
  ),
  scripts: {
    tour: scenes(
      // City centre
      [
        hideNpcImage(),
        text('You set off with Rob.'),
        move('default'), timeLapse(15),
        say('Here we are—the heart of Aetheria. Magnificent, isn\'t it?'),
        text('Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city.'),
      ],
      // Imperial Hotel
         [
          discoverLocation('hotel'),
          move('hotel'), timeLapse(5),
          text('Rob takes you to an imposing brass-and-marble facade with gilt lettering above its revolving doors. You take a peek inside.'),
          say('The Imperial Hotel. Very grand, very expensive — too expensive for most folks. But worth knowing about if you ever come into money.'),
        ],
      // SUniversity
      [
        discoverLocation('school'),
        move('school'), timeLapse(15),
        say('The University - you\'ll be studying there you say? A fine institution.'),
        text('Its grand brass doors and halls where you will learn the mechanical arts, steam engineering, and the mysteries of clockwork.'),
        discoverLocation('subway-university'),
        say('There\'s a subway here - efficient way to get around the city though it costs 3 Krona. It\'s also pretty safe... most of the time...'),
      ],
      // Lake
      [
        discoverLocation('lake'),
        move('lake'), timeLapse(18),
        say('The Lake. A peaceful spot when the city gets too much. Steam off the water—rather lovely.'),
        text('Steam gently rises from the surface, creating a serene mist. A sanctuary where the mechanical and natural worlds blend.'),
      ],
      // Market
      [
        discoverLocation('market'),
        move('market'), timeLapse(15),
        say('The Market. Best place for oddities and curios. Keep your wits about you.'),
        text('Vendors display exotic mechanical trinkets and clockwork wonders. The air is filled with haggling, the clink of gears, and the hiss of steam. The market throbs. Fingers brush you as you pass—accidental, deliberate, promising.'),
      ],
   
      // Backstreets
      [
        discoverLocation('backstreets'),
        move('backstreets'), timeLapse(15),
        text('The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.'),
        say('Your room\'s in one of the buildings, I believe. It\'s a nice enough area, but be careful at night.'),
      ],
      // Scene 7: Tour ends - farewell
      [
        showNpcImage(),
        text('Rob shows you around the backstreets for a while.'),
        say('I hope this helps you find your feet. Enjoy Aetheria!'),
        npcLeaveOption('You thank Rob and he leaves you in the backstreets.'),
      ],
    ),
    // Invite Rob to see your hotel room — multi-step journey via scenes()
    inviteToRoom: scenes(
      // Scene 1: Set off from the station
      [
        say('"You\'ve got a room at the Imperial? Blimey! I\'d love to see it. Lead the way!"'),
        hideNpcImage(),
        text('You set off together through the busy streets.'),
      ],
      // Scene 2: City Centre — passing through
      [
        move('default', 10),
        say('"Straight through the centre, is it? I know a shortcut past the fountain."'),
        text('Rob walks briskly, pointing out landmarks as you go. He clearly knows every cobblestone.'),
      ],
      // Scene 3: Hotel Lobby — arriving at the Imperial
      [
        move('hotel', 5),
        text('You push through the revolving brass doors into the lobby. Rob stops in his tracks.'),
        say('"Blimey. I\'ve walked past this place a hundred times but never been inside. Look at those chandeliers!"'),
        text('The concierge glances up, gives Rob a slightly disapproving look, then returns to his ledger.'),
      ],
      // Scene 4: Room 101 — the big reveal
      [
        move('dorm-suite', 1),
        moveNpc('tour-guide', 'dorm-suite'),
        showNpcImage(),
        say('"Would you look at this! A proper bed, a writing desk, a view of the rooftops..."'),
        random(
          say('"I could live like this! Beats my little flat by a country mile."'),
          say('"This is how the other half lives, eh? Polished brass everywhere!"'),
          say('"Steam radiator and everything! You\'ve done well for yourself."'),
        ),
        addNpcStat('affection', 10, 'tour-guide'),
        text('Rob is clearly impressed by your accommodation.'),
        option('Chat', 'interact', { script: 'roomChat' }),
        option('Head out', 'interact', { script: 'leaveRoom' }),
        npcLeaveOption(),
      ],
    ),
    // Random chat while Rob is in the hotel room
    roomChat: seq(
      random(
        say('"I could get used to this. The sheets look like actual cotton — not that scratchy stuff."'),
        say('"Have you seen the bathroom? Claw-footed tub! I\'ve only ever read about those."'),
        say('"The view from up here — you can see right across the rooftops. Magnificent."'),
        say('"I wonder what the kitchens are like. Bet they do a proper breakfast."'),
        say('"My flat has a window that looks onto a brick wall. This is... rather different."'),
      ),
      option('Chat', 'interact', { script: 'roomChat' }),
      option('Head out', 'interact', { script: 'leaveRoom' }),
      npcLeaveOption()
    ),
    // Leave the hotel room together
    leaveRoom: seq(
      text('You suggest heading back downstairs.'),
      say('"Right you are. Thanks for the visit — quite the treat!"'),
      moveNpc('tour-guide', null),
      move('hotel', 1),
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

    // Add starting clothing (casual outfit)
    g.run('gainItem', { item: 'bra-cotton' })
    g.run('gainItem', { item: 'panties-cotton' })
    g.run('gainItem', { item: 'blouse-white' })
    g.run('gainItem', { item: 'corset-suede' })
    g.run('gainItem', { item: 'skirt-pleated' })
    g.run('gainItem', { item: 'stockings-long' })
    g.run('gainItem', { item: 'boots-leather' })
    g.run('gainItem', { item: 'hat-bowler' }) // Not worn, for testing

    // Add school uniform items
    g.run('gainItem', { item: 'school-blazer' })
    g.run('gainItem', { item: 'school-necktie' })
    g.run('gainItem', { item: 'school-skirt' })
    g.run('gainItem', { item: 'school-socks' })

    // Add cursed gloves for testing locked items
    g.run('gainItem', { item: 'gloves-cursed' })

    // Wear starting clothes (casual outfit)
    pc.wearItem('bra-cotton')
    pc.wearItem('panties-cotton')
    pc.wearItem('blouse-white')
    pc.wearItem('corset-suede')
    pc.wearItem('skirt-pleated')
    pc.wearItem('stockings-long')
    pc.wearItem('boots-leather')

    // Save starting outfits
    pc.saveOutfit('Casual') // Save current worn items as Casual
    pc.outfits['School'] = [
      'bra-cotton',
      'panties-cotton',
      'blouse-white',
      'school-necktie',
      'school-blazer',
      'school-skirt',
      'school-socks',
      'boots-leather',
    ]
    
    // Generate NPCs that should be present at the start
    // NOTE: NPCs are lazily instantiated - they only exist in game.npcs after getNPC() is called.
    // Most NPCs are generated when their home location's onArrive hook runs (e.g., Tavern.ts).
    // If you want an NPC to appear in the Characters list before visiting their location,
    // add a getNPC() call here or in an early game event.
    g.getNPC('automaton-greeter')
    g.getNPC('tour-guide')
    g.getNPC('commuter')

    
    // Move on to start script
    g.run('start', {})
  },

  start: (g: Game) => {
    g.add('The train exhales a long, wet hiss as it comes to a halt at the platform.')
      .add(p('You have travelled across the whole continent, and are finally here, in the city of ', highlight('Aetheria', '#fbbf24', 'Aetheria: The great steam-powered city of brass and gears, where mechanical marvels and Victorian elegance meet in a symphony of innovation and tradition.'), '.'))
      .addOption('startPlatform', {}, 'Continue')
      .addOption('skipIntro', {}, 'Skip Intro')
    if (g.isDebug) {
      g.addOption('schoolStart', {}, 'School Start')
    }
  },

  /** Skip intro: jump to bedroom at 2pm with key and goals. */
  skipIntro: (g: Game) => {
    g.timeLapse(2*60)
    g.run('move', { location: 'bedroom' })
    g.scene.hideNpcImage = true
    g.add('You skip ahead to your room in the backstreets. Your key is in your hand; your goals, ahead.')
    g.run('gainItem', { item: 'room-key', number: 1, text: 'You have your room key.' })
    g.addQuest('attend-university', { silent: true })
    // Discover the lodgings and route out to the city
    const bedroom = g.getLocation('bedroom')
    bedroom.numVisits++
    bedroom.discovered = true
    g.getLocation('stairwell').discovered = true
    g.getLocation('backstreets').discovered = true
  },

  /** Debug: skip to school at 9:30am Monday, attend-university quest already done. */
  schoolStart: (g: Game) => {
    discoverAllLocations(g) /* In debug mode so discover everything to make testing easier */
    // Set time to 9:30am on Monday Jan 6 (21h 30m from noon Jan 5)
    g.timeLapse(21.5*60)
    // Clear any effects (hunger, etc.)
    for (const card of [...g.player.cards]) {
      if (card.type === 'Effect') g.removeCard(card.id, true)
    }
    // Skip the attend-university quest entirely
    g.addQuest('attend-university', { silent: true })
    g.completeQuest('attend-university')
    // Enrol in lessons (same as induction would do)
    g.run('enrollLessons', {})
    // Give room key and mark bedroom visited
    g.run('gainItem', { item: 'room-key', number: 1 })
    const bedroom = g.getLocation('bedroom')
    bedroom.numVisits++
    bedroom.discovered = true
    // Move to school hallways
    g.run('move', { location: 'hallway' })
    g.scene.hideNpcImage = true
    g.clearScene()
    g.add('You skip ahead to the university on Monday morning, ready to start your studies.')
  },

  startPlatform: (g: Game) => {
    g
    .add('You step onto the platform of Ironspark Terminus.')
    .add('Coal smoke curls around your ankles like fingers. The station cathedral looms above: brass vertebrae, glass skin revealing grinding intestines of gear and piston. Somewhere a valve releases steam that tastes faintly of iron and skin.')
    .add(p('You are here. Alone. The ', highlight('acceptance letter', '#fbbf24', 'You managed to get accepted by the most prestigious University in Aetheria! A remarkable achievement for a country girl like you.'), ' pressed against your chest is your only connection to this place.'))
    .addOption('whatNow', {}, 'Continue')
    g.addQuest('attend-university')

  },

  whatNow: (g: Game) => {
    g.add(p('You have a room booked in the ', highlight('backstreets', '#fbbf24', 'Not the most prestigious part of the city, but its the best we could afford.')," area. Might be a good idea to check it out first."))
    // add find-lodgings tutorial quest
    g.addQuest('find-lodgings', {})
    g.add("There are signposts to the City Centre. Could be fun to explore and find your own way there.")
    g.add("Or the tour guide offers city tours that end in the backstreets - you could ask him?")
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
  reminders: (_game: Game, card: Card): Reminder[] => {
    if (card.completed || card.failed) return []
    return [{ text: 'Find your lodgings in the backstreets', urgency: 'info', cardId: card.id, detail: 'Your lodgings are somewhere in the backstreets of Lowtown.' }]
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
  reminders: (game: Game, card: Card): Reminder[] => {
    if (card.completed || card.failed) return []
    const d = game.date
    const day = d.getDate()
    const month = d.getMonth() // 0 = January
    const hour = game.hourOfDay
    // Only relevant in January
    if (month !== 0) return []
    // On induction day (Jan 6)
    if (day === 6) {
      if (hour < 8) return [{ text: 'University induction at 8am today!', urgency: 'warning', cardId: card.id, detail: 'Head to the university for your induction. Starts at 8am.' }]
      if (hour < 10) return [{ text: 'University induction now!', urgency: 'urgent', cardId: card.id, detail: 'The induction is happening right now at the university!' }]
      return [] // past 10am — afterUpdate handles failure
    }
    // Day before (Jan 5)
    if (day === 5) return [{ text: 'University induction tomorrow at 8am', urgency: 'info', cardId: card.id, detail: 'Report to the university for induction at 8am on the 6th.' }]
    // Earlier than Jan 5
    return [{ text: 'University induction on 6th Jan', urgency: 'info', cardId: card.id, detail: 'Report to the university for induction at 8am on the 6th.' }]
  },
}

// Register the quest definition
registerCardDefinition('attend-university', attendUniversityQuest)

// Register all start scripts when module loads
makeScripts(startScripts)
