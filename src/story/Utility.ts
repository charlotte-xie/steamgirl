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
    
    // Check if this is the first time visiting this location (before marking as visited)
    const isFirstVisit = !gameLocation.visited
    
    // Change current location
    game.currentLocation = locationId
    
    // Mark location as visited BEFORE running scripts to prevent infinite recursion
    // if scripts call go to the same location
    gameLocation.visited = true
    
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
