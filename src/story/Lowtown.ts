import { Game } from '../model/Game'
import { NPC, registerNPC } from '../model/NPC'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { speech } from '../model/Format'
import { consumeAlcohol } from './Effects'

// Location definitions for Lowtown
const LOWTOWN_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  lowtown: {
    name: 'Lowtown',
    description: 'The industrial underbelly of the city, where the gears of progress grind against the forgotten.',
    image: '/images/lowtown.jpg',
    mainLocation: true,
    links: [
      { dest: 'backstreets', time: 5 }, // 5 minutes back to backstreets
      { dest: 'copper-pot-tavern', time: 2 }, // 2 minutes to Copper Pot Tavern
    ],
    secret: true, // Starts as undiscovered - must be found through exploration
  },
  'copper-pot-tavern': {
    name: 'Copper Pot Tavern',
    description: 'A dimly lit establishment where workers and strangers alike seek refuge from the grime of Lowtown.',
    image: '/images/tavern.jpg',
    links: [{ dest: 'lowtown', time: 2 }], // 2 minutes back to Lowtown
    onArrive: (g: Game) => {
      g.getNPC('ivan-hess')
    },
  },
}

// Register NPCs in Lowtown
registerNPC('spice-dealer', {
  name: 'Spice Dealer',
  description: 'A shady character lurking in the shadows.',
  onApproach: (game: Game) => {
    game.add('The spice dealer eyes you warily, his mechanical hand twitching. "What do you want?" he asks in a low voice.')
  },
  onMove: (game: Game) => {
    const npc = game.getNPC('spice-dealer')
    // Update location based on schedule when hour changes
    const schedule: [number, number, string][] = [
      [15, 2, 'lowtown'], // 3pm-2am in lowtown (wrap-around)
    ]
    npc.followSchedule(game, schedule)
  },
})

registerNPC('ivan-hess', {
  name: 'Ivan Hess',
  description: 'The barkeeper of the Copper Pot Tavern.',
  image: '/images/npcs/barkeep.jpg',
  speechColor: '#c4a35a',
  onMove: (game: Game) => {
    const npc = game.getNPC('ivan-hess')
    npc.followSchedule(game, [[10, 2, 'copper-pot-tavern']])
  },
  onApproach: (game: Game) => {
    game.add('Ivan Hess wipes down the bar with a rag, then looks up. His expression is guarded but not unfriendly.')
    game.add(speech("What'll it be?", game.npc?.template.speechColor))
    game.run('interact', { script: 'onGeneralChat' })
  },
  scripts: {
    onGeneralChat: (g: Game) => {
      g.addOption('interact', { script: 'buyDrink' }, 'Buy a drink (10 krona)')
      g.addOption('interact', { script: 'gossip' }, 'Ask for gossip')
      g.addOption('interact', { script: 'work' }, 'Ask for work')
      g.addOption('endConversation', { text: "You take your leave .", reply: "Come back whenever you're thirsty." }, 'Leave')
    },
    buyDrink: (g: Game) => {
      const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
      if (crown < 10) {
        g.add(speech("You're short of krona, friend. Ten for a pint.", g.npc?.template.speechColor))
        g.run('interact', { script: 'onGeneralChat' })
        return
      }
      g.player.removeItem('crown', 10)
      consumeAlcohol(g, 35)
      g.add('You hand over ten krona. Ivan draws you a foaming pint and slides it across the bar. You take a long drink.')
      g.add(speech("There you go. Mind the fumes from the still—we like our ale strong here.", g.npc?.template.speechColor))
      g.run('interact', { script: 'onGeneralChat' })
    },
    gossip: (g: Game) => {
      g.add(speech("Word is the constables have been poking around the old mill. And the Spice Dealer's been in twice this week, which always means someone's looking for something. Beyond that, I keep my ears open and my mouth shut.", g.npc?.template.speechColor))
      g.run('interact', { script: 'onGeneralChat' })
    },
    work: (g: Game) => {
      g.add(speech("I could use someone to wash glasses and help when it gets busy. Pays a few krona, and you'll hear things. Come back when you've got a free evening and we'll talk.", g.npc?.template.speechColor))
      g.run('interact', { script: 'onGeneralChat' })
    },
  },
})

// Register all location definitions when module loads
Object.entries(LOWTOWN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
