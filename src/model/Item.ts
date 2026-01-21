import { Game } from './Game'
import type { Script } from './Scripts'
import { consumeAlcohol } from '../story/Effects'
import { capitalise } from './Text'
import type { StatName } from './Stats'
import type { Player } from './Player'

export type ItemId = string

// Mutable data for an item, used for serialization
export interface ItemData {
  id: ItemId
  number: number
}

// Static / library information for an item
export interface ItemDefinition {
  name: string
  description?: string
  image?: string
  stackable?: boolean
  onConsume?: Script
  onExamine?: Script
  calcStats?: (player: Player, item: Item, stats: Map<StatName, number>) => void
}

// Item definitions as a plain object for better ergonomics and editing
// These are the standard items. Others might be added elsewhere
const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  crown: {
    name: 'Krona',
    description: 'A currency used throughout the city.',
    stackable: true,
  },
  'pocket-watch': {
    name: 'pocket watch',
    description: 'A fine brass pocket watch with intricate gears.',
  },
  'room-key': {
    name: 'room key',
    description: 'A brass key to your lodgings in the backstreets.',
  },
  'test-item': {
    name: 'test item',
    description: 'A test item for testing purposes.',
  },
  'sweet-wine': {
    name: 'sweet wine',
    stackable: true,
    description: 'A bottle of sweet wine with an intoxicating aroma.',
    onConsume: (game: Game, _params: {}) => {
      consumeAlcohol(game, 60)
    },
  },
  'acceptance-letter': {
    name: 'acceptance letter',
    description: 'A formal letter with an official seal.',
    onExamine: (game: Game, _params: {}) => {
      game.clearScene()
      game.add([
        'You unfold the crisp parchment and read:',
        '',
        'Dear '+game.player.name+',',
        '',
        'We are pleased to inform you that your application has been accepted. You have been granted admission to the Academy of Mechanical Arts and Sciences.',
        '',
        'Please arrive at the Academy of Mechanical Arts and Sciences at 9am on the 6th Jan, 1902',
        '',
        'Welcome to a new chapter in your life.',
        '',
        'Signed,',
        'The Academy Board of Admissions'
      ])
    },
  },
  'brass-trinket': {
    name: 'brass t rinket',
    description: 'A small, intricate brass trinket with delicate gears that catch the light.',
    stackable: true,
  },
  'clockwork-toy': {
    name: 'clockwork toy',
    description: 'A charming mechanical toy that moves when wound. The gears inside click and whir with precision.',
  },
  'steam-whistle': {
    name: 'steam whistle',
    description: 'A small brass whistle that emits a high-pitched steam-powered sound when blown.',
  },
  'lucky-charm': {
    name: 'lucky charm',
    description: 'A small mechanical charm made of brass gears and cogs. It feels warm to the touch.',
  },
  'mysterious-gear': {
    name: 'mysterious gear',
    description: 'An unusual gear of unknown origin. It seems to be part of something larger.',
    stackable: true,
  },
  'glowing-crystal': {
    name: 'glowing crystal',
    stackable: true,
    description: 'A crystal that glows with a soft inner light, wrapped in brass wire and gears.',
  },
  'magic-potion': {
    name: 'magic potion',
    description: 'A mysterious potion that glimmers with an otherworldly light. Drinking it may enhance your abilities.',
    onConsume: (game: Game, _params: {}) => {
      // Add +5 to all main stats with 50% chance each
      const mainStats = ['Agility', 'Perception', 'Wits', 'Charm', 'Willpower', 'Strength']
      mainStats.forEach(statName => {
        game.run('addStat', { 
          stat: statName, 
          change: 5, 
          chance: 0.5
        })
      })
    },
  },
  'fun-juice': {
    name: 'fun juice',
    description: 'A vibrant, fizzy drink that promises to lift your spirits and add some excitement.',
    onConsume: (game: Game, _params: {}) => {
      // Add +10 Mood and +15 Arousal
      game.run('addStat', { stat: 'Mood', change: 10 })
      game.run('addStat', { stat: 'Arousal', change: 15 })
    },
  },
  spice: {
    name: 'Spice',
    stackable: true,
    description: 'A strange compound that lifts the spirits. Unpredictable side effects.',
    onConsume: (game: Game, _params: {}) => {
      game.run('addStat', { stat: 'Mood', change: 5, max: 100 })
      if (Math.random() < 0.5) consumeAlcohol(game, 60)
      game.player.calcStats()
    },
  },
}

/** Represents a game item instance with mutable state. Definitional data is accessed via the template property. */
export class Item {
  id: ItemId
  number: number

  constructor(id: ItemId, number: number = 1) {
    this.id = id
    this.number = number
  }

  /** Gets the item definition template. */
  get template(): ItemDefinition {
    const definition = ITEM_DEFINITIONS[this.id]
    if (!definition) {
      throw new Error(`Item definition not found: ${this.id}`)
    }
    return definition
  }

  /**
   * Gets a display name with appropriate prefix (number for stackable items, "a"/"an" for others).
   * Returns capitalized names. Examples: "20 Krona", "a Clockwork Toy", "3 Sweet Wine", "an Acceptance Letter"
   */
  getAName(): string {
    const isStackable = this.template.stackable ?? false
    if (isStackable && this.number > 1) {
      return `${this.number} ${capitalise(this.template.name)}`
    } else if (isStackable && this.number === 1) {
      return capitalise(this.template.name)
    } else {
      // Non-stackable items - prepend "a" or "an" based on first letter
      const name = this.template.name
      const firstLetter = name.charAt(0).toLowerCase()
      const startsWithVowel = ['a', 'e', 'i', 'o', 'u'].includes(firstLetter)
      const article = startsWithVowel ? 'an' : 'a'
      return `${article} ${capitalise(name)}`
    }
  }

  toJSON(): ItemData {
    return {
      id: this.id,
      number: this.number,
    }
  }

  static fromJSON(json: string | ItemData): Item {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const itemId = data.id
    
    if (!itemId) {
      throw new Error('Item.fromJSON requires an id')
    }
    
    // Verify definition exists
    if (!ITEM_DEFINITIONS[itemId]) {
      throw new Error(`Item definition not found: ${itemId}`)
    }
    
    // Create item instance with id and number
    const number = data.number ?? 1
    const item = new Item(itemId, number)
    
    return item
  }
}

// Get an item definition by id
export function getItem(id: ItemId): ItemDefinition | undefined {
  return ITEM_DEFINITIONS[id]
}

// Ensure an ItemSpec is converted to an Item instance.
// ItemSpec is string | Item - if string, creates Item(id, 1); if Item, returns it
export function ensureItem(itemSpec: string | Item): Item {
  return typeof itemSpec === 'string' ? new Item(itemSpec, 1) : itemSpec
}
