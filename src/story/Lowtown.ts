import { Game } from '../model/Game'
import { NPC, registerNPC } from '../model/NPC'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'

// Location definitions for Lowtown
const LOWTOWN_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  lowtown: {
    name: 'Lowtown',
    description: 'The industrial underbelly of the city, where the gears of progress grind against the forgotten.',
    image: '/images/lowtown.jpg',
    links: [{ dest: 'backstreets', time: 5 }], // 5 minutes back to backstreets
    secret: true, // Starts as undiscovered - must be found through exploration
  },
}

// Register NPCs in Lowtown
registerNPC('spice-dealer', {
  name: 'Spice Dealer',
  description: 'A shady character lurking in the shadows.',
  generate: (game: Game, npc: NPC) => {
    // Set initial location based on schedule
    const schedule: [number, number, string][] = [
      [15, 2, 'lowtown'], // 3pm-2am in lowtown (wrap-around)
    ]
    npc.followSchedule(game, schedule)
  },
  onApproach: (game: Game) => {
    game.add('The spice dealer eyes you warily, his mechanical hand twitching. "What do you want?" he asks in a low voice.')
  },
  onMove: (game: Game) => {
    const npc = game.getNPC('spice-dealer')
    // Update location based on schedule when hour changes
    const schedule: [number, number, string][] = [
      [15, 2, 'lowtown'], // 3pm-2am in lowtown (wrap-around)
    ]
    npc.followSchedule(game, schedule)
    // Update npcsPresent after NPC moves
    game.updateNPCsPresent()
  },
})

// Register all location definitions when module loads
Object.entries(LOWTOWN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
