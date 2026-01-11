import { Game } from '../model/Game'
import { makeScripts, runScript } from '../model/Scripts'
import { getLocation } from '../model/Location'

export const utilityScripts = {
  /* Advance the game's time by a given number of seconds
  * Should not tigger any events, i.e. safe to 
  * call from any script.
  */ 
  
  timeLapse: (game: Game, params: { seconds?: number } = {}) => {
    const seconds = params.seconds ?? 0
    if (typeof seconds !== 'number' || seconds < 0) {
      throw new Error('timeLapse requires a non-negative number of seconds')
    }
    game.time += seconds
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
  
  // Navigate to a given location
  go: (game: Game, params: { location?: string; time?: number } = {}) => {
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
    if (link?.onFollow) {
      // Run onFollow script when navigating down a link
      link.onFollow(game, {})
    }
    
    // Ensure location exists in game's locations map
    game.ensureLocation(locationId)
    
    // Get the location from the game (which may have been modified)
    const gameLocation = game.locations.get(locationId)
    if (!gameLocation) {
      throw new Error(`Location not found in game: ${locationId}`)
    }
    
    // Check if this is the first time visiting this location (before incrementing visits)
    const isFirstVisit = gameLocation.numVisits === 0
    
    // Change current location
    game.currentLocation = locationId
    
    // Increment visit count BEFORE running scripts to prevent infinite recursion
    // if scripts call go to the same location
    gameLocation.numVisits++
    
    // Advance time if provided (time is in minutes)
    if (params.time !== undefined) {
      const minutes = params.time
      if (typeof minutes !== 'number' || minutes < 0) {
        throw new Error('go script time parameter must be a non-negative number of minutes')
      }
      runScript('timeLapse', game, { seconds: minutes * 60 })
    }
    
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
