import { Game } from '../model/Game'
import { registerNPC } from '../model/NPC'
import type { ScheduleEntry } from '../model/NPC'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { dangerousIndecency } from './Public'

// Location definitions for Lowtown
const LOWTOWN_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  lowtown: {
    name: 'Lowtown',
    description: 'The underbelly of the city, where the gears of progress grind against the forgotten.',
    image: '/images/lowtown.jpg',
    mainLocation: true,
    links: [
      { dest: 'backstreets', time: 5 }, // 5 minutes back to backstreets
      { dest: 'copper-pot-tavern', time: 2 }, // 2 minutes to Copper Pot Tavern
      { dest: 'subway-lowtown', time: 2, label: 'Subway' },
      { dest: 'back-alley', time: 2 },
    ],
    secret: true, // Starts as undiscovered - must be found through exploration
    onFirstArrive: (g: Game) => {
      g.add('So this is Lowtown... the notorious underbelly of Aetheria.')
    },
    onArrive: (g: Game) => {
      g.getNPC('spice-dealer')
      g.getNPC('elvis-crowe')
      g.getNPC('jonny-elric')
    },
    onTick: dangerousIndecency(0, 24),
  },
  'back-alley': {
    name: 'Back Alley',
    description: 'A narrow passage between crumbling brick buildings, where the gaslight barely reaches. Puddles of oily water reflect the dim glow of distant lamps, and the air is thick with the smell of rust and decay.',
    image: '/images/lowtown/alley.jpg',
    links: [
      { dest: 'lowtown', time: 2 },
    ],
    onTick: dangerousIndecency(0, 24),
  },
}

// Timmy Bug (spice-dealer) is defined in npc/Timmy.ts

registerNPC('elvis-crowe', {
  name: 'Elvis Crowe',
  uname: 'intimidating gangster',
  description: 'Tall and imposing, with eyes that have seen too much and forgotten nothing. His presence commands respect and fear in equal measure. Dressed in fine but practical attire, he moves through the streets like a predator, and the very air seems to still when he passes. Those who cross him don\'t last long in these parts.',
  image: '/images/npcs/boss1.jpg',
  speechColor: '#8b7355',
  onMove: (game: Game) => {
    const npc = game.getNPC('elvis-crowe')
    const schedule: ScheduleEntry[] = [
      [11, 14, 'docks', [1]],           // Monday: overseeing dock operations
      [14, 17, 'lake', [3]],            // Wednesday: a quiet stroll — even bosses need air
      [10, 13, 'market', [5]],          // Friday: collecting his cut from the stallholders
      [10, 12, 'lowtown'],              // default: morning rounds in Lowtown
      [12, 13, 'backstreets'],           // checking the backstreets
      [17, 19, 'lowtown'],              // evening presence in Lowtown
      [19, 23, 'copper-pot-tavern'],     // holding court at the Copper Pot
    ]
    npc.followSchedule(game, schedule)
  },
  onApproach: (game: Game) => {
    const npc = game.npc
    if (npc.nameKnown > 0) {
      game.add('Elvis Crowe sizes you up with a cold, practised eye. His presence alone makes the air feel heavier.')
      npc.say("You want something?")
      npc.chat()
    } else {
      game.add('An intimidating figure sizes you up with a cold, practised eye. His presence alone makes the air feel heavier.')
      npc.say("You want something?")
      game.add('He doesn\'t seem interested in talking until you\'ve proven yourself.')
      npc.leaveOption("You step back and melt into the crowd.", "Smart. Don't linger.")
    }
  },
  scripts: {
    onGeneralChat: (g: Game) => {
      const npc = g.npc
      // Only show general chat if name is known
      if (npc.nameKnown <= 0) {
        g.add('He doesn\'t seem interested in talking until you\'ve proven yourself.')
        return
      }
      npc.option("Who runs these streets?", 'askTerritory')
        .option("What's the word?", 'wordOnStreet')
        .option('I need work.', 'work')
        .leaveOption("You step back and melt into the crowd.", "Smart. Don't linger.")
    },
    askTerritory: (g: Game) => {
      const npc = g.npc
      npc.say("These streets answer to me. You'd do well to remember that. Pay your respects, keep your head down, and we won't have a problem.")
      g.timeLapse(1)
      npc.chat()
    },
    wordOnStreet: (g: Game) => {
      const npc = g.npc
      npc.say("Constables are jumpy. Timmy Bug's been moving product. And someone's been asking questions about the old mill. You didn't hear it from me.")
      g.timeLapse(1)
      npc.chat()
    },
    work: (g: Game) => {
      const npc = g.npc
      npc.say("Maybe. I don't hand out errands to every face that walks up. Prove you're useful—or at least not a liability. Check back when you've got something to show.")
      g.timeLapse(1)
      npc.chat()
    },
  },
})


// Register all location definitions when module loads
Object.entries(LOWTOWN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
