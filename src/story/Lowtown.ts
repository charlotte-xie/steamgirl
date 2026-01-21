import { Game } from '../model/Game'
import { registerNPC } from '../model/NPC'
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
      { dest: 'subway-lowtown', time: 2, label: 'Subway' },
    ],
    secret: true, // Starts as undiscovered - must be found through exploration
    onArrive: (g: Game) => {
      g.getNPC('spice-dealer')
      g.getNPC('elvis-crowe')
      g.getNPC('jonny-elric')
    },
  },
  'copper-pot-tavern': {
    name: 'Copper Pot Tavern',
    description: 'A dimly lit establishment where workers and strangers alike seek refuge from the grime of Lowtown.',
    image: '/images/tavern.jpg',
    links: [{ dest: 'lowtown', time: 2 }], // 2 minutes back to Lowtown
    onArrive: (g: Game) => {
      g.getNPC('ivan-hess')
      g.getNPC('elvis-crowe')
      g.getNPC('jonny-elric')
    },
  },
}

// Register NPCs in Lowtown
registerNPC('spice-dealer', {
  name: 'Johnny Bug',
  description: 'Shady spice dealer',
  image: '/images/npcs/dealer.jpg',
  onApproach: (game: Game) => {
    game.add('The spice dealer eyes you warily, his mechanical hand twitching. "What do you want?" he asks in a low voice.')
  },
  onMove: (game: Game) => {
    const npc = game.getNPC('spice-dealer')
    // Update location based on schedule when hour changes
    const schedule: [number, number, string][] = [
      [15, 2, 'lowtown'], // 3pm-2am in lowtown (wrap-around)
      [2, 3, 'backstreets']
    ]
    npc.followSchedule(game, schedule)
  },
})

registerNPC('jonny-elric', {
  name: 'Jonny Elric',
  description: 'Monocled Gangster',
  image: '/images/npcs/boss2.jpg',
  speechColor: '#6b5b6b',
  onMove: (game: Game) => {
    const npc = game.getNPC('jonny-elric')
    const schedule: [number, number, string][] = [
      [6, 10, 'lowtown'],           
      [10, 11, 'backstreets'],      
      [11, 13, 'market'],          
      [13, 14, 'backstreets'],      
      [14, 16, 'lowtown'],    
      [16, 19, 'subway-lowtown'],   
      [20, 24, 'copper-pot-tavern'], 
    ]
    npc.followSchedule(game, schedule)
  },
  onApproach: (game: Game) => {
    game.add('Jonny Elric adjusts his monocle and fixes you with a flat, assessing stare. Friend of Elvis; enforcer by trade.')
    game.add(speech("Something I can help you with?", game.npc?.template.speechColor))
    game.run('interact', { script: 'onGeneralChat' })
  },
  scripts: {
    onGeneralChat: (g: Game) => {
      g.addOption('interact', { script: 'askElvis' }, 'You know Elvis?')
      g.addOption('interact', { script: 'askTerritory' }, "Who runs these streets?")
      g.addOption('interact', { script: 'work' }, 'I need work.')
      g.addOption('endConversation', { text: "You back away slowly.", reply: "Mind how you go." }, 'Leave')
    },
    askElvis: (g: Game) => {
      g.add(speech("Elvis and me go way back. I handle the rough stuff. He does the thinking. You want to talk to the boss, you find him—I'm not a messenger."))
      g.run('interact', { script: 'onGeneralChat' })
    },
    askTerritory: (g: Game) => {
      g.add(speech("Same as always. Elvis's word is law down here. I make sure people remember it."))
      g.run('interact', { script: 'onGeneralChat' })
    },
    work: (g: Game) => {
      g.add(speech("Maybe. You look like you could hold your own. But I don't hire strangers. Earn Elvis's nod first—then we'll talk."))
      g.run('interact', { script: 'onGeneralChat' })
    },
  },
})

registerNPC('elvis-crowe', {
  name: 'Elvis Crowe',
  description: 'Intimidating gangster',
  image: '/images/npcs/boss1.jpg',
  speechColor: '#8b7355',
  onMove: (game: Game) => {
    const npc = game.getNPC('elvis-crowe')
    const schedule: [number, number, string][] = [
      [10, 12, 'lowtown'],           // 10am–12pm in Lowtown streets
      [12, 13, 'backstreets'],       // 12pm–1pm in backstreets
      [17, 19, 'lowtown'],           // 5–7pm in Lowtown streets
      [19, 23, 'copper-pot-tavern'], // 7–11pm in the tavern
    ]
    npc.followSchedule(game, schedule)
  },
  onApproach: (game: Game) => {
    game.add('Elvis Crowe sizes you up with a cold, practised eye. His presence alone makes the air feel heavier.')
    game.add(speech("You want something?", game.npc?.template.speechColor))
    game.run('interact', { script: 'onGeneralChat' })
  },
  scripts: {
    onGeneralChat: (g: Game) => {
      g.addOption('interact', { script: 'askTerritory' }, "Who runs these streets?")
      g.addOption('interact', { script: 'wordOnStreet' }, "What's the word?")
      g.addOption('interact', { script: 'work' }, 'I need work.')
      g.addOption('endConversation', { text: "You step back and melt into the crowd.", reply: "Smart. Don't linger." }, 'Leave')
    },
    askTerritory: (g: Game) => {
      g.add(speech("These streets answer to me. You'd do well to remember that. Pay your respects, keep your head down, and we won't have a problem."))
      g.run('interact', { script: 'onGeneralChat' })
    },
    wordOnStreet: (g: Game) => {
      g.add(speech("Constables are jumpy. The Spice Dealer's been moving product. And someone's been asking questions about the old mill. You didn't hear it from me."))
      g.run('interact', { script: 'onGeneralChat' })
    },
    work: (g: Game) => {
      g.add(speech("Maybe. I don't hand out errands to every face that walks up. Prove you're useful—or at least not a liability. Check back when you've got something to show."))
      g.run('interact', { script: 'onGeneralChat' })
    },
  },
})

registerNPC('ivan-hess', {
  name: 'Ivan Hess',
  description: 'Barkeeper',
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
