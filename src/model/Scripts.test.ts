import { describe, it, expect } from 'vitest'
import { Game } from './Game'
import { makeScript, getScript} from './Scripts'

describe('Scripts', () => {

  it('should run a script on a new Game', () => {
    // Register a simple test script
    makeScript('testScript', (game, params) => {
      return {
        gameVersion: game.version,
        score: game.score,
        params,
      }
    })

    // Create a new game
    const game = new Game()

    // Get and run the script
    const script = getScript('testScript')
    expect(script).toBeDefined()
    const result = script!(game, { testParam: 'value' }) as { gameVersion: number; score: number; params: object }

    // Verify the script executed correctly
    expect(result).toBeDefined()
    expect(result.gameVersion).toBe(1)
    expect(result.score).toBe(0)
    expect(result.params).toEqual({ testParam: 'value' })
  })
})
