import { describe, it, expect, beforeEach } from 'vitest'
import { Player } from '../model/Player'
import { getItem, extendItem, registerItemDefinition } from '../model/Item'
import '../story/World' // Load all registrations

/**
 * Tests for the clothing/item system mechanics.
 *
 * These tests focus on the core mechanics (extending items, wearing/unwearing,
 * stat calculations, serialization) rather than specific item definitions.
 * This allows content authors to change item definitions without breaking tests.
 */

// Register test-only items with known properties for reliable testing
registerItemDefinition('test-base-accessory', {
  name: 'test accessory base',
  category: 'Clothes',
  positions: ['head'],
  layer: 'accessory',
})

registerItemDefinition(
  'test-hat',
  extendItem('test-base-accessory', {
    name: 'test hat',
    description: 'A hat for testing',
    calcStats: (player) => {
      player.modifyStat('Charm', 5)
    },
  })
)

registerItemDefinition(
  'test-hat-plain',
  extendItem('test-base-accessory', {
    name: 'plain test hat',
    description: 'A plain hat for testing without stat bonuses',
  })
)

registerItemDefinition('test-base-under', {
  name: 'test under base',
  category: 'Clothes',
  positions: ['chest'],
  layer: 'under',
})

registerItemDefinition(
  'test-undershirt',
  extendItem('test-base-under', {
    name: 'test undershirt',
    description: 'An undershirt for testing',
  })
)

registerItemDefinition('test-base-inner', {
  name: 'test inner base',
  category: 'Clothes',
  positions: ['chest', 'belly'],
  layer: 'inner',
})

registerItemDefinition(
  'test-shirt',
  extendItem('test-base-inner', {
    name: 'test shirt',
    description: 'A shirt for testing',
    calcStats: (player) => {
      player.modifyStat('Charm', 3)
    },
  })
)

registerItemDefinition('test-base-outer', {
  name: 'test outer base',
  category: 'Clothes',
  positions: ['chest', 'belly'],
  layer: 'outer',
})

registerItemDefinition(
  'test-jacket',
  extendItem('test-base-outer', {
    name: 'test jacket',
    description: 'A jacket for testing',
    calcStats: (player) => {
      player.modifyStat('Charm', 2)
      player.modifyStat('Agility', -1)
    },
  })
)

registerItemDefinition('test-base-dress', {
  name: 'test dress base',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms', 'hips', 'legs'],
  layer: 'inner',
})

registerItemDefinition(
  'test-dress',
  extendItem('test-base-dress', {
    name: 'test dress',
    description: 'A dress for testing',
    calcStats: (player) => {
      player.modifyStat('Charm', 8)
    },
  })
)

registerItemDefinition('test-base-feet', {
  name: 'test feet base',
  category: 'Clothes',
  positions: ['feet'],
  layer: 'outer',
})

registerItemDefinition(
  'test-boots',
  extendItem('test-base-feet', {
    name: 'test boots',
    description: 'Boots for testing',
    calcStats: (player) => {
      player.modifyStat('Agility', 2)
    },
  })
)

