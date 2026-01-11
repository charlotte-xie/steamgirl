import { Item, type ItemData, ensureItem } from './Item'

export type ItemSpec = string | Item

export interface Stats {
  agility: number
  brawn: number
  wits: number
  charm: number
}

export interface PlayerData {
  name: string
  stats: Stats
  inventory?: ItemData[]
}

/** Represents the player character with name and JSON serialization capabilities. */
export class Player {
  name: string
  stats: Stats
  inventory: Item[]

  constructor() {
    this.name = "Unnamed Player"
    this.stats = {
      agility: 0,
      brawn: 0,
      wits: 0,
      charm: 0,
    }
    this.inventory = []
    // Initialize with 20 crowns
    this.inventory.push(new Item('crown', 20))
  }

  toJSON(): PlayerData {
    return {
      name: this.name,
      stats: this.stats,
      inventory: this.inventory.map(item => item.toJSON()),
    }
  }

  static fromJSON(json: string | PlayerData): Player {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const player = new Player()
    player.name = data.name
    if (data.stats) {
      player.stats = data.stats
    }
    if (data.inventory) {
      player.inventory = data.inventory.map((itemData: ItemData) => Item.fromJSON(itemData))
    } else {
      // If inventory is missing, clear the default inventory from constructor
      player.inventory = []
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
    
    // Add as new item in inventory
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
}

