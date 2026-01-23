import { Game } from '../model/Game'
import { registerNPC } from '../model/NPC'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { speech } from '../model/Format'
import { consumeAlcohol } from './Effects'
import { makeScripts } from '../model/Scripts'

// Location definitions for the Copper Pot Tavern
const TAVERN_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  'copper-pot-tavern': {
    name: 'Copper Pot Tavern',
    description: 'A dimly lit establishment where workers and strangers alike seek refuge from the grime of Lowtown.',
    image: '/images/tavern.jpg',
    links: [
      { dest: 'lowtown', time: 2, travel: true, label: 'Exit to Street' }, // 2 minutes back to Lowtown
      { dest: 'tavern-ladies-bathroom', time: 1, label: 'Ladies' },
      { 
        dest: 'tavern-gents-bathroom', 
        time: 1, 
        label: 'Gents',
        onFollow: (g: Game, _p: {}) => {
          g.add("You shouldn't be going in there... are you sure?")
          g.addOption('enterGentsBathroom', {}, 'Enter Gents')
          g.addOption('endScene', { text: 'You turn away.' }, 'Turn Away')
        },
      },
      { dest: 'tavern-cellars', time: 1, label: 'Cellars' },
    ],
    onArrive: (g: Game) => {
      g.getNPC('ivan-hess')
      g.getNPC('elvis-crowe')
      g.getNPC('jonny-elric')
    },
    activities: [
      {
        name: 'Hang at Bar',
        symbol: '🍺',
        script: (g: Game) => {
          g.run('wait', { minutes: 30 })
          // If no scene was triggered, add random flavor text
          if (!g.inScene) {
            const flavorTexts = [
              'You lean against the bar and watch the regulars come and go. The steam from the still fills the air with a warm, yeasty scent.',
              'You find a quiet corner and observe the tavern\'s rhythm. Workers unwind after their shifts, sharing stories over pints.',
              'You sit at the bar, listening to the clink of glasses and the low murmur of conversations. The brass fixtures gleam in the dim light.',
              'You watch Ivan work behind the bar, his mechanical precision evident in every pour. The regulars nod in your direction.',
              'You take in the atmosphere—the worn wooden tables, the steam-powered taps, the sense of community among the patrons.',
            ]
            const randomText = flavorTexts[Math.floor(Math.random() * flavorTexts.length)]
            g.add(randomText)
          }
        },
        condition: (g: Game) => {
          const hour = g.hourOfDay
          return hour >= 15 || hour < 1 // (wraps around)
        },
      },
    ],
  },
  'tavern-ladies-bathroom': {
    name: 'Ladies Bathroom',
    description: 'A small, private restroom.',
    image: '/images/lowtown/ladies.jpg',
    links: [{ dest: 'copper-pot-tavern', time: 1 }],
  },
  'tavern-gents-bathroom': {
    name: 'Gents Bathroom',
    description: 'The men\'s restroom.',
    image: '/images/lowtown/gents.jpg',
    links: [{ dest: 'copper-pot-tavern', time: 1 }],
  },
  'tavern-cellars': {
    name: 'Cellars',
    description: 'The tavern\'s storage cellars, stacked with barrels and crates.',
    image: '/images/lowtown/cellars.jpg',
    secret: true, // Starts as undiscovered
    links: [
      { dest: 'copper-pot-tavern', time: 1 },
      { dest: 'tavern-cupboard', time: 1, label: 'Cupboard' },
    ],
  },
  'tavern-cupboard': {
    name: 'Cupboard',
    description: 'A small storage cupboard.',
    image: '/images/lowtown/cupboard.jpg',
    secret: true, // Starts as undiscovered
    links: [{ dest: 'tavern-cellars', time: 1 }],
  },
}

// Register Ivan Hess NPC
registerNPC('ivan-hess', {
  name: 'Ivan Hess',
  description: 'The proprietor of the Copper Pot Tavern, a man who\'s seen decades of Lowtown\'s comings and goings. His mechanical arm moves with practiced precision as he polishes glasses and draws pints from the steam-powered taps. He keeps his own counsel but hears everything, and his guarded expression suggests he knows more about the neighborhood\'s secrets than he\'ll ever let on.',
  image: '/images/npcs/barkeep.jpg',
  speechColor: '#c4a35a',
  onMove: (game: Game) => {
    const npc = game.getNPC('ivan-hess')
    npc.followSchedule(game, [[10, 2, 'copper-pot-tavern']])
  },
  onApproach: (game: Game) => {
    const npc = game.npc
    game.add('Ivan Hess wipes down the bar with a rag, then looks up. His expression is guarded but not unfriendly.')
    npc.say("What'll it be?")
    npc.chat()
  },
  scripts: {
    onGeneralChat: (g: Game) => {
      const npc = g.npc
      npc.option('Buy a drink (10 krona)', 'buyDrink')
        .option('Ask for gossip', 'gossip')
        .option('Ask for work', 'work')
        .leaveOption("You take your leave .", "Come back whenever you're thirsty.")
    },
    buyDrink: (g: Game) => {
      const npc = g.npc
      const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
      if (crown < 10) {
        npc.say("You're short of krona, friend. Ten for a pint.")
        npc.chat()
        return
      }
      g.player.removeItem('crown', 10)
      consumeAlcohol(g, 35)
      g.add('You hand over ten krona. Ivan draws you a foaming pint and slides it across the bar. You take a long drink.')
      npc.say("There you go. Mind the fumes from the still—we like our ale strong here.")
      npc.chat()
    },
    gossip: (g: Game) => {
      const npc = g.npc
      npc.say("Word is the constables have been poking around the old mill. And the Spice Dealer's been in twice this week, which always means someone's looking for something. Beyond that, I keep my ears open and my mouth shut.")
      npc.chat()
    },
    work: (g: Game) => {
      const npc = g.npc
      npc.say("I could use someone to wash glasses and help when it gets busy. Pays a few krona, and you'll hear things. Come back when you've got a free evening and we'll talk.")
      npc.chat()
    },
  },
})

// Tavern scripts
const tavernScripts = {
  enterGentsBathroom: (g: Game, _params: {}) => {
    // Clear the scene first
    g.clearScene()
    // Move directly using move (bypasses onFollow) and handle time/discovery manually
    g.timeLapse(1)
    const gentsLocation = g.getLocation('tavern-gents-bathroom')
    g.run('move', { location: 'tavern-gents-bathroom' })
    gentsLocation.discovered = true
    // Run onArrive if it exists
    const def = gentsLocation.template
    if (def.onArrive) {
      def.onArrive(g, {})
    }
  },
}
makeScripts(tavernScripts)

// Register all location definitions when module loads
Object.entries(TAVERN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
