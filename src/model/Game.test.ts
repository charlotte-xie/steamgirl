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

  it('should update base stat when addStat script runs with 100% chance', () => {
    const game = new Game()
    game.run('init', {}) // ensure scripts/player are set up

    const statName = 'Flirtation'
    const before = game.player.basestats.get(statName) ?? 0

    game.run('addStat', { stat: statName, change: 1, chance: 1 })

    const after = game.player.basestats.get(statName) ?? 0
    expect(after).toBe(before + 1)
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

  describe('Fluent NPC API', () => {
    it('should throw when accessing g.npc without an NPC in scene', () => {
      const game = new Game()
      
      // No NPC in scene, so accessing g.npc should throw
      expect(() => game.npc).toThrow('No NPC in current scene')
    })

    it('should throw when accessing g.npc with invalid NPC ID', () => {
      const game = new Game()
      
      // Set scene.npc to an invalid ID
      game.scene.npc = 'non-existent-npc'
      
      // Accessing g.npc should throw
      expect(() => game.npc).toThrow('NPC not found: non-existent-npc')
    })

    it('should allow npc.say() to add speech with NPC color', () => {
      const game = new Game()
      
      // Register a test NPC with a speech color
      registerNPC('fluent-test-npc', {
        name: 'Fluent Test NPC',
        description: 'An NPC for testing fluent API',
        speechColor: '#ff00ff',
      })
      
      // Set up NPC in scene
      game.scene.npc = 'fluent-test-npc'
      const npc = game.getNPC('fluent-test-npc')
      
      // Use fluent API to make NPC say something
      npc.say('Hello, this is a test!')
      
      // Check that speech was added with correct color
      const speechItem = game.scene.content.find(item => item.type === 'speech')
      expect(speechItem).toBeDefined()
      expect(speechItem?.type).toBe('speech')
      if (speechItem && speechItem.type === 'speech') {
        expect(speechItem.text).toBe('Hello, this is a test!')
        expect(speechItem.color).toBe('#ff00ff')
      }
    })

    it('should allow npc.option() to add NPC interaction options', () => {
      const game = new Game()
      
      // Register a test NPC with a script
      registerNPC('fluent-option-npc', {
        name: 'Fluent Option NPC',
        description: 'An NPC for testing option API',
        scripts: {
          testScript: (g: Game) => {
            g.add('Script executed!')
          },
        },
      })
      
      // Set up NPC in scene
      game.scene.npc = 'fluent-option-npc'
      const npc = game.getNPC('fluent-option-npc')
      
      // Use fluent API to add an option
      npc.option('Test Option', 'testScript')
      
      // Check that option was added
      expect(game.scene.options.length).toBe(1)
      const option = game.scene.options[0]
      expect(option.type).toBe('button')
      expect(option.label).toBe('Test Option')
      expect(option.script[0]).toBe('interact')
      expect(option.script[1]).toEqual({ script: 'testScript', params: undefined })
    })

    it('should allow npc.option() with params', () => {
      const game = new Game()
      
      registerNPC('fluent-params-npc', {
        name: 'Fluent Params NPC',
        description: 'An NPC for testing option params',
        scripts: {
          testScript: (g: Game) => {
            g.add('Script executed!')
          },
        },
      })
      
      game.scene.npc = 'fluent-params-npc'
      const npc = game.getNPC('fluent-params-npc')
      
      // Add option with params
      npc.option('Test Option', 'testScript', { value: 42 })
      
      // Check that params were included
      const option = game.scene.options[0]
      expect(option.script[1]).toEqual({ script: 'testScript', params: { value: 42 } })
    })

    it('should allow npc.addOption() to add generic options', () => {
      const game = new Game()
      
      registerNPC('fluent-generic-npc', {
        name: 'Fluent Generic NPC',
        description: 'An NPC for testing generic options',
      })
      
      game.scene.npc = 'fluent-generic-npc'
      const npc = game.getNPC('fluent-generic-npc')
      
      // Add a generic option (not an NPC interaction)
      npc.addOption('endConversation', { text: 'Goodbye' }, 'Leave')
      
      // Check that option was added
      expect(game.scene.options.length).toBe(1)
      const option = game.scene.options[0]
      expect(option.type).toBe('button')
      expect(option.label).toBe('Leave')
      expect(option.script[0]).toBe('endConversation')
      expect(option.script[1]).toEqual({ text: 'Goodbye' })
    })

    it('should allow npc.leaveOption() to add endConversation option', () => {
      const game = new Game()
      
      registerNPC('fluent-leave-npc', {
        name: 'Fluent Leave NPC',
        description: 'An NPC for testing leave API',
      })
      
      game.scene.npc = 'fluent-leave-npc'
      const npc = game.getNPC('fluent-leave-npc')
      
      // Add some options
      npc.option('Option 1', 'script1')
      npc.option('Option 2', 'script2')
      expect(game.scene.options.length).toBe(2)
      
      // Use leaveOption() to add endConversation option
      npc.leaveOption('You step away.', 'Goodbye!')
      
      // Should have 3 options now (2 previous + 1 leave)
      expect(game.scene.options.length).toBe(3)
      const leaveOption = game.scene.options[2]
      expect(leaveOption.type).toBe('button')
      expect(leaveOption.label).toBe('Leave')
      expect(leaveOption.script[0]).toBe('endConversation')
      expect(leaveOption.script[1]).toEqual({ text: 'You step away.', reply: 'Goodbye!' })
    })

    it('should allow npc.leaveOption() with custom label', () => {
      const game = new Game()
      
      registerNPC('fluent-leave-label-npc', {
        name: 'Fluent Leave Label NPC',
        description: 'An NPC for testing leave with custom label',
      })
      
      game.scene.npc = 'fluent-leave-label-npc'
      const npc = game.getNPC('fluent-leave-label-npc')
      
      // Use leaveOption() with custom label
      npc.leaveOption('Farewell!', 'See you later!', 'Say Goodbye')
      
      // Check the option
      expect(game.scene.options.length).toBe(1)
      const leaveOption = game.scene.options[0]
      expect(leaveOption.label).toBe('Say Goodbye')
      expect(leaveOption.script[0]).toBe('endConversation')
      expect(leaveOption.script[1]).toEqual({ text: 'Farewell!', reply: 'See you later!' })
    })

    it('should allow npc.leaveOption() without parameters', () => {
      const game = new Game()
      
      registerNPC('fluent-leave-default-npc', {
        name: 'Fluent Leave Default NPC',
        description: 'An NPC for testing leave with defaults',
      })
      
      game.scene.npc = 'fluent-leave-default-npc'
      const npc = game.getNPC('fluent-leave-default-npc')
      
      // Use leaveOption() without parameters
      npc.leaveOption()
      
      // Check the option uses defaults
      expect(game.scene.options.length).toBe(1)
      const leaveOption = game.scene.options[0]
      expect(leaveOption.label).toBe('Leave')
      expect(leaveOption.script[0]).toBe('endConversation')
      expect(leaveOption.script[1]).toEqual({ text: undefined, reply: undefined })
    })

    it('should allow npc.chat() to run onGeneralChat script', () => {
      const game = new Game()
      
      let chatCalled = false
      registerNPC('fluent-chat-npc', {
        name: 'Fluent Chat NPC',
        description: 'An NPC for testing chat API',
        scripts: {
          onGeneralChat: (g: Game) => {
            chatCalled = true
            g.add('General chat executed!')
          },
        },
      })
      
      game.scene.npc = 'fluent-chat-npc'
      const npc = game.getNPC('fluent-chat-npc')
      
      // Use chat() to run onGeneralChat
      const returnedNpc = npc.chat()
      
      // Should return the NPC for chaining
      expect(returnedNpc).toBe(npc)
      
      // Should have called the onGeneralChat script
      expect(chatCalled).toBe(true)
      
      // Should have added content
      const hasChatContent = game.scene.content.some(item => {
        if (item.type === 'text') {
          return item.text.includes('General chat executed!')
        }
        if (item.type === 'paragraph') {
          return item.content.some(c => c.type === 'text' && c.text.includes('General chat executed!'))
        }
        return false
      })
      expect(hasChatContent).toBe(true)
    })

    it('should allow fluent chaining of npc methods', () => {
      const game = new Game()
      
      registerNPC('fluent-chain-npc', {
        name: 'Fluent Chain NPC',
        description: 'An NPC for testing fluent chaining',
        speechColor: '#00ff00',
        scripts: {
          script1: (g: Game) => g.add('Script 1'),
          script2: (g: Game) => g.add('Script 2'),
        },
      })
      
      game.scene.npc = 'fluent-chain-npc'
      const npc = game.getNPC('fluent-chain-npc')
      
      // Chain multiple methods
      const returnedNpc = npc
        .say('First message')
        .say('Second message')
        .option('Option 1', 'script1')
        .option('Option 2', 'script2')
        .leaveOption('Goodbye!', 'Farewell!')
      
      // Should return the same NPC instance
      expect(returnedNpc).toBe(npc)
      
      // Check that all content and options were added
      const speechItems = game.scene.content.filter(item => item.type === 'speech')
      expect(speechItems.length).toBe(2)
      expect(speechItems[0].type === 'speech' && speechItems[0].text).toBe('First message')
      expect(speechItems[1].type === 'speech' && speechItems[1].text).toBe('Second message')
      
      expect(game.scene.options.length).toBe(3)
      expect(game.scene.options[0].label).toBe('Option 1')
      expect(game.scene.options[1].label).toBe('Option 2')
      expect(game.scene.options[2].label).toBe('Leave')
      expect(game.scene.options[2].script[0]).toBe('endConversation')
      expect(game.scene.options[2].script[1]).toEqual({ text: 'Goodbye!', reply: 'Farewell!' })
    })

    it('should use NPC speech color when say() is called', () => {
      const game = new Game()
      
      // Test with NPC that has speech color
      registerNPC('colored-npc', {
        name: 'Colored NPC',
        description: 'An NPC with a speech color',
        speechColor: '#abcdef',
      })
      
      game.scene.npc = 'colored-npc'
      const npc = game.getNPC('colored-npc')
      
      npc.say('Colored speech')
      
      const speechItem = game.scene.content.find(item => item.type === 'speech')
      expect(speechItem).toBeDefined()
      if (speechItem && speechItem.type === 'speech') {
        expect(speechItem.color).toBe('#abcdef')
      }
    })

    it('should handle NPC without speech color in say()', () => {
      const game = new Game()
      
      // Test with NPC that has no speech color
      registerNPC('no-color-npc', {
        name: 'No Color NPC',
        description: 'An NPC without a speech color',
        // No speechColor defined
      })
      
      game.scene.npc = 'no-color-npc'
      const npc = game.getNPC('no-color-npc')
      
      npc.say('Speech without color')
      
      const speechItem = game.scene.content.find(item => item.type === 'speech')
      expect(speechItem).toBeDefined()
      if (speechItem && speechItem.type === 'speech') {
        expect(speechItem.color).toBeUndefined()
      }
    })
  })
})
