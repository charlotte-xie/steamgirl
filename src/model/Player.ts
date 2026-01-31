import { Item, type ItemData, ensureItem, type ClothingSlotKey, type ClothingPosition, type ClothingLayer } from './Item'
import { Card, type CardData } from './Card'
import { type StatName, type SkillName, type MeterName, STAT_NAMES, SKILL_INFO } from './Stats'
import { getImpressionCalculators } from './Impression'
import { type OutfitData, saveOutfit, deleteOutfit, getOutfitItems } from './Outfits'

export type ItemSpec = string | Item

export type TimerName =
  | 'lastAction'
  | 'lastSleep'
  | 'lastNap'
  | 'lastWash'
  | 'lastExercise'
  | 'lastEat'
  | 'lastHairstyle'

/** Named relationship labels for NPCs. Extensible via string literals. */
export type Relationship =
  | 'boyfriend'
  | 'girlfriend'
  | 'partner'
  | 'rival'
  | 'enemy'
  | string

export type Hairstyle = 'buns' | 'ponytail'

export interface PlayerData {
  name: string
  hairstyle?: Hairstyle
  basestats?: Record<string, number>
  timers?: Record<string, number>
  reputation?: Record<string, number>
  relationships?: Record<string, string>
  inventory: ItemData[]
  cards: CardData[]
  outfits?: OutfitData
}

/** Represents the player character with name and JSON serialization capabilities. */
export class Player {
  name: string
  stats: Map<StatName, number>
  basestats: Map<StatName, number>
  timers: Map<TimerName, number>
  reputation: Map<string, number>
  /** NPC relationships — maps NPC ID to relationship label (e.g. 'boyfriend', 'rival'). */
  relationships: Map<string, Relationship>
  inventory: Item[]
  cards: Card[]
  outfits: OutfitData
  hairstyle: Hairstyle
  /** Transient flag indicating the player is currently sleeping (not serialized) */
  sleeping: boolean

  constructor() {
    this.name = "" // Empty name indicates uninitialized character
    this.hairstyle = 'buns'
    this.sleeping = false
    this.basestats = new Map<StatName, number>()
    this.stats = new Map<StatName, number>()
    this.timers = new Map<TimerName, number>()
    this.reputation = new Map<string, number>()
    this.relationships = new Map<string, string>()
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
    this.outfits = {}
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

    // Convert reputation Map to Record (only non-zero entries)
    const reputationRecord: Record<string, number> = {}
    this.reputation.forEach((value, repName) => {
      if (value !== 0) {
        reputationRecord[repName] = value
      }
    })

    // Convert relationships Map to Record
    const relationshipsRecord: Record<string, string> = {}
    this.relationships.forEach((value, npcId) => {
      relationshipsRecord[npcId] = value
    })

    return {
      name: this.name,
      hairstyle: this.hairstyle,
      basestats: basestatsRecord,
      timers: timersRecord,
      reputation: Object.keys(reputationRecord).length > 0 ? reputationRecord : undefined,
      relationships: Object.keys(relationshipsRecord).length > 0 ? relationshipsRecord : undefined,
      inventory: this.inventory.map(item => item.toJSON()),
      cards: this.cards.map(card => card.toJSON()),
      outfits: this.outfits,
    }
  }

