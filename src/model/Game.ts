import { Player, type PlayerData } from './Player'
import { Location, type LocationData, getLocation as getLocationDefinition } from './Location'
import { runScript as runScriptImpl } from './Scripts'
import { Card } from './Card'

export type ParagraphContent = 
  | { type: 'text'; text: string }
  | { type: 'highlight'; text: string; color: string; hoverText?: string }

export type SceneContentItem = 
  | { type: 'text'; text: string; color?: string }
  | { type: 'paragraph'; content: ParagraphContent[] }

export type SceneOptionItem = 
  | { type: 'button'; script: [string, {}]; label?: string }

export type SceneData = {
  type: 'story'
  content: SceneContentItem[]
  options: SceneOptionItem[]
}

export interface GameData {
  version: number
  score: number
  player: PlayerData
  locations: Record<string, LocationData>
  currentLocation?: string
  scene: SceneData
  time: number
}

/** Main game state container that manages version, score, and player data with JSON serialization support. */
export class Game {
  version: number
  score: number
  player: Player
  locations: Map<string, Location>
  currentLocation: string
  scene: SceneData
  time: number

  constructor() {
    this.version = 1
    this.score = 0
    this.player = new Player()
    this.locations = new Map<string, Location>()
    this.currentLocation = 'station'
    this.scene = {
      type: 'story',
      content: [],
      options: [],
    }
    
    // Initialize time to noon on January 1, 1902 (unix timestamp in seconds)
    // JavaScript Date: year, month (0-indexed), day, hours, minutes, seconds
    const startDate = new Date(1902, 0, 5, 12, 0, 0)
    this.time = Math.floor(startDate.getTime() / 1000)
    
    // Initialize with station location from registry
    this.ensureLocation('station')
  }

  /** Gets the current location. Always returns a valid Location. */
  get location(): Location {
    return this.getLocation(this.currentLocation)
  }

  /** Ensures a location exists in the game's locations map, creating a new instance if needed. Throws if location definition doesn't exist. */
  ensureLocation(locationId: string): void {
    if (!this.locations.has(locationId)) {
      // Verify the location definition exists
      if (!getLocationDefinition(locationId)) {
        throw new Error(`Location definition not found: ${locationId}`)
      }
      const location = new Location(locationId)
      this.locations.set(locationId, location)
    }
  }

  /** Gets a location from the game's locations map, ensuring it exists first. Returns the Location instance. */
  getLocation(locationId: string): Location {
    this.ensureLocation(locationId)
    const location = this.locations.get(locationId)
    if (!location) {
      // This should never happen after ensureLocation, but TypeScript needs this
      throw new Error(`Location not found: ${locationId}`)
    }
    return location
  }

  /** Add an option button to the current scene that runs a script. */
  addOption(scriptName: string, params: {} = {}, label?: string): Game {
    this.scene.options.push({ type: 'button', script: [scriptName, params], label })
    return this;
  }

  /** 
   * Add content or options to the current scene. Supports fluent chaining.
   * - String: adds as text content
   * - SceneContentItem: adds directly as content
   * - SceneOptionItem: adds directly as option
   * - Array: adds all items in sequence
   */
  add(item: string | SceneContentItem | SceneOptionItem | Array<string | SceneContentItem | SceneOptionItem>): this {
    if (typeof item === 'string') {
      // This is a normal descriptive paragraph
      this.scene.content.push({ type: 'paragraph', content: [{ type: 'text', text: item }] })
    } else if (Array.isArray(item)) {
      item.forEach(i => this.add(i))
    } else if ('script' in item) {
      // It's a SceneOptionItem
      this.scene.options.push(item)
    } else {
      // It's already a SceneContentItem
      this.scene.content.push(item)
    }
    return this
  }

  /** Run a script on this game instance. Returns this for fluent chaining. */
  run(scriptName: string, params: {} = {}): this {
    runScriptImpl(scriptName, this, params)
    return this
  }

  /** Add a quest card to the player. Returns this for fluent chaining. */
  addQuest(questId: string, args: Record<string, unknown> = {}): this {
    // Check if player already has this quest
    const hasQuest = this.player.cards.some(card => card.id === questId)
    if (!hasQuest) {
      // Get card definition (will throw if not found)
      const quest = new Card(questId, 'Quest')
      const cardDef = quest.template
      
      // Apply any additional args to the card instance
      Object.keys(args).forEach(key => {
        quest[key] = args[key]
      })
      
      this.player.cards.push(quest)
      this.add({ type: 'text', text: `Quest received: ${cardDef.name}`, color: '#3b82f6' })
    }
    
    return this
  }

