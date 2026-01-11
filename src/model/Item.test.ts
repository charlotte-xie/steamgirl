import { describe, it, expect } from 'vitest'
import { Item } from './Item'
import type { ItemData } from './Item'

describe('Item', () => {
  it('should create an item with an id', () => {
    const item = new Item('test-item')
    expect(item).toBeDefined()
    expect(item.id).toBe('test-item')
    expect(item.number).toBe(1)
  })

  it('should create an item with custom number', () => {
    const item = new Item('crown', 20)
    expect(item.id).toBe('crown')
    expect(item.number).toBe(20)
  })

  it('should provide access to template definition', () => {
    const item = new Item('test-item')
    const template = item.template
    expect(template).toBeDefined()
    expect(template.name).toBe('Test Item')
    expect(template.description).toBe('A test item for testing purposes.')
  })

  it('should serialize and deserialize correctly', () => {
    const itemData: ItemData = {
      id: 'test-item',
      number: 1,
    }
    
    const item = Item.fromJSON(itemData)
    expect(item.id).toBe('test-item')
    expect(item.number).toBe(1)
    
    const serialized = item.toJSON()
    expect(serialized).toEqual(itemData)
  })

  it('should serialize and deserialize with number', () => {
    const itemData: ItemData = {
      id: 'crown',
      number: 20,
    }
    
    const item = Item.fromJSON(itemData)
    expect(item.id).toBe('crown')
    expect(item.number).toBe(20)
    
    const serialized = item.toJSON()
    expect(serialized).toEqual(itemData)
  })

  it('should handle round-trip serialization', () => {
    const itemData: ItemData = {
      id: 'test-item',
      number: 1,
    }
    
    // First round-trip
    const item1 = Item.fromJSON(itemData)
    const json1 = JSON.stringify(item1.toJSON())
    
    // Second round-trip
    const item2 = Item.fromJSON(JSON.parse(json1))
    const json2 = JSON.stringify(item2.toJSON())
    
    // Both JSON strings should be identical
    expect(json1).toBe(json2)
    expect(item2.id).toBe('test-item')
    expect(item2.number).toBe(1)
  })

  it('should default number to 1 when deserializing without number', () => {
    const itemData = {
      id: 'test-item',
      // number is missing
    } as ItemData
    
    const item = Item.fromJSON(itemData)
    expect(item.number).toBe(1)
  })

  it('should throw error when deserializing without id', () => {
    const itemData = {} as ItemData
    
    expect(() => {
      Item.fromJSON(itemData)
    }).toThrow('Item.fromJSON requires an id')
  })

  it('should throw error when deserializing with invalid id', () => {
    const itemData: ItemData = {
      id: 'non-existent-item',
      number:1
    }
    
    expect(() => {
      Item.fromJSON(itemData)
    }).toThrow('Item definition not found: non-existent-item')
  })

  it('should handle string JSON input', () => {
    const jsonString = JSON.stringify({ id: 'test-item' })
    
    const item = Item.fromJSON(jsonString)
    expect(item.id).toBe('test-item')
  })
})
