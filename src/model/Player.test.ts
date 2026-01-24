import { describe, it, expect } from 'vitest'
import { Player } from './Player'
import type { PlayerData } from './Player'
import { Item } from './Item'

describe('Player', () => {
  it('should create a new Player with empty name and inventory', () => {
    const player = new Player()

    expect(player).toBeDefined()
    expect(player.name).toBe('')
    expect(player.inventory).toBeDefined()
    expect(player.inventory.length).toBe(0)
  })

  it('should serialize and deserialize inventory correctly', () => {
    const player = new Player()
    player.name = 'TestPlayer'
    player.inventory = [
      new Item('test-item', 1),
      new Item('crown', 5),
    ]
    
    const playerData = player.toJSON()
    expect(playerData.inventory).toBeDefined()
    expect(playerData.inventory).toHaveLength(2)
    expect(playerData.inventory[0].id).toBe('test-item')
    expect(playerData.inventory[0].number).toBe(1)
    expect(playerData.inventory[1].id).toBe('crown')
    expect(playerData.inventory[1].number).toBe(5)
    
    const deserialized = Player.fromJSON(playerData)
    expect(deserialized.inventory.length).toBe(2)
    expect(deserialized.inventory[0].id).toBe('test-item')
    expect(deserialized.inventory[0].number).toBe(1)
    expect(deserialized.inventory[1].id).toBe('crown')
    expect(deserialized.inventory[1].number).toBe(5)
  })

  it('should handle empty inventory in serialization', () => {
    const player = new Player()
    player.inventory = []
    const playerData = player.toJSON()
    
    expect(playerData.inventory).toBeDefined()
    expect(playerData.inventory).toHaveLength(0)
    
    const deserialized = Player.fromJSON(playerData)
    expect(deserialized.inventory.length).toBe(0)
  })

  it('should handle missing inventory in deserialization (backwards compatibility)', () => {
    const playerData: PlayerData = {
      name: 'TestPlayer',
      basestats: {
        Agility: 1,
        Strength: 2,
        Wits: 3,
        Charm: 4,
      },
      inventory: [],
      cards: []
    }
    
    const player = Player.fromJSON(playerData)
    expect(player.inventory.length).toBe(0)
    expect(player.name).toBe('TestPlayer')
  })

  it('should handle round-trip serialization with inventory', () => {
    const player1 = new Player()
    player1.name = 'TestPlayer'
    player1.inventory = [
      new Item('test-item', 1),
      new Item('crown', 10),
    ]
    
    // First round-trip
    const json1 = JSON.stringify(player1.toJSON())
    const player2 = Player.fromJSON(JSON.parse(json1))
    const json2 = JSON.stringify(player2.toJSON())
    
    // Second round-trip
    const player3 = Player.fromJSON(JSON.parse(json2))
    const json3 = JSON.stringify(player3.toJSON())
    
    // All JSON should be identical
    expect(json1).toBe(json2)
    expect(json2).toBe(json3)
    
    // Verify inventory is preserved
    expect(player3.inventory.length).toBe(2)
    expect(player3.inventory[0].id).toBe('test-item')
    expect(player3.inventory[0].number).toBe(1)
    expect(player3.inventory[1].id).toBe('crown')
    expect(player3.inventory[1].number).toBe(10)
  })

  describe('addItem', () => {
    it('should add a new item by ID', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      player.addItem('test-item')
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].id).toBe('test-item')
      expect(player.inventory[0].number).toBe(1)
    })

    it('should add a new item by Item instance', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      const item = new Item('test-item', 3)
      
      player.addItem(item)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].id).toBe('test-item')
      expect(player.inventory[0].number).toBe(3)
    })

    it('should add item with custom quantity', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      player.addItem('test-item', 5)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].number).toBe(5)
    })

    it('should stack stackable items', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      player.addItem('crown', 10)
      player.addItem('crown', 15)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].id).toBe('crown')
      expect(player.inventory[0].number).toBe(25)
    })

    it('should not stack non-stackable items', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      player.addItem('test-item', 1)
      player.addItem('test-item', 2)
      
      expect(player.inventory.length).toBe(2)
      expect(player.inventory[0].id).toBe('test-item')
      expect(player.inventory[0].number).toBe(1)
      expect(player.inventory[1].id).toBe('test-item')
      expect(player.inventory[1].number).toBe(2)
    })

    it('should stack when adding Item instance to existing stack', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      player.addItem('crown', 10)
      const newCrown = new Item('crown', 5)
      player.addItem(newCrown)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].number).toBe(15)
    })
  })

  describe('removeItem', () => {
    it('should remove item entirely when quantity reaches zero', () => {
      const player = new Player()
      player.inventory = [new Item('test-item', 1)]
      
      player.removeItem('test-item', 1)
      
      expect(player.inventory.length).toBe(0)
    })

    it('should reduce stack size when quantity is less than total', () => {
      const player = new Player()
      player.inventory = [new Item('crown', 20)]
      
      player.removeItem('crown', 5)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].number).toBe(15)
    })

    it('should remove item when removing more than available', () => {
      const player = new Player()
      player.inventory = [new Item('crown', 10)]
      
      player.removeItem('crown', 15)
      
      expect(player.inventory.length).toBe(0)
    })

    it('should remove item by Item instance', () => {
      const player = new Player()
      player.inventory = [new Item('test-item', 5)]
      const item = new Item('test-item', 1)
      
      player.removeItem(item, 3)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].number).toBe(2)
    })

    it('should do nothing if item not found', () => {
      const player = new Player()
      player.inventory = [new Item('crown', 10)]
      
      player.removeItem('non-existent-item', 5)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].number).toBe(10)
    })

    it('should default to removing 1 when number not specified', () => {
      const player = new Player()
      player.inventory = [new Item('test-item', 3)]
      
      player.removeItem('test-item')
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].number).toBe(2)
    })
  })

  describe('inventory operations (sensible scenarios)', () => {
    it('should handle adding and removing multiple different items', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      player.addItem('crown', 100)
      player.addItem('test-item', 1)
      player.addItem('crown', 50) // Should stack
      
      expect(player.inventory.length).toBe(2)
      expect(player.inventory.find(item => item.id === 'crown')?.number).toBe(150)
      expect(player.inventory.find(item => item.id === 'test-item')?.number).toBe(1)
      
      player.removeItem('crown', 75)
      expect(player.inventory.find(item => item.id === 'crown')?.number).toBe(75)
      expect(player.inventory.find(item => item.id === 'test-item')?.number).toBe(1)
      
      player.removeItem('test-item')
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].id).toBe('crown')
      expect(player.inventory[0].number).toBe(75)
    })

    it('should handle spending currency (removing crowns)', () => {
      const player = new Player()
      player.inventory = [new Item('crown', 100)]
      
      // Spend 25 crowns
      player.removeItem('crown', 25)
      expect(player.inventory[0].number).toBe(75)
      
      // Spend another 50 crowns
      player.removeItem('crown', 50)
      expect(player.inventory[0].number).toBe(25)
      
      // Spend all remaining
      player.removeItem('crown', 25)
      expect(player.inventory.length).toBe(0)
    })

    it('should handle collecting multiple items and then using them', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      // Collect items
      player.addItem('test-item')
      player.addItem('test-item')
      player.addItem('crown', 10)
      player.addItem('crown', 5)
      
      expect(player.inventory.length).toBe(3) // 2 test-items (non-stackable) + 1 crown stack
      expect(player.inventory.filter(item => item.id === 'test-item').length).toBe(2)
      expect(player.inventory.find(item => item.id === 'crown')?.number).toBe(15)
      
      // Use items
      player.removeItem('test-item') // Remove one test-item
      expect(player.inventory.filter(item => item.id === 'test-item').length).toBe(1)
      expect(player.inventory.find(item => item.id === 'test-item')?.number).toBe(1)
      
      player.removeItem('crown', 10)
      expect(player.inventory.find(item => item.id === 'crown')?.number).toBe(5)
    })

    it('should handle adding items via Item instance and then removing by ID', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      const crownItem = new Item('crown', 50)
      player.addItem(crownItem)
      
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].number).toBe(50)
      
      // Remove by ID
      player.removeItem('crown', 30)
      expect(player.inventory[0].number).toBe(20)
      
      // Add more by ID
      player.addItem('crown', 10)
      expect(player.inventory[0].number).toBe(30)
    })

    it('should handle adding non-stackable items separately', () => {
      const player = new Player()
      player.inventory = [] // Clear default inventory
      
      player.addItem('test-item', 1)
      player.addItem('test-item', 1)
      player.addItem('test-item', 1)
      
      expect(player.inventory.length).toBe(3)
      player.inventory.forEach(item => {
        expect(item.id).toBe('test-item')
        expect(item.number).toBe(1)
      })
      
      // Remove one
      player.removeItem('test-item')
      expect(player.inventory.length).toBe(2)
    })

    it('should handle removing more than available gracefully', () => {
      const player = new Player()
      player.inventory = [new Item('crown', 10), new Item('test-item', 2)]
      
      // Remove more crowns than available
      player.removeItem('crown', 15)
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].id).toBe('test-item')
      
      // Remove more test-items than available
      player.removeItem('test-item', 5)
      expect(player.inventory.length).toBe(0)
    })
  })
})
