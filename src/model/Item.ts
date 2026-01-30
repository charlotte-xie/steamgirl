import { Game } from './Game'
import type { Script } from './Scripts'
import { consumeAlcohol, eatFood } from '../story/Effects'
import { capitalise } from './Text'
import type { StatName } from './Stats'
import type { Player } from './Player'

export type ItemId = string

// Item categories for filtering in inventory
export type ItemCategory = 'Consumables' | 'Clothes' | 'Components' | 'Valuables' | 'Special'

// Clothing position - where on the body
export type ClothingPosition =
  | 'head'
  | 'face'
  | 'neck'
  | 'chest'
  | 'belly'
  | 'arms'
  | 'wrists'
  | 'hands'
  | 'waist'  // Belts, sashes
  | 'hips'   // Panties, skirts, trousers
  | 'legs'
  | 'feet'

// Clothing layer - what order items are worn in (innermost to outermost)
export type ClothingLayer =
  | 'body'       // Skin-level (tattoos, body paint)
  | 'under'      // Underwear layer (bra, panties, undershirt)
  | 'inner'      // Inner clothing (shirt, blouse, chemise)
  | 'outer'      // Outer clothing (jacket, coat, corset worn over blouse)
  | 'accessory'  // Accessories (jewelry, scarves, hats, gloves)

// Combined slot for worn items - position + layer
export interface ClothingSlot {
  position: ClothingPosition
  layer: ClothingLayer
}

// String key for the worn map (e.g., "chest:inner", "legs:under")
export type ClothingSlotKey = `${ClothingPosition}:${ClothingLayer}`

export function slotKey(position: ClothingPosition, layer: ClothingLayer): ClothingSlotKey {
  return `${position}:${layer}`
}

export function parseSlotKey(key: ClothingSlotKey): ClothingSlot {
  const [position, layer] = key.split(':') as [ClothingPosition, ClothingLayer]
  return { position, layer }
}

// Mutable data for an item, used for serialization
export interface ItemData {
  id: ItemId
  number: number
  worn?: boolean   // True if this item is currently worn (slots derived from definition)
  locked?: boolean // True if this item cannot be removed (cursed, restraints, etc.)
}

// Static / library information for an item
export interface ItemDefinition {
  name: string
  description?: string
  image?: string
  icon?: string           // SVG icon name for inventory display (see ItemIcons.tsx)
  category?: ItemCategory
  stackable?: boolean
  colour?: string                 // CSS colour for the item (tints icon SVGs and avatar image)
  imageTint?: string              // CSS colour for multiply-blend tinting on the avatar (defaults to colour)
  positions?: ClothingPosition[]  // For wearable items - where on the body (can occupy multiple)
  layer?: ClothingLayer           // For wearable items - what layer (under, inner, outer, accessory)
  onConsume?: Script
  onExamine?: Script
  onWorn?: (player: Player, item: Item) => void  // Called after item is worn
  calcStats?: (player: Player, item: Item, stats: Map<StatName, number>) => void
}

