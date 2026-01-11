import { Game } from './Game'
import type { Script } from './Scripts'

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
    name: 'Pocket Watch',
    description: 'A fine brass pocket watch with intricate gears.',
  },
  'room-key': {
    name: 'Room Key',
    description: 'A brass key to your lodgings in the backstreets.',
  },
  'test-item': {
    name: 'Test Item',
    description: 'A test item for testing purposes.',
  },
  'sweet-wine': {
    name: 'Sweet Wine',
    stackable: true,
    description: 'A bottle of sweet wine with an intoxicating aroma.',
    onConsume: (game: Game, _params: {}) => {
      game.addEffect('intoxicated', { alcohol: 60 })
      // Remove one from inventory
      const wineItem = game.player.inventory.find(item => item.id === 'sweet-wine')
      if (wineItem) {
        game.player.removeItem('sweet-wine', 1)
      }
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
