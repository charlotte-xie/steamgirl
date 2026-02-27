/**
 * Story-specific scripts and helpers
 *
 * This file contains scripts that have story/world-specific content.
 * Generic scripts belong in model/Scripts.ts
 */

import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { getAllLocationIds } from '../model/Location'

export const storyScripts = {
  /** Explore the current location - shows a random encounter (story-specific flavor text) */
  explore: (game: Game) => {
    game.timeLapse(10)

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
}

// Register story scripts
makeScripts(storyScripts)

/** Sets all registered locations to discovered. For fast debug access (e.g. Skip Intro). */
export function discoverAllLocations(game: Game): void {
  for (const id of getAllLocationIds()) {
    const loc = game.getLocation(id)
    loc.discovered = true
  }
}

/** Helper function for location discovery checks (can be called directly, not as a script) */
export function maybeDiscoverLocation(
  game: Game,
  locationId: string,
  difficulty: number = 0,
  message: string
): boolean {
  const gameLocation = game.locations.get(locationId)
  const isDiscovered = gameLocation ? gameLocation.discovered : false

  if (isDiscovered) {
    return false
  }

  const perceptionCheck = game.player.skillTest('Perception', difficulty)
  if (perceptionCheck) {
    game.run('discoverLocation', {
      location: locationId,
      text: message,
    })
    return true
  }

  return false
}
