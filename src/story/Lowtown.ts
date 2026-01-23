import { Game } from '../model/Game'
import { registerNPC } from '../model/NPC'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'

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
  },
}

// Register NPCs in Lowtown
registerNPC('spice-dealer', {
  name: 'Johnny Bug',
  uname: 'spice dealer',
  description: 'A wiry figure with a mechanical hand that clicks and whirs with every movement. His eyes dart constantly, assessing every passerby for potential customers or threats. The faint scent of exotic compounds clings to his worn coat, and he moves with the practiced caution of someone who knows the value of discretion in Lowtown\'s shadowy economy.',
  image: '/images/npcs/dealer.jpg',
  speechColor: '#7a8b6b',
  onApproach: (game: Game) => {
    const npc = game.npc
    if (npc.nameKnown > 0) {
      game.add('The spice dealer eyes you warily, his mechanical hand twitching. "What do you want?" he asks in a low voice.')
      npc.chat()
    } else {
      game.add('A shady figure eyes you warily, his mechanical hand twitching. "What do you want?" he asks in a low voice.')
      const price = npc.affection >= 10 ? 5 : 10
      npc.option(`Buy Spice (${price} Kr)`, 'buySpice')
        .option('Flirt', 'flirt')
        .leaveOption('You step away. He watches you go with a flicker of suspicion.', "Watch yourself out there.")
    }
  },
  scripts: {
    onGeneralChat: (g: Game) => {
      const npc = g.npc
      // Only show general chat if name is known (they've introduced themselves)
      if (npc.nameKnown <= 0) {
        g.add('He doesn\'t seem interested in talking until you\'ve done business.')
        return
      }
      const price = npc.affection >= 10 ? 5 : 10
      npc.option(`Buy Spice (${price} Kr)`, 'buySpice')
        .option('Flirt', 'flirt')
        .leaveOption('You step away. He watches you go with a flicker of suspicion.', "Watch yourself out there.")
    },
    buySpice: (g: Game) => {
      const npc = g.npc
      const price = npc.affection >= 10 ? 5 : 10
      const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
      if (crown < price) {
        npc.say(`You need ${price} Krona. Come back when you've got it.`)
        return
      }
      g.player.removeItem('crown', price)
      g.run('gainItem', { item: 'spice', number: 1, text: 'You receive a small packet of Spice.' })
      npc.say('Pleasure doin\' business. Don\'t say where you got it.')
      // After buying, they introduce themselves
      if (npc.nameKnown <= 0) {
        npc.nameKnown = 1
        g.add('"Name\'s Johnny Bug," he says, extending his mechanical hand. "You\'re alright."')
        npc.chat()
      }
    },
    flirt: (g: Game) => {
      const npc = g.npc
      const ok = g.player.skillTest('Flirtation', 0)
      if (ok) {
        // Increase affection by +5, capped at 40
        const currentAffection = npc.affection
        npc.affection = Math.min(currentAffection + 5, 40)
        g.add('He softens slightly, the corner of his mouth quirking. After a pause, he nods.')
        if (npc.affection >= 10 && currentAffection < 10) {
          npc.say('Alright. For you? Five. Don\'t spread it around.')
        } else {
          npc.say('You\'re alright.')
        }
        // After successful flirt, they introduce themselves
        if (npc.nameKnown <= 0) {
          npc.nameKnown = 1
          g.add('"Name\'s Johnny Bug," he says with a slight grin. "You\'re alright."')
        }
      } else {
        npc.say('Save it. I\'m not buyin\'.')
      }
    },
  },
  onMove: (game: Game) => {
    const npc = game.getNPC('spice-dealer')
    // Update location based on schedule when hour changes
    const schedule: [number, number, string][] = [
      [15, 2, 'lowtown'], // 3pm-2am in lowtown (wrap-around)
      [2, 3, 'backstreets'],
      [4, 7, 'docks']
    ]
    npc.followSchedule(game, schedule)
  },
})

registerNPC('jonny-elric', {
  name: 'Jonny Elric',
  uname: 'monocled gangster',
  description: 'A sharp-dressed enforcer with a polished brass monocle that catches the gaslight. His movements are precise, economical—every gesture calculated. The well-maintained revolver at his hip and the scars on his knuckles tell a story of violence meted out with professional detachment.',
  image: '/images/npcs/boss2.jpg',
  speechColor: '#6b5b6b',
  onMove: (game: Game) => {
    const npc = game.getNPC('jonny-elric')
    const schedule: [number, number, string][] = [
      [6, 10, 'docks'],           
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
    const npc = game.npc
    if (npc.nameKnown > 0) {
      game.add('Jonny Elric adjusts his monocle and fixes you with a flat, assessing stare. Friend of Elvis; enforcer by trade.')
      npc.say("Something I can help you with?")
      npc.chat()
    } else {
      game.add('A monocled figure adjusts his monocle and fixes you with a flat, assessing stare. Friend of Elvis; enforcer by trade.')
      npc.say("Something I can help you with?")
      game.add('He doesn\'t seem interested in talking until you\'ve proven yourself.')
      npc.leaveOption("You back away slowly.", "Mind how you go.")
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
      npc.option('You know Elvis?', 'askElvis')
        .option("Who runs these streets?", 'askTerritory')
        .option('I need work.', 'work')
        .leaveOption("You back away slowly.", "Mind how you go.")
    },
    askElvis: (g: Game) => {
      const npc = g.npc
      npc.say("Elvis and me go way back. I handle the rough stuff. He does the thinking. You want to talk to the boss, you find him—I'm not a messenger.")
      npc.chat()
    },
    askTerritory: (g: Game) => {
      const npc = g.npc
      npc.say("Same as always. Elvis's word is law down here. I make sure people remember it.")
      npc.chat()
    },
    work: (g: Game) => {
      const npc = g.npc
      npc.say("Maybe. You look like you could hold your own. But I don't hire strangers. Earn Elvis's nod first—then we'll talk.")
      npc.chat()
    },
  },
})

registerNPC('elvis-crowe', {
  name: 'Elvis Crowe',
  uname: 'intimidating gangster',
  description: 'Tall and imposing, with eyes that have seen too much and forgotten nothing. His presence commands respect and fear in equal measure. Dressed in fine but practical attire, he moves through the streets like a predator, and the very air seems to still when he passes. Those who cross him don\'t last long in these parts.',
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
      npc.chat()
    },
    wordOnStreet: (g: Game) => {
      const npc = g.npc
      npc.say("Constables are jumpy. The Spice Dealer's been moving product. And someone's been asking questions about the old mill. You didn't hear it from me.")
      npc.chat()
    },
    work: (g: Game) => {
      const npc = g.npc
      npc.say("Maybe. I don't hand out errands to every face that walks up. Prove you're useful—or at least not a liability. Check back when you've got something to show.")
      npc.chat()
    },
  },
})


// Register all location definitions when module loads
Object.entries(LOWTOWN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
