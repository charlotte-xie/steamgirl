import { Player, type PlayerData } from './Player'
import { Location, type LocationData, getLocation as getLocationDefinition } from './Location'
import { NPC, type NPCData, getNPCDefinition } from './NPC'
import { getScript, isInstruction, isScriptFn, type Instruction, type Script } from './Scripts'
import { Card, type CardType, type Reminder } from './Card'
import { type Content, type InlineContent, type ParagraphContent, type SceneOptionItem } from './Format'
import { intervalsCrossed } from '../utils/intervalsCrossed'

// Re-export Content types for convenience
export type { Content, InlineContent, ParagraphContent, SceneOptionItem }

// Legacy alias - use Content instead
export type SceneContentItem = Content

export type ShopItemEntry = {
  itemId: string
  price: number
}

export type ActiveShop = {
  name: string
  npcId?: string
  items: ShopItemEntry[]
}

export type SceneData = {
  type: 'story'
  content: Content[]
  options: SceneOptionItem[]
  /** Set when the scene is an NPC interaction (from the approach script). */
  npc?: string
  /** When true, do not show the NPC image in the scene overlay. Set by approach to false; e.g. landlord sets true when showing rooms. */
  hideNpcImage?: boolean
  /** When set, the scene renders as a shop interface. */
  shop?: ActiveShop
  /** Pending scene pages. Each entry is a single Instruction (e.g. seq). Consumed front-to-back; branches prepend. */
  stack: Instruction[]
}

export interface GameData {
  version: number
  score: number
  player: PlayerData
  locations: Record<string, LocationData>
  npcs?: Record<string, NPCData>
  currentLocation?: string
  scene: SceneData
  time: number
}

/** 
 * Main game state object that represents the current state of the game with JSON serialization support. 
 * 
 * Standard Game loop (given a starting  / loaded state):
 * 1. beforeAction() called to set up any fields needed to present actions to the player (i.e. not present in the game state object)
 *    - Must be idempotent / transient
 * 2. takeAction(scriptName, params) called to implement the player action
 *    - clear current scene
 *    - run script fort player action
 *    - update player state
 * 3. afterAction() runs everything else that needs to be done after the action
 *    - run any card effects that might change game state / trigger a new scene
 *    - move any NPCs
 * 4. Go back to step 1
 * 
*/
export class Game {
  version: number
  score: number
  player: Player
  locations: Map<string, Location>
  npcs: Map<string, NPC>
  npcsPresent: string[] // List of NPC IDs at the current location
  currentLocation: string
  scene: SceneData
  time: number

  // Transient UI state (not serialized, survives HMR)
  uiScreen: string = 'game'
  isDebug: boolean = false

  constructor() {
    this.version = 1
    this.score = 0
    this.player = new Player()
    this.locations = new Map<string, Location>()
    this.npcs = new Map<string, NPC>()
    this.npcsPresent = []
    this.currentLocation = 'station'
    this.scene = {
      type: 'story',
      content: [],
      options: [],
      stack: [],
    }
    
    // Initialize time to noon on January 1, 1902 (unix timestamp in seconds)
    // JavaScript Date: year, month (0-indexed), day, hours, minutes, seconds
    const startDate = new Date(1902, 0, 5, 12, 0, 0)
    this.time = Math.floor(startDate.getTime() / 1000)
    
    // Note: Location will be created lazily when first accessed via getLocation()
    // This allows Game constructor to work without requiring story content to be loaded
  }

  /** Gets the current location. Always returns a valid Location. */
  get location(): Location {
    return this.getLocation(this.currentLocation)
  }

  /** Gets the current game time as a Date object. */
  get date(): Date {
    return new Date(this.time * 1000)
  }

  /** Gets the current hour of day as a fractional number (0-23.99). */
  get hourOfDay(): number {
    const date = this.date
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  }

  /** Collects transient reminders from all player cards that define a reminders hook. */
  get reminders(): Reminder[] {
    const result: Reminder[] = []
    for (const card of this.player.cards) {
      const hook = card.template.reminders
      if (hook) result.push(...hook(this, card))
    }
    return result
  }

  /** Gets a location from the game's locations map, creating it if needed. Returns the Location instance. Throws if location definition doesn't exist. */
  getLocation(locationId: string): Location {
    // Check if location already exists in the map
    const existingLocation = this.locations.get(locationId)
    if (existingLocation) {
      return existingLocation
    }
    
    // Location doesn't exist, need to create it
    // Verify the location definition exists
    const definition = getLocationDefinition(locationId)
    if (!definition) {
      throw new Error(`Location definition not found: ${locationId}`)
    }
    
    // Create the location instance and add it to the map
    const location = new Location(locationId)
    this.locations.set(locationId, location)
    
    return location
  }

