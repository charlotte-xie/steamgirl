import { Player, type PlayerData } from './Player'
import { Location, type LocationData, getLocation as getLocationDefinition } from './Location'
import { NPC, type NPCData, getNPCDefinition } from './NPC'
import { getScript } from './Scripts'
import { Card } from './Card'

export type ParagraphContent = 
  | { type: 'text'; text: string }
  | { type: 'highlight'; text: string; color: string; hoverText?: string }

export type SceneContentItem = 
  | { type: 'text'; text: string; color?: string }
  | { type: 'paragraph'; content: ParagraphContent[] }
  | { type: 'speech'; text: string; color?: string }

export type SceneOptionItem = 
  | { type: 'button'; script: [string, {}]; label?: string }

export type SceneData = {
  type: 'story'
  content: SceneContentItem[]
  options: SceneOptionItem[]
  /** Set when the scene is an NPC interaction (from the approach script). */
  npc?: string
  /** When true, do not show the NPC image in the scene overlay. Set by approach to false; e.g. landlord sets true when showing rooms. */
  hideNpcImage?: boolean
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
    return this.scene.options.length > 0
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
    if (definition.onMove) {
      definition.onMove(this, {})
    }
    
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
   */
  takeAction(scriptName: string, params: {} = {}): void {
    // Clear the scene before running a new script
    this.clearScene()
    
    // Get and run the script (may modify game state)
    const script = getScript(scriptName)
    if (!script) {
      throw new Error(`Player action script not found: ${scriptName}`)
    }
    script(this, params)
  }

  /** 
   * Run everything that needs to happen after an action.
   * - Run any card effects that might change game state / trigger a new scene
   * - Move any NPCs (if needed)
   */
  afterAction(): void {
    // Run afterUpdate scripts for all cards
    this.player.cards.forEach(card => {
      const cardDef = card.template
      if (cardDef.afterUpdate) {
        cardDef.afterUpdate(this, {})
      }
    })

    // Unset npc when there are no scene options (conversation has ended)
    if (this.scene.options.length === 0) {
      this.scene.npc = undefined
      this.scene.hideNpcImage = undefined
    }
    
    // Note: NPC movement is handled by timeLapse script when hour changes
    // If we need to check NPC positions after actions, it would go here
  }

  /** Run a script on this game instance. Returns this for fluent chaining. */
  run(scriptName: string, params: {} = {}): this {
    const script = getScript(scriptName)
    if (!script) {
      throw new Error(`Script not found: ${scriptName}`)
    }
    script(this, params)
    return this
  }

  /** Advance time by the given minutes (runs the timeLapse script). Returns this for chaining. */
  timeLapse(minutes?: number): this {
    this.run('timeLapse', { minutes })
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
      if (!args.silent) {
        this.add({ type: 'text', text: `Quest received: ${cardDef.name}`, color: '#3b82f6' })
      }
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
      this.player.calcStats()
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

  /** Clear the current scene (resets content and options). Preserves npc and hideNpcImage so follow-up scripts in the same flow keep speech colour and image behaviour. */
  clearScene(): void {
    this.scene = {
      type: 'story',
      content: [],
      options: [],
      npc: this.scene.npc,
      hideNpcImage: this.scene.hideNpcImage,
    }
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

