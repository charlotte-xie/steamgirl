import { describe, it, expect } from 'vitest'
import { Game } from './Game'
import { Item } from './Item'
import '../story/Effects' // Register effect definitions
import '../story/Start' // Register start scripts
import '../story/Utility' // Register utility scripts

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

  it('should serialize and deserialize player inventory correctly', () => {
    const game1 = new Game()
    game1.player.inventory = [
      new Item('test-item', 1),
      new Item('crown', 10),
    ]
    
    // Serialize and deserialize
    const json1 = JSON.stringify(game1.toJSON())
    const game2 = Game.fromJSON(json1)
    
    // Verify inventory is preserved
    expect(game2.player.inventory.length).toBe(2)
    expect(game2.player.inventory[0].id).toBe('test-item')
    expect(game2.player.inventory[0].number).toBe(1)
    expect(game2.player.inventory[1].id).toBe('crown')
    expect(game2.player.inventory[1].number).toBe(10)
    
    // Round-trip again
    const json2 = JSON.stringify(game2.toJSON())
    const game3 = Game.fromJSON(json2)
    
    expect(game3.player.inventory.length).toBe(2)
    expect(game3.player.inventory[0].id).toBe('test-item')
    expect(game3.player.inventory[0].number).toBe(1)
    expect(game3.player.inventory[1].id).toBe('crown')
    expect(game3.player.inventory[1].number).toBe(10)
  })

  it('should give player Intoxicated effect when drinking sweet wine', () => {
    const game = new Game()
    
    // Add sweet wine to inventory for testing
    game.player.addItem('sweet-wine', 3)
    
    // Find sweet wine in inventory
    const wineItem = game.player.inventory.find(item => item.id === 'sweet-wine')
    expect(wineItem).toBeDefined()
    expect(wineItem?.number).toBeGreaterThan(0)
    
    // Get the item definition and call onConsume
    const wineDef = wineItem!.template
    expect(wineDef.onConsume).toBeDefined()
    
    // Remove the item from inventory first (as the UI does)
    game.player.removeItem('sweet-wine', 1)
    
    // Call the onConsume script
    wineDef.onConsume!(game, {})
    
    // Check that player has the intoxicated effect
    const intoxicatedCard = game.player.cards.find(card => card.id === 'intoxicated' && card.type === 'Effect')
    expect(intoxicatedCard).toBeDefined()
    expect(intoxicatedCard?.type).toBe('Effect')
    
    // Check that the alcohol value is 60
    expect(intoxicatedCard?.alcohol).toBe(60)
  })

  it('should initialize player correctly when running init script', () => {
    const game = new Game()
    
    // Run the init script
    game.run('init', {})
    
    // Check that player has an acceptance letter
    const acceptanceLetter = game.player.inventory.find(item => item.id === 'acceptance-letter')
    expect(acceptanceLetter).toBeDefined()
    expect(acceptanceLetter?.number).toBe(1)
    
    // Check that Agility is >10 (should be 30 from init script)
    const agility = game.player.stats.get('Agility')
    expect(agility).toBeDefined()
    expect(agility!).toBeGreaterThan(10)
    expect(agility).toBe(30) // Should be exactly 30
  })
})
