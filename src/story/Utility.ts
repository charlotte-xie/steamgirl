import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { getLocation } from '../model/Location'

export const utilityScripts = {
  /* Advance the game's time by a given number of seconds
  * Should not tigger any events, i.e. safe to 
  * call from any script.
  */ 
  
  timeLapse: (game: Game, params: { seconds?: number , minutes?: number } = {}) => {
    const seconds = params.seconds ?? 0
    const minutes = params.minutes ?? 0
    if (typeof seconds !== 'number' || seconds < 0) {
      throw new Error('timeLapse requires a non-negative number of seconds')
    }
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('timeLapse requires a non-negative number of minutes')
    }
    game.time += seconds + (minutes * 60)
    
    // Calculate total elapsed seconds for onTime callbacks
    const totalSeconds = seconds + (minutes * 60)
    
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
  },
  
  // Explore the current location - shows a random encounter
  explore: (game: Game) => {
    // Advance time by 10 minutes (600 seconds)
    game.run('timeLapse', { seconds: 10 * 60 })
    
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
    game.ensureLocation(locationId)
    
    // Change current location
    game.currentLocation = locationId
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
    
    // Run onFollow script when navigating down a link (if set)
    if (link.onFollow) {
      link.onFollow(game, {})
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
    game.run('timeLapse', { seconds: minutes * 60 })
    
    // Actually move the player
    game.run('move', { location: locationId })
    
    // Run onFirstArrive script if this is the first visit and the location has one
    if (isFirstVisit && gameLocation.template.onFirstArrive) {
      gameLocation.template.onFirstArrive(game, {})
    }
    
    // Run onArrive script whenever the player arrives (if set)
    if (gameLocation.template.onArrive) {
      gameLocation.template.onArrive(game, {})
    }
  },
}

// Register all utility scripts when module loads
makeScripts(utilityScripts)
