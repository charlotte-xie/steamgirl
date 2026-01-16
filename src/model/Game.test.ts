import { describe, it, expect } from 'vitest'
import { Game } from './Game'
import { Item } from './Item'
import { registerNPC } from './NPC'
import '../story/World' // Register all story content (locations, NPCs, cards, scripts)

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

  it('should generate NPC correctly when getNPC is called', () => {
    const game = new Game()
    
    // Initially, NPC should not exist in map
    expect(game.npcs.has('test-npc')).toBe(false)
    
    // Get NPC - should generate it
    const npc = game.getNPC('test-npc')
    
    // NPC should now exist in map
    expect(game.npcs.has('test-npc')).toBe(true)
    expect(npc.id).toBe('test-npc')
    expect(npc.template.name).toBe('Test NPC')
    expect(npc.template.description).toBe('A test NPC for testing purposes.')
  })

  it('should return same NPC instance on subsequent getNPC calls', () => {
    const game = new Game()
    
    const npc1 = game.getNPC('test-npc')
    const npc2 = game.getNPC('test-npc')
    
    // Should return the same instance
    expect(npc1).toBe(npc2)
  })

  it('should serialize and deserialize NPCs correctly', () => {
    const game = new Game()
    
    // Generate an NPC
    game.getNPC('test-npc')
    
    // Serialize and deserialize
    const gameData = game.toJSON()
    const reloadedGame = Game.fromJSON(gameData)
    
    // NPC should be restored
    expect(reloadedGame.npcs.has('test-npc')).toBe(true)
    const reloadedNPC = reloadedGame.getNPC('test-npc')
    expect(reloadedNPC.id).toBe('test-npc')
    expect(reloadedNPC.template.name).toBe('Test NPC')
  })

  it('should run onApproach script when approaching an NPC', () => {
    const game = new Game()
    
    // Approach the test NPC
    game.run('approach', { npc: 'test-npc' })
    
    // Check that approachCount was incremented
    const npc = game.getNPC('test-npc')
    expect(npc.approachCount).toBe(1)
    
    // Check that the scene contains the expected message
    const hasMessage = game.scene.content.some(item => {
      if (item.type === 'text') {
        return item.text.includes('Test NPC says:')
      }
      if (item.type === 'paragraph') {
        return item.content.some(c => c.type === 'text' && c.text.includes('Test NPC says:'))
      }
      return false
    })
    expect(hasMessage).toBe(true)
  })

  it('should show default message when NPC has no onApproach script', () => {
    const game = new Game()
    
    // Create a test NPC without onApproach - register it inline
    registerNPC('silent-npc', {
      name: 'Silent NPC',
      description: 'An NPC that doesn\'t want to talk.',
      // generate is optional - using default NPC instance
      // No onApproach script
    })
    
    // Approach the silent NPC
    game.run('approach', { npc: 'silent-npc' })
    
    // Check that approachCount was incremented
    const npc = game.getNPC('silent-npc')
    expect(npc.approachCount).toBe(1)
    
    // Check that the scene contains the default message
    const hasDefaultMessage = game.scene.content.some(item => {
      if (item.type === 'text') {
        return item.text.includes("isn't interested in talking to you")
      }
      if (item.type === 'paragraph') {
        return item.content.some(c => c.type === 'text' && c.text.includes("isn't interested in talking to you"))
      }
      return false
    })
    expect(hasDefaultMessage).toBe(true)
  })

  it('should increment approachCount on multiple approaches', () => {
    const game = new Game()
    
    const npc = game.getNPC('test-npc')
    expect(npc.approachCount).toBe(0)
    
    // Approach multiple times
    game.run('approach', { npc: 'test-npc' })
    expect(npc.approachCount).toBe(1)
    
    game.run('approach', { npc: 'test-npc' })
    expect(npc.approachCount).toBe(2)
    
    game.run('approach', { npc: 'test-npc' })
    expect(npc.approachCount).toBe(3)
  })

  it('should have spice dealer present in lowtown at 1am', () => {
    const game = new Game()
    
    // Set time to 1am (01:00) on January 5, 1902
    // JavaScript Date: year, month (0-indexed), day, hours, minutes, seconds
    const oneAmDate = new Date(1902, 0, 5, 1, 0, 0)
    game.time = Math.floor(oneAmDate.getTime() / 1000)
    
    // Ensure lowtown location exists and is discovered
    const lowtownLocation = game.getLocation('lowtown')
    lowtownLocation.discovered = true
    
    // Move player to lowtown
    game.moveToLocation('lowtown')
    
    // Get the spice dealer NPC (this will trigger onMove and position it)
    const spiceDealer = game.getNPC('spice-dealer')
    
    // Check that spice dealer's location is lowtown
    expect(spiceDealer.location).toBe('lowtown')
    
    // Update npcsPresent to reflect current NPC locations
    game.updateNPCsPresent()
    
    // Check that spice dealer is in npcsPresent
    expect(game.npcsPresent).toContain('spice-dealer')
  })
})