describe('Clothing', () => {
  describe('extendItem', () => {
    it('should inherit base properties', () => {
      const testHat = getItem('test-hat')
      expect(testHat).toBeDefined()
      expect(testHat!.category).toBe('Clothes')
      expect(testHat!.positions).toEqual(['head'])
      expect(testHat!.layer).toBe('accessory')
    })

    it('should override base properties with new values', () => {
      const testHat = getItem('test-hat')
      expect(testHat!.name).toBe('test hat')
      expect(testHat!.description).toContain('testing')
    })

    it('should add new properties not in base', () => {
      const testHat = getItem('test-hat')
      expect(testHat!.calcStats).toBeDefined()
    })

    it('should not have calcStats if not specified in extension', () => {
      const plainHat = getItem('test-hat-plain')
      expect(plainHat!.calcStats).toBeUndefined()
    })

    it('should throw when extending non-existent base', () => {
      expect(() => extendItem('non-existent-item', { name: 'test' })).toThrow()
    })
  })

  describe('wearing items', () => {
    let player: Player

    beforeEach(() => {
      player = new Player()
      player.name = 'Test'
    })

    it('should wear an item from inventory', () => {
      player.addItem('test-hat')
      expect(player.inventory.length).toBe(1)

      const result = player.wearItem('test-hat')
      expect(result).toBe(true)
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].worn).toBe(true)
      expect(player.isWearing('test-hat')).toBe(true)
      expect(player.getWorn('head:accessory')?.id).toBe('test-hat')
    })

    it('should fail to wear item not in inventory', () => {
      const result = player.wearItem('test-hat')
      expect(result).toBe(false)
    })

    it('should fail to wear non-wearable item', () => {
      player.addItem('crown') // currency, not wearable
      const result = player.wearItem('crown')
      expect(result).toBe(false)
    })

    it('should swap worn items in same slot', () => {
      player.addItem('test-hat')
      player.addItem('test-hat-plain')

      player.wearItem('test-hat')
      expect(player.isWearing('test-hat')).toBe(true)

      player.wearItem('test-hat-plain')
      expect(player.isWearing('test-hat-plain')).toBe(true)
      expect(player.isWearing('test-hat')).toBe(false)
      expect(player.inventory.some((i) => i.id === 'test-hat')).toBe(true)
    })

    it('should allow wearing items at different layers on same position', () => {
      player.addItem('test-undershirt') // chest:under
      player.addItem('test-shirt') // chest:inner
      player.addItem('test-jacket') // chest:outer

      player.wearItem('test-undershirt')
      player.wearItem('test-shirt')
      player.wearItem('test-jacket')

      expect(player.isWearing('test-undershirt')).toBe(true)
      expect(player.isWearing('test-shirt')).toBe(true)
      expect(player.isWearing('test-jacket')).toBe(true)
      expect(player.getWorn('chest:under')?.id).toBe('test-undershirt')
      expect(player.getWorn('chest:inner')?.id).toBe('test-shirt')
      expect(player.getWorn('chest:outer')?.id).toBe('test-jacket')
    })

    it('should handle dress covering multiple positions', () => {
      player.addItem('test-dress')
      player.wearItem('test-dress')

      expect(player.getWorn('chest:inner')?.id).toBe('test-dress')
      expect(player.getWorn('belly:inner')?.id).toBe('test-dress')
      expect(player.getWorn('arms:inner')?.id).toBe('test-dress')
      expect(player.getWorn('hips:inner')?.id).toBe('test-dress')
      expect(player.getWorn('legs:inner')?.id).toBe('test-dress')
    })

    it('should unwear item by slot key', () => {
      player.addItem('test-hat')
      player.wearItem('test-hat')
      expect(player.inventory[0].worn).toBe(true)

      const removed = player.unwearItem('head:accessory')
      expect(removed?.id).toBe('test-hat')
      expect(player.inventory.length).toBe(1)
      expect(player.inventory[0].worn).toBe(false)
      expect(player.isWearing('test-hat')).toBe(false)
    })

    it('should unwear item by item ID', () => {
      player.addItem('test-hat')
      player.wearItem('test-hat')

      const removed = player.unwearItem('test-hat')
      expect(removed?.id).toBe('test-hat')
      expect(player.isWearing('test-hat')).toBe(false)
    })

    it('should unwear dress from all positions', () => {
      player.addItem('test-dress')
      player.wearItem('test-dress')
      expect(player.getWorn('chest:inner')?.id).toBe('test-dress')
      expect(player.getWorn('legs:inner')?.id).toBe('test-dress')

      player.unwearItem('test-dress')
      expect(player.getWorn('chest:inner')).toBeUndefined()
      expect(player.getWorn('legs:inner')).toBeUndefined()
      expect(player.inventory.some((i) => i.id === 'test-dress')).toBe(true)
    })

    it('should return null when unwearing empty slot', () => {
      const removed = player.unwearItem('head:accessory')
      expect(removed).toBeNull()
    })

    it('should handle multiple items with same ID (non-stackable)', () => {
      player.addItem('test-hat')
      player.addItem('test-hat')
      expect(player.inventory.length).toBe(2)

      player.wearItem('test-hat')

      const wornHats = player.inventory.filter((i) => i.id === 'test-hat' && i.worn)
      const unwornHats = player.inventory.filter((i) => i.id === 'test-hat' && !i.worn)
      expect(wornHats.length).toBe(1)
      expect(unwornHats.length).toBe(1)

      player.wearItem('test-hat')
      const wornHatsAfter = player.inventory.filter((i) => i.id === 'test-hat' && i.worn)
      expect(wornHatsAfter.length).toBe(1)
    })

    it('should only wear unworn items of same ID', () => {
      player.addItem('test-hat')
      player.wearItem('test-hat')
      expect(player.isWearing('test-hat')).toBe(true)

      const result = player.wearItem('test-hat')
      expect(result).toBe(false)
    })
  })

  describe('clothing stat modifiers', () => {
    let player: Player

    beforeEach(() => {
      player = new Player()
      player.name = 'Test'
      player.basestats.set('Charm', 50)
      player.basestats.set('Agility', 50)
    })

    it('should apply stat bonuses from worn items', () => {
      player.addItem('test-hat') // +5 Charm
      player.wearItem('test-hat')
      player.calcStats()

      expect(player.stats.get('Charm')).toBe(55)
    })

    it('should apply stat penalties from worn items', () => {
      player.addItem('test-jacket') // +2 Charm, -1 Agility
      player.wearItem('test-jacket')
      player.calcStats()

      expect(player.stats.get('Charm')).toBe(52)
      expect(player.stats.get('Agility')).toBe(49)
    })

    it('should stack bonuses from multiple worn items', () => {
      player.addItem('test-hat') // +5 Charm
      player.addItem('test-shirt') // +3 Charm
      player.wearItem('test-hat')
      player.wearItem('test-shirt')
      player.calcStats()

      expect(player.stats.get('Charm')).toBe(58) // 50 + 5 + 3
    })

    it('should not apply bonuses from items in inventory only', () => {
      player.addItem('test-hat') // +5 Charm, but not worn
      player.calcStats()

      expect(player.stats.get('Charm')).toBe(50)
    })

    it('should remove bonuses when item is unworn', () => {
      player.addItem('test-hat') // +5 Charm
      player.wearItem('test-hat')
      player.calcStats()
      expect(player.stats.get('Charm')).toBe(55)

      player.unwearItem('test-hat')
      player.calcStats()
      expect(player.stats.get('Charm')).toBe(50)
    })

    it('should only apply dress bonus once even though it covers multiple positions', () => {
      player.addItem('test-dress') // +8 Charm
      player.wearItem('test-dress')
      player.calcStats()

      expect(player.stats.get('Charm')).toBe(58) // Should be +8, not +40
    })
  })

  describe('serialization', () => {
    it('should serialize and deserialize worn items', () => {
      const player = new Player()
      player.name = 'Test'
      player.addItem('test-hat')
      player.addItem('test-boots')
      player.wearItem('test-hat')
      player.wearItem('test-boots')

      const json = player.toJSON()
      const hatItem = json.inventory.find((i) => i.id === 'test-hat')
      const bootsItem = json.inventory.find((i) => i.id === 'test-boots')
      expect(hatItem?.worn).toBe(true)
      expect(bootsItem?.worn).toBe(true)

      const restored = Player.fromJSON(json)
      expect(restored.isWearing('test-hat')).toBe(true)
      expect(restored.isWearing('test-boots')).toBe(true)
      expect(restored.getWorn('head:accessory')?.id).toBe('test-hat')
      expect(restored.getWorn('feet:outer')?.id).toBe('test-boots')
    })

    it('should serialize dress worn state', () => {
      const player = new Player()
      player.name = 'Test'
      player.addItem('test-dress')
      player.wearItem('test-dress')

      const json = player.toJSON()
      expect(json.inventory.length).toBe(1)
      expect(json.inventory[0].id).toBe('test-dress')
      expect(json.inventory[0].worn).toBe(true)

      const restored = Player.fromJSON(json)
      expect(restored.getWorn('chest:inner')?.id).toBe('test-dress')
      expect(restored.getWorn('belly:inner')?.id).toBe('test-dress')
      expect(restored.getWorn('arms:inner')?.id).toBe('test-dress')
      expect(restored.getWorn('hips:inner')?.id).toBe('test-dress')
      expect(restored.getWorn('legs:inner')?.id).toBe('test-dress')
    })
  })
})