// Item definitions as a plain object for better ergonomics and editing
// These are the standard items. Others might be added elsewhere
const ITEM_DEFINITIONS: Record<ItemId, ItemDefinition> = {
  crown: {
    name: 'Krona',
    description: 'A currency used throughout the city.',
    category: 'Valuables',
    icon: 'money',
    stackable: true,
  },
  'pocket-watch': {
    name: 'pocket watch',
    description: 'A fine brass pocket watch with intricate gears.',
    category: 'Valuables',
    icon: 'gem',
  },
  'room-key': {
    name: 'room key',
    description: 'A brass key to your lodgings in the backstreets.',
    category: 'Special',
    icon: 'key',
  },
  'test-item': {
    name: 'test item',
    description: 'A test item for testing purposes.',
    category: 'Special',
    icon: 'star',
  },
  'sweet-wine': {
    name: 'sweet wine',
    stackable: true,
    description: 'A bottle of sweet wine with an intoxicating aroma.',
    category: 'Consumables',
    icon: 'drink',
    onConsume: (game: Game, _params: {}) => {
      consumeAlcohol(game, 60)
      eatFood(game, 20)
    },
  },
  'acceptance-letter': {
    name: 'acceptance letter',
    description: 'A formal letter with an official seal.',
    category: 'Special',
    icon: 'scroll',
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
  'clockwork-toy': {
    name: 'clockwork toy',
    description: 'A charming mechanical toy that moves when wound. The gears inside click and whir with precision.',
    category: 'Valuables',
    icon: 'cog',
  },
  'lucky-charm': {
    name: 'lucky charm',
    description: 'A small mechanical charm made of brass gears and cogs. It feels warm to the touch.',
    category: 'Special',
    icon: 'star',
  },
  'magic-potion': {
    name: 'magic potion',
    description: 'A mysterious potion that glimmers with an otherworldly light. Drinking it may enhance your abilities.',
    category: 'Consumables',
    icon: 'potion',
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
    category: 'Consumables',
    icon: 'drink',
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
    category: 'Consumables',
    icon: 'potion',
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
  worn: boolean   // True if this item is currently being worn
  locked: boolean // True if this item cannot be removed (cursed, restraints, etc.)

  constructor(id: ItemId, number: number = 1, worn: boolean = false, locked: boolean = false) {
    this.id = id
    this.number = number
    this.worn = worn
    this.locked = locked
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
    const data: ItemData = {
      id: this.id,
      number: this.number,
    }
    if (this.worn) {
      data.worn = true
    }
    if (this.locked) {
      data.locked = true
    }
    return data
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
    
    // Create item instance with id, number, worn state, and locked state
    const number = data.number ?? 1
    const worn = data.worn ?? false
    const locked = data.locked ?? false
    const item = new Item(itemId, number, worn, locked)

    return item
  }
}

// Register a new item definition
export function registerItemDefinition(id: ItemId, definition: ItemDefinition): void {
  if (ITEM_DEFINITIONS[id]) {
    console.warn(`Item definition already exists for id: ${id}`)
  }
  ITEM_DEFINITIONS[id] = definition
}

/**
 * Create a new item definition by extending an existing one.
 * Shallow-merges the base definition with the overrides.
 * @param baseId - The ID of the existing item to extend
 * @param overrides - Properties to override or add
 * @returns A new ItemDefinition combining base and overrides
 */
export function extendItem(baseId: ItemId, overrides: Partial<ItemDefinition>): ItemDefinition {
  const base = ITEM_DEFINITIONS[baseId]
  if (!base) {
    throw new Error(`Cannot extend item: base definition not found for id: ${baseId}`)
  }
  return { ...base, ...overrides }
}

// Z-order values for clothing layers (higher = rendered on top)
export const LAYER_Z: Record<ClothingLayer, number> = {
  body: 10,
  under: 20,
  inner: 30,
  outer: 40,
  accessory: 50,
}

// Z-order offsets for clothing positions (tiebreaker within same layer)
export const POSITION_Z: Record<ClothingPosition, number> = {
  feet: 0,
  legs: 1,
  hips: 2,
  belly: 3,
  neck: 3,
  chest: 4,
  face: 4,
  waist: 5,
  head: 5,
  arms: 6,
  hands: 7,
  wrists: 8,
}

/** Calculate the z-order for an item based on its layer and positions */
export function getItemZOrder(def: ItemDefinition): number {
  const layerZ = def.layer ? LAYER_Z[def.layer] : 0
  const positionZ = def.positions
    ? Math.max(...def.positions.map(p => POSITION_Z[p]))
    : 0
  return layerZ + positionZ
}

// Get an item definition by id
export function getItem(id: ItemId): ItemDefinition | undefined {
  return ITEM_DEFINITIONS[id]
}

/**
 * Create a tinted variant of an existing item.
 * Convenience wrapper around extendItem that sets imageTint.
 */
export function tintedItem(baseId: ItemId, colour: string, overrides: Partial<ItemDefinition>): ItemDefinition {
  return extendItem(baseId, { colour, imageTint: colour, ...overrides })
}

// Ensure an ItemSpec is converted to an Item instance.
// ItemSpec is string | Item - if string, creates Item(id, 1); if Item, returns it
export function ensureItem(itemSpec: string | Item): Item {
  return typeof itemSpec === 'string' ? new Item(itemSpec, 1) : itemSpec
}