  static fromJSON(json: string | PlayerData): Player {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const player = new Player()
    player.name = data.name
    player.hairstyle = data.hairstyle ?? 'buns'

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
    // Deserialize reputation
    if (data.reputation) {
      Object.entries(data.reputation).forEach(([repName, value]) => {
        if (typeof value === 'number') {
          player.reputation.set(repName, value)
        }
      })
    }

    // Deserialize relationships
    if (data.relationships) {
      Object.entries(data.relationships).forEach(([npcId, value]) => {
        if (typeof value === 'string') {
          player.relationships.set(npcId, value)
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
      player.cards = data.cards
        .map((cardData: CardData) => {
          try {
            return Card.fromJSON(cardData)
          } catch (error) {
            console.error(`Failed to deserialize card:`, cardData, error)
            return null
          }
        })
        .filter((card: Card | null): card is Card => card !== null)
    } else {
      // If cards is missing, start with empty array
      player.cards = []
    }

    // Deserialize outfits
    if (data.outfits) {
      player.outfits = data.outfits
    }

    return player
  }

  /** Check if the player has a card with the given ID. */
  hasCard(cardId: string): boolean {
    return this.cards.some(c => c.id === cardId)
  }

  /** Set a timer to the current game time. */
  setTimer(timerName: TimerName, time: number): void {
    this.timers.set(timerName, time)
  }

  /**
   * Get a timer value, initialising it to lastAction time if not yet set.
   * Returns the timer value (existing or newly initialised).
   */
  getTimer(timerName: TimerName): number {
    let value = this.timers.get(timerName)
    if (value === undefined) {
      value = this.timers.get('lastAction') ?? 0
      this.timers.set(timerName, value)
    }
    return value
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
   * @returns the item removed, or null if the item was not found
   */
  removeItem(itemSpec: ItemSpec, number: number = 1): Item | null {
    const item = ensureItem(itemSpec)
    const itemId = item.id
    
    const itemIndex = this.inventory.findIndex(invItem => invItem.id === itemId)
    if (itemIndex === -1) {
      return null// Item not found
    }
    
    const inventoryItem = this.inventory[itemIndex]
    inventoryItem.number -= number
    
    if (inventoryItem.number <= 0) {
      // Remove item entirely if quantity is 0 or less
      this.inventory.splice(itemIndex, 1)
    }
    return new Item(itemId, number)
  }

  /**
   * Count how many of a given item the player owns (works for both stackable and non-stackable items).
   */
  countItem(itemId: string): number {
    return this.inventory
      .filter(i => i.id === itemId)
      .reduce((sum, i) => sum + i.number, 0)
  }

  /**
   * Wear an item from inventory. Marks it as worn.
   * Items can occupy multiple positions at the same layer (e.g., a dress covers chest + legs).
   * If something is already worn in any slot, it is unworn first (unless locked).
   * @param itemSpec - Either an item ID string or an Item instance
   * @returns true if successfully worn, false if item not found, not wearable, or blocked by locked item
   */
  wearItem(itemSpec: ItemSpec): boolean {
    const item = ensureItem(itemSpec)
    const { positions, layer } = item.template
    if (!positions || positions.length === 0 || !layer) {
      return false // Item is not wearable (needs positions and layer)
    }

    // Find the item in inventory (must not already be worn).
    // If the exact instance is in inventory, use it directly; otherwise find by ID.
    const invItem = this.inventory.includes(item)
      ? (item.worn ? null : item)
      : this.inventory.find(i => i.id === item.id && !i.worn)
    if (!invItem) {
      return false // Item not in inventory or already worn
    }

    // Check if any slot is blocked by a locked item
    for (const position of positions) {
      const existingItem = this.getWornAt(position, layer)
      if (existingItem?.locked) {
        return false // Cannot wear - slot blocked by locked item
      }
    }

    // Unwear any existing items in all slots this item will occupy
    for (const position of positions) {
      const existingItem = this.getWornAt(position, layer)
      if (existingItem) {
        existingItem.worn = false
      }
    }

    // Mark the item as worn
    invItem.worn = true

    // Call onWorn hook if defined
    const template = invItem.template
    if (template.onWorn) {
      template.onWorn(this, invItem)
    }

    return true
  }

  /**
   * Remove a worn item (mark as not worn).
   * Will not remove locked items unless force is true.
   * @param slotKeyOrItemId - Either a slot key (e.g., "chest:inner") or an item ID
   * @param force - If true, removes even locked items (for special unlock mechanics)
   * @returns the item that was unworn, or null if nothing was worn or item is locked
   */
  unwearItem(slotKeyOrItemId: ClothingSlotKey | string, force: boolean = false): Item | null {
    // First try as a slot key (e.g., "chest:inner")
    if (slotKeyOrItemId.includes(':')) {
      const [position, layer] = slotKeyOrItemId.split(':') as [ClothingPosition, ClothingLayer]
      const wornItem = this.getWornAt(position, layer)
      if (wornItem) {
        if (wornItem.locked && !force) {
          return null // Cannot remove locked item
        }
        wornItem.worn = false
        return wornItem
      }
      return null
    }

    // Try as an item ID
    const wornItem = this.inventory.find(i => i.id === slotKeyOrItemId && i.worn)
    if (wornItem) {
      if (wornItem.locked && !force) {
        return null // Cannot remove locked item
      }
      wornItem.worn = false
      return wornItem
    }

    return null
  }

  /**
   * Check if an item is currently worn.
   * @param itemId - The item ID to check
   * @returns true if the item is worn
   */
  isWearing(itemId: string): boolean {
    return this.inventory.some(item => item.id === itemId && item.worn)
  }

  /**
   * Get the item worn in a specific slot.
   * @param slotKey - The clothing slot key (e.g., "chest:inner") to check
   * @returns the worn item, or undefined if nothing is worn
   */
  getWorn(slotKey: ClothingSlotKey): Item | undefined {
    const [position, layer] = slotKey.split(':') as [ClothingPosition, ClothingLayer]
    return this.getWornAt(position, layer)
  }

  /**
   * Get the item worn at a specific position and layer.
   * @param position - The body position to check
   * @param layer - The clothing layer to check
   * @returns the worn item covering that position/layer, or undefined
   */
  getWornAt(position: ClothingPosition, layer: ClothingLayer): Item | undefined {
    return this.inventory.find(item => {
      if (!item.worn) return false
      const def = item.template
      if (def.layer !== layer) return false
      return def.positions?.includes(position) ?? false
    })
  }

  /**
   * Get all currently worn items.
   * @returns array of worn items
   */
  getWornItems(): Item[] {
    return this.inventory.filter(item => item.worn)
  }

  /**
   * Strip all worn items (unwear everything).
   * Skips locked items unless force is true.
   * @param force - If true, removes even locked items
   */
  stripAll(force: boolean = false): void {
    this.inventory.forEach(item => {
      if (item.worn && (force || !item.locked)) {
        item.worn = false
      }
    })
  }

  /**
   * Save the currently worn items as an outfit.
   * @param name - The name for the outfit
   * @param thumbnail - Optional data URL of an avatar snapshot
   */
  saveOutfit(name: string, thumbnail?: string): void {
    const wornItemIds = this.getWornItems().map(item => item.id)
    this.outfits = saveOutfit(this.outfits, name, wornItemIds, thumbnail)
  }

  /**
   * Delete an outfit.
   * @param name - The name of the outfit to delete
   */
  deleteOutfit(name: string): void {
    this.outfits = deleteOutfit(this.outfits, name)
  }

  /**
   * Wear an outfit (strip current clothes and wear the outfit items).
   * Only wears items that exist in inventory.
   * @param name - The name of the outfit to wear
   * @returns true if outfit exists, false otherwise
   */
  wearOutfit(name: string): boolean {
    const itemIds = getOutfitItems(this.outfits, name)
    if (itemIds.length === 0 && !(name in this.outfits)) return false

    // Strip all current clothes
    this.stripAll()

    // Wear each item in the outfit (if it exists in inventory)
    for (const itemId of itemIds) {
      this.wearItem(itemId)
    }

    return true
  }

  /**
   * Add an outfit's items on top of what is currently worn (no strip).
   * Items that conflict with existing worn items will swap them out.
   * @param name - The name of the outfit to add
   * @returns true if outfit exists, false otherwise
   */
  addOutfit(name: string): boolean {
    const itemIds = getOutfitItems(this.outfits, name)
    if (itemIds.length === 0 && !(name in this.outfits)) return false

    for (const itemId of itemIds) {
      this.wearItem(itemId)
    }

    return true
  }

  /**
   * Strip all clothes and wear random items from inventory until decency reaches
   * the target threshold (default 50). Items are shuffled and tried in random order;
   * each item that is successfully worn triggers a stat recalc to check decency.
   */
  randomDress(targetDecency: number = 50): void {
    this.stripAll()

    // Collect all wearable, unworn inventory items
    const candidates = this.inventory.filter(item =>
      !item.worn && item.template.positions?.length && item.template.layer
    )

    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }

    for (const item of candidates) {
      this.wearItem(item)
      this.calcStats()
      if ((this.stats.get('decency') ?? 0) >= targetDecency) break
    }
  }

  /**
   * Apply a temporary modifier to a stat. The stat can go outside 0-100 during calculation,
   * but will be bounded when calcStats completes. This is used by calcStats callbacks
   * (items, effects) to apply bonuses/penalties that reset each time stats are recalculated.
   * @param statName - The stat to modify
   * @param bonus - The amount to add (can be negative for penalties)
   */
  modifyStat(statName: StatName, bonus: number): void {
    const currentValue = this.stats.get(statName) || 0
    this.stats.set(statName, currentValue + bonus)
  }

  /**
   * Modify a base stat by an amount, bounded to 0-100.
   * Returns the actual change applied (may differ from amount due to bounds).
   * @param statName - The stat to modify
   * @param amount - The amount to add (can be negative)
   */
  addBaseStat(statName: StatName, amount: number): number {
    const current = this.basestats.get(statName) ?? 0
    const newValue = Math.max(0, Math.min(100, current + amount))
    this.basestats.set(statName, Math.round(newValue))
    return newValue - current
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

    // Compute impression base values from registered calculators
    for (const [name, calc] of getImpressionCalculators()) {
      this.stats.set(name, calc(this))
    }

    // Apply modifiers from inventory items
    this.inventory.forEach(item => {
      const itemDef = item.template
      if (!itemDef.calcStats) return

      // Wearable items (have positions and layer) only apply when worn
      const isWearable = itemDef.positions && itemDef.positions.length > 0 && itemDef.layer
      if (isWearable && !item.worn) return

      itemDef.calcStats(this, item, this.stats)
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

  /** True if the player's base value for the given skill (or stat) is at least minLevel. */
  hasSkill(statOrSkill: StatName, minLevel: number =1): boolean {
    return (this.basestats.get(statOrSkill) ?? 0) >= minLevel
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

