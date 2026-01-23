import { Game } from '../model/Game'
import { getItem } from '../model/Item'
import { makeScripts } from '../model/Scripts'
import { getLocation, getAllLocationIds } from '../model/Location'
import { type StatName, type MeterName, MAIN_STAT_INFO, SKILL_INFO, METER_INFO } from '../model/Stats'
import { capitalise } from '../model/Text'
import { colour, speech } from '../model/Format'

export const utilityScripts = {
  /* Advance the game's time by a given number of seconds
  * Should not trigger any events, i.e. safe to 
  * call from any script.
  */ 
  
  timeLapse: (game: Game, params: { seconds?: number , minutes?: number, untilTime?: number } = {}) => {
    let seconds = params.seconds ?? 0
    let minutes = params.minutes ?? 0
    
    // If untilTime is provided (as hour of day, e.g., 10 or 10.25 for 10:15am)
    if (params.untilTime !== undefined) {
      if (typeof params.untilTime !== 'number') {
        throw new Error('timeLapse untilTime must be a number (hour of day, e.g., 10 or 10.25)')
      }
      
      const targetHour = params.untilTime
      const currentHour = game.hourOfDay
      
      // Only advance if target is in the future on the same day
      // Never cross a day boundary
      if (currentHour < targetHour) {
        const hoursDifference = targetHour - currentHour
        seconds = Math.floor(hoursDifference * 3600) // Convert hours to seconds
        minutes = 0 // Reset minutes since we're using total seconds
      } else {
        // Target has passed today, do nothing
        seconds = 0
        minutes = 0
      }
    }
    
    if (typeof seconds !== 'number' || seconds < 0) {
      throw new Error('timeLapse requires a non-negative number of seconds')
    }
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('timeLapse requires a non-negative number of minutes')
    }
    
    // Calculate total elapsed seconds for onTime callbacks
    const totalSeconds = seconds + (minutes * 60)
    
    // Get current hour before time change
    const hourBefore = Math.floor(game.hourOfDay)
    
    // Advance time (if untilTime was in the past, we already set it above)
    if (totalSeconds > 0) {
      game.time += totalSeconds
    }
    
    // Get current hour after time change
    const hourAfter = Math.floor(game.hourOfDay)
    
    // Check if hour changed (e.g., 11:59 -> 12:01)
    const hourChanged = hourBefore !== hourAfter
    
    // Call onTime for all player cards that have it
    if (totalSeconds > 0) {
      // Create a copy of the cards array to avoid issues if onTime removes cards
      const cards = [...game.player.cards]
      for (const card of cards) {
        const cardDef = card.template
        // Check if the card definition has an onTime function
        if (cardDef.onTime && typeof cardDef.onTime === 'function') {
          cardDef.onTime(game, card, totalSeconds)
        }
      }
    }
    
    // If hour changed, call onMove for all NPCs that have it
    if (hourChanged) {
      game.npcs.forEach((npc) => {
        const npcDef = npc.template
        if (npcDef.onMove && typeof npcDef.onMove === 'function') {
          npcDef.onMove(game, {})
        }
      })
      // Update npcsPresent after NPCs have moved
      game.updateNPCsPresent()
    }
  },

  /** Conscious wait at current location: timeLapse, optional narrative, then optionally run another script if not in a scene. */
  wait: (game: Game, params: { minutes?: number; text?: string; then?: { script: string; params?: object } } = {}) => {
    const minutes = params.minutes ?? 15
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('wait script requires minutes (non-negative number)')
    }
    game.timeLapse(minutes)
    if (params.text) {
      game.add(params.text)
    }

    if (game.inScene) {
      return;
    }


    const t = params.then
    if (t?.script) {
      game.run(t.script, t.params ?? {})
    }
  },

  // Add an item to the player's inventory with optional text
  gainItem: (game: Game, params: { text?: string; item?: string; number?: number } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('gainItem script requires an item parameter')
    }
    
    const number = params.number ?? 1
    if (typeof number !== 'number' || number < 0) {
      throw new Error('gainItem script requires a non-negative number')
    }
    
    // Add text if provided, in bright yellow color
    if (params.text) {
      game.add({ type: 'text', text: params.text, color: '#ffeb3b' })
    }
    
    // Add item to inventory
    game.player.addItem(itemId, number)
    
    // Recalculate stats after adding item (in case item has stat modifiers)
    game.player.calcStats()
  },
  
  // Explore the current location - shows a random encounter
  explore: (game: Game) => {
    // Advance time by 10 minutes (600 seconds)
    game.timeLapse(10)
    
    // Random encounters for flavor
    const encounters = [
      'A brass-plated messenger automaton whirs past, its mechanical legs clicking rhythmically against the stones. It pays you no mind, focused solely on its delivery route.',
      'You spot a street vendor polishing a collection of glowing brass trinkets. The warm amber light from the devices casts dancing shadows across her weathered face.',
      'A steam-powered carriage rumbles by, its copper pipes releasing plumes of vapour. Through the mist, you catch a glimpse of elegantly dressed passengers in Victorian finery.',
      'An old clockmaker sits on a stoop, adjusting the gears of a pocket watch with delicate precision. He looks up and tips his brass bowler hat in your direction.',
      'A group of children with mechanical toys chase each other down the street. One child\'s tin soldier marches in perfect formation, its tiny gears whirring.',
      'You notice a stray gear on the ground, still warm to the touch. It seems to be from a larger mechanism, perhaps fallen from one of the overhead steam pipes.',
      'A mechanical bird with copper wings perches on a lamppost, its mechanical chirping blending with the ambient sounds of the city. It tilts its head to observe you curiously.',
      'A steam whistle echoes through the air as a train arrives at the platform. Passengers disembark, their luggage clinking with brass fittings and gears.',
      'A maintenance worker with mechanical tools adjusts a valve on a nearby steam pipe. Wisps of steam escape before he tightens it shut.',
      'Through the steam, you notice a group of clockwork automatons performing maintenance work, their synchronized movements precise and mechanical.',
    ]
    
    const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)]
    
    game.add([
      'You take a moment to explore and observe your surroundings.',
      randomEncounter
    ])
  },
  
  // Unconditionally move the player to a location (instant teleport with nothing else triggered)
  move: (game: Game, params: { location?: string } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('move script requires a location parameter')
    }
    
    // Ensure location exists in game's locations map
    game.getLocation(locationId)
    
    // Change current location and update NPCs present
    game.moveToLocation(locationId)
  },
  
  // Navigate to a given location (checks links, triggers arrival scripts, time lapse, etc.)
  go: (game: Game, params: { location?: string; minutes?: number } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('go script requires a location parameter')
    }
    
    // Check if location exists in registry
    const locationFromRegistry = getLocation(locationId)
    if (!locationFromRegistry) {
      throw new Error(`Location not found: ${locationId}`)
    }
    
    // Get current location to find the link being followed
    const currentLocation = game.location
    // Find the link that matches the destination
    const link = currentLocation.template.links?.find(l => l.dest === locationId)
    
    // Check if link exists - if not, show error message
    if (!link) {
      const locationName = locationFromRegistry.name || locationId
      game.add(`You can't see a way to ${locationName}.`)
      return
    }
    
    // Check access before allowing navigation
    if (link.checkAccess) {
      const accessReason = link.checkAccess(game)
      if (accessReason) {
        game.add(accessReason)
        return
      }
    }
    
    // Run onFollow script when navigating down a link (if set)
    if (link.onFollow) {
      link.onFollow(game, {})
      // If onFollow created a scene with options, don't proceed with automatic navigation
      // (the scene options will handle navigation instead)
      if (game.inScene) {
        return
      }
    }
    
    // Get the location from the game (ensuring it exists)
    const gameLocation = game.getLocation(locationId)
    
    // Check if this is the first time visiting this location (before incrementing visits)
    const isFirstVisit = gameLocation.numVisits === 0
    
    // Increment visit count BEFORE running scripts to prevent infinite recursion
    // if scripts call go to the same location
    gameLocation.numVisits++
    
    // Calculate time to advance: use provided minutes, or link time, or 1 minute default (time is in minutes)
    const minutes = params.minutes !== undefined ? params.minutes : (link.time ?? 1)
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('go script minutes must be a non-negative number')
    }
    game.timeLapse(minutes)
    
    // Actually move the player
    game.run('move', { location: locationId })
    
    // Visiting a location always sets it as discovered
    gameLocation.discovered = true
    
    // Run onFirstArrive script if this is the first visit and the location has one
    if (isFirstVisit && gameLocation.template.onFirstArrive) {
      gameLocation.template.onFirstArrive(game, {})
    }
    
    // Run onArrive script whenever the player arrives (if set)
    if (gameLocation.template.onArrive) {
      gameLocation.template.onArrive(game, {})
    }
  },
  
  // Recalculate stats based on basestats and modifiers from active Items and Cards
  calcStats: (game: Game, _params: {}) => {
    game.player.calcStats()
  },
  
  // Discover a location - sets discovered flag and optionally displays text
  discoverLocation: (game: Game, params: {
    location?: string
    text?: string
    colour?: string
  } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('discoverLocation script requires a location parameter')
    }
    
    // Ensure location exists in game's locations map
    const gameLocation = game.getLocation(locationId)
    if (gameLocation.discovered) return; // exit if already discovered
    
    // Get the location instance and set discovered flag
    gameLocation.discovered = true
    
    // Display text if provided (default color is blue)
    if (params.text) {
      const displayColor = params.colour || '#3b82f6' // Default blue
      game.add(colour(params.text, displayColor))
    }
  },
  
  // Modify a base stat with optional display text and color
  addStat: (game: Game, params: { 
    stat?: StatName
    change?: number
    min?: number
    max?: number
    colour?: string
    text?: string
    chance?: number
    hidden?: boolean
  }) => {
    const statName = params.stat
    if (!statName || typeof statName !== 'string') {
      throw new Error('addStat script requires a stat parameter')
    }
    if (!(statName in MAIN_STAT_INFO || statName in SKILL_INFO || statName in METER_INFO)) {
      throw new Error(`addStat: unknown stat '${statName}'`)
    }

    const change = params.change
    if (typeof change !== 'number') {
      throw new Error('addStat script requires a change parameter')
    }
    
    // Check chance (default 1.0 = 100%)
    const chance = params.chance ?? 1.0
    if (typeof chance !== 'number' || chance < 0 || chance > 1) {
      throw new Error('addStat chance must be a number between 0 and 1')
    }
    
    // Roll for chance
    if (Math.random() > chance) {
      return // Stat change doesn't apply
    }
    
    // Get current base stat value
    const currentValue = game.player.basestats.get(statName as StatName) || 0
    
    // Apply change
    let newValue = currentValue + change
    
    // Clamp to min/max
    const min = params.min ?? 0
    const max = params.max ?? 100
    newValue = Math.max(min, Math.min(max, newValue))
    const actualChange = newValue - currentValue

    if ((actualChange == 0) ||(Math.sign(actualChange) != Math.sign(change))) {
      // No state change, maybe already at max/min
      return
    }
    
    // Update base stat
    game.player.basestats.set(statName as StatName, newValue)
    
    // Recalculate stats after modifying base stat
    game.player.calcStats()
    
    // Display text unless hidden
    if (!params.hidden) {
      // Determine color
      let displayColor: string
      if (params.colour) {
        displayColor = params.colour
      } else {
        // Check if it's a meter and use appropriate color
        const meterInfo = METER_INFO[statName as MeterName]
        if (meterInfo) {
          displayColor = change > 0 ? meterInfo.gainColor : meterInfo.lossColor
        } else {
          // Default colors for non-meters
          displayColor = change > 0 ? '#10b981' : '#ef4444' // Green for gain, red for loss
        }
      }
      
      // Generate text
      let displayText: string
      if (params.text) {
        displayText = params.text
      } else {
        // Default format: "Statname +2" or "Statname -5"
        const sign = change > 0 ? '+' : ''
        displayText = `${capitalise(statName)} ${sign}${change}`
      }
      
      // Add colored text to scene if something changed
      if (actualChange !== 0) {
        game.add(colour(displayText, displayColor))
      }
    }
  },

  // End the current NPC conversation with optional text (no options, so afterAction unsets scene.npc).
  // Optional reply: NPC's response as speech, shown after the text.
  endConversation: (game: Game, params: { text?: string; reply?: string } = {}) => {
    const text = params.text ?? 'You politely end the conversation.'
    game.add(text)
    if (params.reply) {
      // Only use fluent API if NPC is in scene
      if (game.scene.npc) {
        const npc = game.npc
        npc.say(params.reply)
      } else {
        // Fallback for edge cases where endConversation is called without NPC
        game.add(speech(params.reply, '#a8d4f0'))
      }
    }
  },

  endScene: (game: Game, params: { text?: string } = {}) => {
    if (params.text) {
      game.add(params.text)
    }
  },

  runActivity: (game: Game, params: { activity?: string } = {}) => {
    const name = params.activity
    if (!name || typeof name !== 'string') {
      throw new Error('runActivity script requires an activity parameter (string name)')
    }
    const activities = game.location.template.activities || []
    const act = activities.find((a) => a.name === name)
    if (!act) {
      game.add('Activity not found.')
      return
    }
    act.script(game, {})
  },

  /** Run the current location's onRelax if defined; otherwise a generic message. */
  relaxAtLocation: (game: Game, _params: {} = {}) => {
    const onRelax = game.location.template.onRelax
    if (onRelax) {
      onRelax(game, {})
    } else {
      game.add("There's nothing particularly relaxing to do here.")
    }
  },

  examineItem: (game: Game, params: { item?: string } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('examineItem script requires an item parameter (string id)')
    }
    const def = getItem(itemId)
    if (!def?.onExamine) {
      game.add('Nothing happens.')
      return
    }
    def.onExamine(game, {})
  },

  consumeItem: (game: Game, params: { item?: string } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('consumeItem script requires an item parameter (string id)')
    }
    const def = getItem(itemId)
    if (!def?.onConsume) {
      game.add('You cannot use that.')
      return
    }
    const has = game.player.inventory.some((i) => i.id === itemId && i.number >= 1)
    if (!has) {
      game.add("You don't have that item.")
      return
    }
    game.player.removeItem(itemId, 1)
    game.player.calcStats()
    def.onConsume(game, {})
  },

  /** Run a named script on an NPC. Params: script (name), npc? (id; default: game.scene.npc), params? (passed to the NPC script). */
  interact: (game: Game, params: { npc?: string; script?: string; params?: object } = {}) => {
    const npcId = params.npc ?? game.scene.npc
    const scriptName = params.script
    if (!npcId || typeof npcId !== 'string') {
      throw new Error('interact script requires an npc parameter (or an active NPC scene) and a script parameter')
    }
    if (!scriptName || typeof scriptName !== 'string') {
      throw new Error('interact script requires a script parameter (string name)')
    }
    const npc = game.getNPC(npcId)
    const fn = npc.template.scripts?.[scriptName]
    if (!fn) {
      throw new Error(`NPC ${npcId} has no script "${scriptName}"`)
    }
    game.timeLapse(1)
    fn(game, params.params ?? {})
  },

  // Approach an NPC to talk to them
  approach: (game: Game, params: { npc?: string } = {}) => {
    const npcId = params.npc
    if (!npcId || typeof npcId !== 'string') {
      throw new Error('approach script requires an npc parameter (string id)')
    }

    // Get the NPC instance (will generate if needed)
    const npc = game.getNPC(npcId)
    
    // Increment approach count
    npc.approachCount++

    // Get the NPC definition
    const npcDef = npc.template

    // Mark scene as NPC interaction before onApproach (cleared scene already has npc/hideNpcImage preserved or undefined)
    game.scene.npc = npcId
    game.scene.hideNpcImage = false

    // Check if the NPC has an onApproach script
    if (npcDef.onApproach) {
      // Run the onApproach script
      npcDef.onApproach(game, {})
    } else {
      // Show default message
      const displayName = npc.nameKnown > 0 && npcDef.name 
        ? npcDef.name 
        : (npcDef.uname || npcDef.description || npcDef.name || 'The NPC')
      game.add(`${displayName} isn't interested in talking to you.`)
    }
  },
}

// Register all utility scripts when module loads
makeScripts(utilityScripts)

/** Sets all registered locations to discovered. For fast debug access (e.g. Skip Intro). */
export function discoverAllLocations(game: Game): void {
  for (const id of getAllLocationIds()) {
    const loc = game.getLocation(id)
    loc.discovered = true
  }
}

// Helper function for location discovery checks (can be called directly, not as a script)
export function maybeDiscoverLocation(
  game: Game,
  locationId: string,
  difficulty: number = 0,
  message: string
): boolean {
  // Check if location is already discovered
  const gameLocation = game.locations.get(locationId)
  const isDiscovered = gameLocation ? gameLocation.discovered : false
  
  if (isDiscovered) {
    return false // Already discovered, nothing to do
  }
  
  // Attempt Perception skill check
  const perceptionCheck = game.player.skillTest('Perception', difficulty)
  if (perceptionCheck) {
    // Discover the location
    game.run('discoverLocation', {
      location: locationId,
      text: message,
      colour: '#3b82f6',
    })
    return true // Location was discovered
  }
  
  return false // Location not discovered this time
}
