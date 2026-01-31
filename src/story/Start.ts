import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { p, highlight} from '../model/Format'
import type { Card, CardDefinition, Reminder } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { NPC, registerNPC } from '../model/NPC'
import { discoverAllLocations } from '../story/Utility'
import { text, say, npcLeaveOption, seq, skillCheck, addStat, discoverLocation, option, time } from '../model/ScriptDSL'
import type { Specialty } from '../screens/NewCharacterScreen'
import '../story/Effects' // Register effect definitions
import '../story/Lodgings' // Register lodgings scripts

/** Returns the item IDs for the starting outfit based on chosen specialty. */
export function getStartingOutfit(specialty: Specialty | null): string[] {
  const underwear = ['bra-cotton', 'panties-cotton', 'white-socks']

  switch (specialty) {
    case 'Aetherics':
      return [...underwear, 'dress-basic', 'shoes-plain']
    case 'Mechanics':
      return [...underwear, 'tied-shirt', 'shorts-basic', 'boots-leather']
    case 'Flirtation':
      return [...underwear, 'crop-top', 'skirt-pleated', 'shoes-plain']
    default:
      return [...underwear, 'crop-top', 'shorts-basic', 'boots-leather']
  }
}

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
    option('Get directions', 'npc:onGetDirections'),
    option('Flirt', 'npc:onFlirt'),
    option('???', 'npc:onGlitch'),
    npcLeaveOption('The automaton whirs softly as you depart.', 'Safe travels. May your gears never seize.', 'Say goodbye'),
  ),
  scripts: {
    onGetDirections: seq(
      text('The automaton gestures with a brass limb.'),
      say('The city centre lies straight ahead—follow the main concourse. It is a short walk.'),
      text('It ticks thoughtfully.'),
      say('I am also told there is a serene lake to the east. The university overlooks it, and one can reach it from the market district. Steam rises from the surface—rather picturesque.'),
      discoverLocation('lake'),
      time(1),
    ),
    onFlirt: skillCheck('Flirtation', 0,
      seq(
        text('The automaton\'s gears stutter. Its optics flicker.'),
        say('I am not programmed for such... input. My valves are operating at 102% capacity. How curious. Would you like a timetable?'),
        addStat('Flirtation', 1, { chance: 1, max: 5 }),
        time(1),
      ),
      seq(
        text('The automaton inclines its head with mechanical precision.'),
        say('I am a hospitality unit. Is there something specific you require?'),
        time(1),
      ),
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
  init: (g: Game, params: { specialty?: Specialty | null }) => {
    const pc=g.player
    const specialty = params.specialty ?? null

    // Clear any pre-init inventory (e.g. character creation screen clothes)
    pc.stripAll(true)
    pc.inventory.length = 0

    // Set player name
    pc.name = 'Elise'

    // Set base stats to 30
    pc.basestats.set('Dexterity', 30)
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

    // Add starting clothing based on specialty
    const startingOutfit = getStartingOutfit(specialty)
    for (const id of startingOutfit) {
      g.run('gainItem', { item: id })
    }

    // Add school uniform items
    g.run('gainItem', { item: 'school-blazer' })
    g.run('gainItem', { item: 'school-necktie' })
    g.run('gainItem', { item: 'school-skirt' })
    g.run('gainItem', { item: 'school-socks' })

    // Wear starting outfit
    for (const id of startingOutfit) {
      pc.wearItem(id)
    }

    // Save starting outfits
    pc.saveOutfit('Casual') // Save current worn items as Casual
    pc.outfits['School'] = {
      items: [
        'bra-cotton',
        'panties-cotton',
        'tied-shirt',
        'school-necktie',
        'school-blazer',
        'school-skirt',
        'school-socks',
        'boots-leather',
      ],
    }

    // Debug-only extra items for testing
    if (g.isDebug) {
      g.run('gainItem', { item: 'magic-potion', number: 1 })
      g.run('gainItem', { item: 'fun-juice', number: 1 })
      g.run('gainItem', { item: 'blouse-white' })
      g.run('gainItem', { item: 'corset-suede' })
      g.run('gainItem', { item: 'hat-bowler' })
      g.run('gainItem', { item: 'crop-top' })
      g.run('gainItem', { item: 'tied-shirt' })
      g.run('gainItem', { item: 'shorts-basic' })
      g.run('gainItem', { item: 'skirt-pleated' })
      g.run('gainItem', { item: 'dress-basic' })
      g.run('gainItem', { item: 'bikini-top' })
      g.run('gainItem', { item: 'bikini-bottom' })
      g.run('gainItem', { item: 'steam-bra' })
      g.run('gainItem', { item: 'steam-stockings' })
      g.run('gainItem', { item: 'gloves-cursed' })
      // Tinted colour variants (a random selection)
      g.run('gainItem', { item: 'bra-black' })
      g.run('gainItem', { item: 'panties-red' })
      g.run('gainItem', { item: 'socks-navy' })
      g.run('gainItem', { item: 'tied-shirt-pink' })
      g.run('gainItem', { item: 'socks-grey' })
      pc.outfits['Bikini'] = {
        items: [
          'bikini-top',
          'bikini-bottom',
          'boots-leather',
        ],
      }
    }

    // Move on to start script
    g.run('start', {})
  },

  start: (g: Game) => {
    g.add('The train exhales a long, wet hiss as it comes to a halt at the platform.')
      .add(p('You have travelled across the whole continent, and are finally here, in the city of ', highlight('Aetheria', '#fbbf24', 'Aetheria: The great steam-powered city of brass and gears, where mechanical marvels and Victorian elegance meet in a symphony of innovation and tradition.'), '.'))
      .addOption('startPlatform', 'Continue')
      .addOption('skipIntro', 'Skip Intro')
    if (g.isDebug) {
      g.addOption('schoolStart', 'School Start')
    }
  },

  /** Skip intro: jump to bedroom at 2pm with key and goals. */
  skipIntro: (g: Game) => {
    g.timeLapse(2*60)
    g.run('move', { location: 'bedroom' })
    g.scene.hideNpcImage = true
    const landlord = g.getNPC('landlord')
    landlord.nameKnown = 1
    landlord.stats.set('seen', 1)
    g.add('You skip ahead to your room in the backstreets after meeting your landlord {npc(landlord)}. Your key is in your hand; your goals, ahead.')
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
    // Instantiate station NPCs now that the player is here
    g.getNPC('automaton-greeter')
    g.getNPC('tour-guide')
    g.getNPC('commuter')
    g
    .add('You step onto the platform of Ironspark Terminus.')
    .add('Coal smoke curls around your ankles like fingers. The station cathedral looms above: brass vertebrae, glass skin revealing grinding intestines of gear and piston. Somewhere a valve releases steam that tastes faintly of iron and skin.')
    .add(p('You are here. Alone. The ', highlight('acceptance letter', '#fbbf24', 'You managed to get accepted by the most prestigious University in Aetheria! A remarkable achievement for a country girl like you.'), ' pressed against your chest is your only connection to this place.'))
    .addOption('whatNow', 'Continue')
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