  /** Complete a quest card. Returns this for fluent chaining. */
  completeQuest(questId: string): this {
    const quest = this.player.cards.find(card => card.id === questId)
    if (quest && !quest.completed) {
      quest.completed = true
      const cardDef = quest.template
      this.add({ type: 'text', text: `Quest completed: ${cardDef.name}`, color: '#10b981' })
    }
    
    return this
  }

  /** Add an effect card to the player. Returns this for fluent chaining. */
  addEffect(effectId: string, args: Record<string, unknown> = {}): this {
    // Check if player already has this effect
    const hasEffect = this.player.cards.some(card => card.id === effectId && card.type === 'Effect')
    if (!hasEffect) {
      // Get card definition (will throw if not found)
      const effect = new Card(effectId, 'Effect')
      const cardDef = effect.template
      
      // Apply any additional args to the card instance
      Object.keys(args).forEach(key => {
        effect[key] = args[key]
      })
      
      this.player.cards.push(effect)
      this.add({ type: 'text', text: `Effect: ${cardDef.name}`, color: '#a855f7' })
      // Recalculate stats after adding an effect
      this.calcStats()
    }
    
    return this
  }

  /** Calculate the number of interval boundaries crossed based on game time. */
  calcTicks(secondsElapsed: number, interval: number): number {
    const currentPeriod = Math.floor(this.time / interval)
    const previousPeriod = Math.floor((this.time - secondsElapsed) / interval)
    return currentPeriod - previousPeriod
  }

  /**
   * Calculate stats by copying basestats to stats, then applying modifiers from active Items and Cards.
   * This should be called whenever stats need to be recalculated (e.g., when items/cards change).
   */
  calcStats(): void {
    this.player.calcStats(this)
  }

  /** Clear the current scene (resets content and options). */
  clearScene(): void {
    this.scene = {
      type: 'story',
      content: [],
      options: [],
    }
  }

  toJSON(): GameData {
    const locationsRecord: Record<string, LocationData> = {}
    this.locations.forEach((location, id) => {
      locationsRecord[id] = location.toJSON()
    })
    
    return {
      version: this.version,
      score: this.score,
      player: this.player.toJSON(),
      locations: locationsRecord,
      currentLocation: this.currentLocation,
      scene: this.scene,
      time: this.time,
    }
  }

  static fromJSON(json: string | GameData): Game {
    // Use Partial<> for backwards compatibility with old saves that might be missing required fields
    const data = typeof json === 'string' ? JSON.parse(json) : json as Partial<GameData> & { version: number; player: PlayerData }
    const game = new Game() 
    game.version = data.version
    game.score = data.score ?? 0
    game.player = Player.fromJSON(data.player)
    game.currentLocation = data.currentLocation ?? 'station'
    game.time = data.time ?? game.time // Use provided time or keep default from constructor
    
    // Recalculate stats after loading player
    game.calcStats()
    
    // Handle scene deserialization - migrate old format or use new format
    if (data.scene) {
      if ('type' in data.scene && data.scene.type === 'story') {
        // New format
        game.scene = data.scene as SceneData
      } else if ('dialog' in data.scene || 'next' in data.scene) {
        // Old format - migrate to new format
        const oldScene = data.scene as { dialog?: string; next?: string }
        game.scene = {
          type: 'story',
          content: oldScene.dialog ? [{ type: 'text', text: oldScene.dialog }] : [],
          options: oldScene.next ? [{ type: 'button', script: [oldScene.next, {}] }] : [],
        }
      }
      // If scene exists but doesn't match expected format, keep default from constructor
    }
    
    // Deserialize locations map - create copies from prototypes and apply serialized changes
    if (data.locations) {
      game.locations = new Map<string, Location>()
      Object.entries(data.locations).forEach(([id, locationData]) => {
        // Ensure id matches the key (for backwards compatibility)
        const locationDataWithId: LocationData = Object.assign({ id }, locationData as LocationData)
        const location = Location.fromJSON(locationDataWithId)
        game.locations.set(id, location)
      })
    }
    
    // Ensure currentLocation exists in the map, fallback to registry if missing
    game.getLocation(game.currentLocation)
    
    return game
  }
}

