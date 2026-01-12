import { Item, type ItemData, ensureItem } from './Item'
import { Card, type CardData } from './Card'
import { type StatName, STAT_NAMES } from './Stats'
import type { Game } from './Game'

export type ItemSpec = string | Item

export interface PlayerData {
  name: string
  basestats?: Record<string, number>
  inventory: ItemData[]
  cards: CardData[]
}

/** Represents the player character with name and JSON serialization capabilities. */
export class Player {
  name: string
  stats: Map<StatName, number>
  basestats: Map<StatName, number>
  inventory: Item[]
  cards: Card[]

  constructor() {
    this.name = "Unnamed Player"
    this.basestats = new Map<StatName, number>()
    this.stats = new Map<StatName, number>()
    // Initialize all stats to 0
    STAT_NAMES.forEach(statName => {
      this.basestats.set(statName, 0)
      this.stats.set(statName, 0)
    })
    this.inventory = []
    this.cards = []
  }

  toJSON(): PlayerData {
    // Convert basestats Map to Record for JSON serialization
    const basestatsRecord: Record<string, number> = {}
    this.basestats.forEach((value, statName) => {
      basestatsRecord[statName] = value
    })
    
    return {
      name: this.name,
      basestats: basestatsRecord,
      inventory: this.inventory.map(item => item.toJSON()),
      cards: this.cards.map(card => card.toJSON()),
    }
  }

  static fromJSON(json: string | PlayerData): Player {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const player = new Player()
    player.name = data.name
    
    // Deserialize basestats
    if (data.basestats) {
      player.basestats.clear()
      Object.entries(data.basestats).forEach(([statName, value]) => {
        if (typeof value === 'number') {
          player.basestats.set(statName as StatName, value as number)
        }
      })
    }
    // Note: calcStats will be called from Game.fromJSON after the game instance is available
    
    if (data.inventory) {
      player.inventory = data.inventory.map((itemData: ItemData) => Item.fromJSON(itemData))
    } else {
      // If inventory is missing, clear the default inventory from constructor
      player.inventory = []
    }
    if (data.cards) {
      player.cards = data.cards.map((cardData: CardData) => Card.fromJSON(cardData))
    } else {
      // If cards is missing, start with empty array
      player.cards = []
    }
    return player
  }

  /**
   * Add an item to the inventory. Stacks with existing identical items if the item is stackable.
   * @param itemSpec - Either an item ID string or an Item instance
   * @param number - Optional quantity to add (defaults to 1 for string IDs, or the Item's number for Item instances)
   */
  addItem(itemSpec: ItemSpec, number?: number): void {
    const item = ensureItem(itemSpec)
    const quantity = number ?? item.number
    
    // Check if item is stackable
    const isStackable = item.template.stackable ?? false
    
    // Find existing item with same ID if stackable
    if (isStackable) {
      const existingItem = this.inventory.find(invItem => invItem.id === item.id)
      if (existingItem) {
        // Stack with existing item
        existingItem.number += quantity
        return
      }
    }
    
    // Add as new Item in inventory
    this.inventory.push(new Item(item.id, quantity))
  }

  /**
   * Remove an item from the inventory. Reduces stack size or removes the item entirely.
   * @param itemSpec - Either an item ID string or an Item instance
   * @param number - Optional quantity to remove (defaults to 1)
   */
  removeItem(itemSpec: ItemSpec, number: number = 1): void {
    const item = ensureItem(itemSpec)
    const itemId = item.id
    
    const itemIndex = this.inventory.findIndex(invItem => invItem.id === itemId)
    if (itemIndex === -1) {
      return // Item not found
    }
    
    const inventoryItem = this.inventory[itemIndex]
    inventoryItem.number -= number
    
    if (inventoryItem.number <= 0) {
      // Remove item entirely if quantity is 0 or less
      this.inventory.splice(itemIndex, 1)
    }
  }

  /**
   * Calculate stats by copying basestats to stats, then applying modifiers from active Items and Cards.
   * This should be called whenever stats need to be recalculated (e.g., when items/cards change).
   * Note: This method needs access to Game for the calcStats callbacks, so it takes game as a parameter.
   */
  calcStats(game: Game): void {
    // Copy basestats to stats
    this.stats.clear()
    this.basestats.forEach((value, statName) => {
      this.stats.set(statName, value)
    })

    // Apply modifiers from active Items
    this.inventory.forEach(item => {
      const itemDef = item.template
      if (itemDef.calcStats) {
        itemDef.calcStats(game, item, this.stats)
      }
    })

    // Apply modifiers from active Cards
    this.cards.forEach(card => {
      const cardDef = card.template
      if (cardDef.calcStats) {
        cardDef.calcStats(game, card, this.stats)
      }
    })

    // Clamp all stats to 0-100 range
    this.stats.forEach((value, statName) => {
      this.stats.set(statName, Math.max(0, Math.min(100, value)))
    })
  }
}

