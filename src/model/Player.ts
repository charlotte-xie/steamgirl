import { Item, type ItemData, ensureItem } from './Item'
import { Card, type CardData } from './Card'
import { type StatName, type SkillName, type MeterName, STAT_NAMES, SKILL_INFO } from './Stats'

export type ItemSpec = string | Item

export type TimerName = 
  | 'lastSleep'
  | 'lastNap'
  | 'lastWash'
  | 'lastExercise'

export interface PlayerData {
  name: string
  basestats?: Record<string, number>
  timers?: Record<string, number>
  inventory: ItemData[]
  cards: CardData[]
}

/** Represents the player character with name and JSON serialization capabilities. */
export class Player {
  name: string
  stats: Map<StatName, number>
  basestats: Map<StatName, number>
  timers: Map<TimerName, number>
  inventory: Item[]
  cards: Card[]

  constructor() {
    this.name = "Unnamed Player"
    this.basestats = new Map<StatName, number>()
    this.stats = new Map<StatName, number>()
    this.timers = new Map<TimerName, number>()
    // Initialize all stats to 0
    STAT_NAMES.forEach(statName => {
      this.basestats.set(statName, 0)
      this.stats.set(statName, 0)
    })
    // Initialize all meters to 0 (meters are now part of StatName)
    const METER_NAMES: MeterName[] = ['Energy', 'Arousal', 'Composure', 'Stress', 'Pain', 'Mood']
    METER_NAMES.forEach(meterName => {
      this.basestats.set(meterName, 0)
      this.stats.set(meterName, 0)
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
    
    // Convert timers Map to Record for JSON serialization
    const timersRecord: Record<string, number> = {}
    this.timers.forEach((value, timerName) => {
      timersRecord[timerName] = value
    })
    
    return {
      name: this.name,
      basestats: basestatsRecord,
      timers: timersRecord,
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
    
    // Deserialize timers
    if (data.timers) {
      player.timers.clear()
      Object.entries(data.timers).forEach(([timerName, value]) => {
        if (typeof value === 'number') {
          player.timers.set(timerName as TimerName, value as number)
        }
      })
    }
    // Note: calcStats will be called from Game.fromJSON after the game instance is available
    // Meters are now part of basestats, so they're deserialized with basestats above
    
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
   * Add a bonus/penalty to a stat. The stat can go outside 0-100 during calculation,
   * but will be bounded when calcStats completes.
   * @param statName - The stat to modify
   * @param bonus - The amount to add (can be negative for penalties)
   */
  addStat(statName: StatName, bonus: number): void {
    const currentValue = this.stats.get(statName) || 0
    this.stats.set(statName, currentValue + bonus)
  }

  /**
   * Calculate stats by copying basestats to stats, then applying modifiers from active Items and Cards.
   * This should be called whenever stats need to be recalculated (e.g., when items/cards change).
   * Stats are bounded to 0-100 only after all modifiers have been applied.
   */
  calcStats(): void {
    // Copy basestats to stats
    this.stats.clear()
    this.basestats.forEach((value, statName) => {
      this.stats.set(statName, value)
    })

    // Apply modifiers from active Items
    this.inventory.forEach(item => {
      const itemDef = item.template
      if (itemDef.calcStats) {
        itemDef.calcStats(this, item, this.stats)
      }
    })

    // Apply modifiers from active Cards
    this.cards.forEach(card => {
      const cardDef = card.template
      if (cardDef.calcStats) {
        cardDef.calcStats(this, card, this.stats)
      }
    })

    // Clamp all stats to 0-100 range after all modifiers have been applied
    this.stats.forEach((value, statName) => {
      this.stats.set(statName, Math.max(0, Math.min(100, value)))
    })
  }

  /**
   * Performs a skill test by rolling d100 and comparing against base stat + skill - difficulty.
   * @param statName - The stat or skill to test (if a skill, uses its basedOn main stat + skill value)
   * @param difficulty - The difficulty modifier (positive makes it harder, negative makes it easier)
   * @returns true if the test succeeds, false otherwise
   * 
   * Success conditions:
   * - Roll of 1 always succeeds
   * - Roll of 100 always fails
   * - Otherwise, succeeds if roll < (base stat + skill - difficulty)
   */
  skillTest(statName: StatName, difficulty: number = 0): boolean {
    // Roll d100 (1-100)
    const roll = Math.floor(Math.random() * 100) + 1

    // Special cases: 1 always succeeds, 100 always fails
    if (roll === 1) {
      return true
    }
    if (roll === 100) {
      return false
    }

    // Determine base stat and skill values
    let baseStat: number
    let skill: number

    // Check if statName is a skill by checking if it exists in SKILL_INFO
    if (statName in SKILL_INFO) {
      // It's a skill: use the basedOn main stat + the skill value
      const skillInfo = SKILL_INFO[statName as SkillName]
      if (skillInfo.basedOn) {
        baseStat = this.basestats.get(skillInfo.basedOn) || 0
        skill = this.basestats.get(statName) || 0
      } else {
        // Skill without basedOn (shouldn't happen, but handle gracefully)
        baseStat = this.basestats.get(statName) || 0
        skill = 0
      }
    } else {
      // It's a main stat: use the stat value, skill is 0
      baseStat = this.basestats.get(statName) || 0
      skill = 0
    }

    // Calculate success threshold: base stat + skill - difficulty
    const threshold = baseStat + skill - difficulty

    // Succeed if roll < threshold
    return roll < threshold
  }
}