  /** Moves the player to a new location and updates npcsPresent. */
  moveToLocation(locationId: string): void {
    this.currentLocation = locationId
    this.updateNPCsPresent()
  }

  /** Checks if we are currently in a scene. This usually disables other actions like waiting. */
  get inScene(): boolean {
    return this.scene.options.length > 0 || !!this.scene.shop
  }

  /** Gets the current NPC. Throws if no NPC is in the current scene. */
  get npc(): NPC {
    if (!this.scene.npc) {
      throw new Error('No NPC in current scene')
    }
    const npc = this.npcs.get(this.scene.npc)
    if (!npc) {
      throw new Error(`NPC not found: ${this.scene.npc}`)
    }
    return npc
  }

  /** Gets an NPC from the game's NPCs map, generating it if needed. Returns the NPC instance. */
  getNPC(npcId: string): NPC {
    // Check if NPC already exists
    const existingNPC = this.npcs.get(npcId)
    if (existingNPC) {
      return existingNPC
    }
    
    // NPC doesn't exist, need to create it
    // Verify the NPC definition exists
    const definition = getNPCDefinition(npcId)
    if (!definition) {
      throw new Error(`NPC definition not found: ${npcId}`)
    }
    
    // Create the NPC instance
    const npc = new NPC(npcId, this)
    
    // Call generate function if it exists (to initialize any fields)
    if (definition.generate) {
      definition.generate(this, npc)
    }
    
    // Add NPC to map BEFORE calling onMove to prevent infinite recursion
    // (onMove might call getNPC, but now it will find the NPC in the map)
    this.npcs.set(npcId, npc)
    
    // Call onMove immediately after generation so NPC can position itself
    // This is safe now because the NPC is already in the map
    this.run(definition.onMove)
    
    return npc
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

  /** 
   * Set up any transient fields needed to present actions to the player.
   * Must be idempotent - can be called multiple times with the same result.
   * Called before presenting actions to the player.
   */
  beforeAction(): void {
    // Update npcsPresent list based on current location
    // This is transient data not stored in game state
    this.updateNPCsPresent()
  }

  /**
   * Implement a player action by running a script.
   * - Clears the current scene
   * - Runs the script for the player action
   * - Updates player state (handled by script)
   * - Catches errors and displays them gracefully to the player
   */
  takeAction(scriptName: string, params: {} = {}): void {
    // Record the time of this action
    this.player.setTimer('lastAction', this.time)

    // Clear the scene before running a new script
    this.clearScene()

    // Non-scene-management actions abandon the scene stack
    if (scriptName !== 'advanceScene') {
      this.scene.stack = []
    }

    try {
      // Get and run the script (may modify game state)
      const script = getScript(scriptName)
      if (!script) {
        throw new Error(`Player action script not found: ${scriptName}`)
      }
      script(this, params)
    } catch (error) {
      // Display a graceful error message to the player
      // Don't clear scene - preserve any content that was added before the error
      this.add('')
      this.add('There seems to be a glitch in the Matrix....')
      this.add('')
      const message = error instanceof Error ? error.message : String(error)
      this.add({ type: 'paragraph', content: [{ type: 'text', text: message, color: '#ff6b6b' }] })
      // TODO any cleanup?
    }
  }

  /**
   * Run everything that needs to happen after an action.
   * - Run any card effects that might change game state / trigger a new scene
   * - Move any NPCs (if needed)
   * - Recalculate stats to reflect any basestat changes
   */
  afterAction(): void {
    // Run afterUpdate scripts for all cards
    this.player.cards.forEach(card => {
      this.run(card.template.afterUpdate)
    })

    // Unset npc when there are no scene options and no pending scene pages
    if (this.scene.options.length === 0 && this.scene.stack.length === 0) {
      this.scene.npc = undefined
      this.scene.hideNpcImage = undefined
    }

    // Recalculate stats to ensure UI reflects any basestat changes from the action
    this.player.calcStats()

    // Note: NPC movement is handled by timeLapse script when hour changes
    // If we need to check NPC positions after actions, it would go here
  }

  /**
   * Run a script on this game instance. Returns the script's result (or undefined if none).
   *
   * Accepts any Script form (or null/undefined as a no-op):
   * - null/undefined: No-op, returns undefined
   * - string: A registered script name
   * - Instruction: A tuple [scriptName, params]
   * - ScriptFn: A function (game, params) => result
   *
   * For multiple instructions, use seq() to combine them into a single Instruction.
   */
  run(script: Script | null | undefined, params: Record<string, unknown> = {}): unknown {
    // Null/undefined - no-op
    if (script == null) {
      return undefined
    }

    // Function - call directly
    if (isScriptFn(script)) {
      return script(this, params)
    }

    // Instruction tuple - extract name and params, merge with provided params
    if (isInstruction(script)) {
      const [name, instrParams] = script
      return this.run(name, { ...instrParams, ...params })
    }

    // String - look up registered script
    const scriptFn = getScript(script)
    if (!scriptFn) {
      throw new Error(`Script not found: ${script}`)
    }
    return scriptFn(this, params)
  }

  /** Advance time by the given minutes (runs the timeLapse script). Returns this for chaining. */
  timeLapse(minutes?: number): this {
    this.run('timeLapse', { minutes })
    return this
  }

  /** Add a quest card to the player. Returns this for fluent chaining. */
  addQuest(questId: string, args: Record<string, unknown> = {}): this {
    const silent = !!args.silent
    const cardArgs = { ...args }
    delete cardArgs.silent

    this.addCard(questId, 'Quest', cardArgs, silent)

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

  /**
   * Add a card to the player. Handles replaces/subsumedBy logic from the card definition.
   * - If the card is already present, it is not added (no-op).
   * - If any card listed in the definition's `subsumedBy` is present, the card is not added.
   * - Any cards listed in the definition's `replaces` are removed before adding.
   * Calls the card's onAdded hook, or shows a default message.
   * Pass silent=true to suppress all messages.
   * Returns true if the card was added, false if skipped.
   */
  addCard(cardId: string, type: CardType, args: Record<string, unknown> = {}, silent: boolean = false): boolean {
    // Create the card to access its definition
    const card = new Card(cardId, type)
    const cardDef = card.template

    // Block duplicates unless allowMultiple is set
    if (!cardDef.allowMultiple && this.player.hasCard(cardId)) {
      return false
    }

    // Check subsumedBy: skip if a stronger card is already present
    if (cardDef.subsumedBy) {
      const subsumed = cardDef.subsumedBy.some(id => this.player.hasCard(id))
      if (subsumed) {
        return false
      }
    }

    // Remove cards listed in replaces (silently — the new card's onAdded is the relevant message)
    if (cardDef.replaces) {
      for (const replaceId of cardDef.replaces) {
        this.removeCard(replaceId, true)
      }
    }

    // Apply additional args to the card instance
    Object.keys(args).forEach(key => {
      card[key] = args[key]
    })

    this.player.cards.push(card)

    // Call onAdded hook or show default message (unless silent)
    if (!silent) {
      if (typeof cardDef.onAdded === 'function') {
        (cardDef.onAdded as (game: Game, card: Card) => void)(this, card)
      } else {
        const defaultColors: Record<string, string> = { Quest: '#f0c060', Effect: '#a78bfa' }
        const color = typeof cardDef.color === 'string' ? cardDef.color : defaultColors[type]
        this.add({ type: 'text', text: `${type}: ${cardDef.name}`, color })
      }
    }

    return true
  }

  /**
   * Remove a card from the player by ID.
   * Calls the card's onRemoved hook, or shows a default message.
   * If the card is subsumed (a card listed in its subsumedBy is present), onRemoved is skipped.
   * Recalculates stats after removal.
   * Pass silent=true to suppress all messages.
   * Returns true if the card was found and removed.
   */
  removeCard(cardId: string, silent: boolean = false): boolean {
    const index = this.player.cards.findIndex(c => c.id === cardId)
    if (index === -1) return false

    const card = this.player.cards[index]
    const cardDef = card.template
    this.player.cards.splice(index, 1)

    // If the card is subsumed (a stronger card is present), skip onRemoved entirely —
    // the card is being transformed/upgraded, not truly removed.
    const subsumed = cardDef.subsumedBy?.some(id => this.player.hasCard(id)) ?? false

    if (!silent && !subsumed) {
      if (typeof cardDef.onRemoved === 'function') {
        (cardDef.onRemoved as (game: Game, card: Card) => void)(this, card)
      } else {
        this.add({ type: 'text', text: `No longer ${cardDef.name.toLowerCase()}`, color: '#6fbf8a' })
      }
    }

    this.player.calcStats()
    return true
  }

  /** Add an effect card to the player. Pass silent=true to suppress onAdded messages. Returns this for fluent chaining. */
  addEffect(effectId: string, args: Record<string, unknown> = {}, silent: boolean = false): this {
    if (this.addCard(effectId, 'Effect', args, silent)) {
      this.player.calcStats()
    }

    return this
  }

  /** Calculate the number of interval boundaries crossed based on game time. */
  calcTicks(secondsElapsed: number, interval: number): number {
    return intervalsCrossed(this.time - secondsElapsed, this.time, interval)
  }

  /**
   * Update npcsPresent list based on NPC locations matching current location.
   * Should be called after NPC movement or location changes.
   * Only checks NPCs that already exist in the map - does not generate new ones.
   */
  updateNPCsPresent(): void {
    this.npcsPresent = []
    
    // Only check NPCs that already exist in the map
    // This prevents generating NPCs just for serialization checks
    this.npcs.forEach((npc, npcId) => {
      if (npc.location === this.currentLocation) {
        this.npcsPresent.push(npcId)
      }
    })
  }

  /** Clear display state (content, options, shop). Preserves sequence context (npc, hideNpcImage, stack). */
  clearScene(): void {
    this.scene.content = []
    this.scene.options = []
    this.scene.shop = undefined
  }

  /** Dismiss the current scene entirely — clears all content, options, and the scene stack. */
  dismissScene(): void {
    this.scene = { type: 'story', content: [], options: [], stack: [] }
  }

  toJSON(): GameData {
    const locationsRecord: Record<string, LocationData> = {}
    this.locations.forEach((location, id) => {
      locationsRecord[id] = location.toJSON()
    })
    
    // Ensure currentLocation is included in serialization if it exists but isn't in the map yet
    // This can happen if the location hasn't been accessed yet (lazy initialization)
    if (this.currentLocation && !locationsRecord[this.currentLocation]) {
      // Try to get the location (will create it if definition exists, throws if it doesn't)
      // We catch the error to handle cases where story content isn't loaded yet
      try {
        const location = this.getLocation(this.currentLocation)
        locationsRecord[this.currentLocation] = location.toJSON()
      } catch (error) {
        // Location definition doesn't exist - skip including it in serialization
        // This can happen if story content isn't loaded yet
      }
    }
    
    // Convert NPCs map to Record for JSON serialization
    const npcsRecord: Record<string, NPCData> = {}
    this.npcs.forEach((npc, id) => {
      npcsRecord[id] = npc.toJSON()
    })
    
    return {
      version: this.version,
      score: this.score,
      player: this.player.toJSON(),
      locations: locationsRecord,
      npcs: npcsRecord,
      currentLocation: this.currentLocation,
      scene: this.scene,
      time: this.time,
    }
  }

  /**
   * Check if the game has been started (init script has been run).
   * A game is considered started when the player has a non-empty name.
   */
  isStarted(): boolean {
    return this.player.name !== ''
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
    game.player.calcStats()
    
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
          stack: [],
        }
      }
      // If scene exists but doesn't match expected format, keep default from constructor
    }

    // Ensure scene stack is initialized (old saves may not have it)
    if (!game.scene.stack) game.scene.stack = []

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
    
    // Deserialize NPCs map - use generate function to recreate NPCs
    if (data.npcs) {
      game.npcs = new Map<string, NPC>()
      Object.entries(data.npcs).forEach(([id, npcData]) => {
        // Ensure id matches the key (for backwards compatibility)
        const npcDataWithId: NPCData = Object.assign({ id }, npcData as NPCData)
        const npc = NPC.fromJSON(npcDataWithId, game)
        game.npcs.set(id, npc)
      })
    }
    
    // Ensure currentLocation exists in the map if it was deserialized, otherwise don't create it
    // This preserves the lazy initialization behavior - locations are only created when accessed
    if (data.locations && game.currentLocation && data.locations[game.currentLocation]) {
      // Location was in the save, so ensure it exists (it should already from deserialization above)
      // This is just a safety check
      game.getLocation(game.currentLocation)
    }
    // If currentLocation wasn't in the save, don't create it here - let it be created lazily when accessed
    
    // Update npcsPresent after loading NPCs
    game.updateNPCsPresent()
    
    return game
  }
}

