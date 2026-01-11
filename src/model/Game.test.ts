import { describe, it, expect } from 'vitest'
import { Game } from './Game'

describe('Game', () => {
  it('should create a new Game', () => {
    const game = new Game()
    
    expect(game).toBeDefined()
    expect(game.version).toBe(1)
    expect(game.score).toBe(0)
    expect(game.player).toBeDefined()
    expect(game.currentLocation).toBe('station')
    expect(game.location).not.toBeNull()
    expect(game.locations.size).toBeGreaterThan(0)
  })

  it('should produce the same JSON after round-trip serialization (Game -> JSON -> Game -> JSON)', () => {
    // Create a new game
    const game1 = new Game()
    
    // First serialization: Game -> JSON
    const json1 = JSON.stringify(game1.toJSON())
    
    // First deserialization: JSON -> Game
    const game2 = Game.fromJSON(json1)
    
    // Second serialization: Game -> JSON
    const json2 = JSON.stringify(game2.toJSON())
    
    // Verify that both JSON strings are identical
    expect(json1).toBe(json2)
    
    // Also verify the parsed objects are equal
    expect(JSON.parse(json1)).toEqual(JSON.parse(json2))
  })

  it('should handle round-trip serialization with modified data', () => {
    const game1 = new Game()
    game1.version = 2
    game1.score = 100
    game1.player.name = 'TestPlayer'
    
    // First round-trip
    const json1 = JSON.stringify(game1.toJSON())
    const game2 = Game.fromJSON(json1)
    const json2 = JSON.stringify(game2.toJSON())
    
    // Second round-trip
    const game3 = Game.fromJSON(json2)
    const json3 = JSON.stringify(game3.toJSON())
    
    // All JSON should be identical
    expect(json1).toBe(json2)
    expect(json2).toBe(json3)
    expect(json1).toBe(json3)
    
    // Verify the final game has the correct values
    expect(game3.version).toBe(2)
    expect(game3.score).toBe(100)
    expect(game3.player.name).toBe('TestPlayer')
  })
})
