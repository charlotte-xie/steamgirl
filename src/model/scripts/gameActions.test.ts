import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Game } from '../Game'
import '../../story/World'

let game: Game

beforeEach(() => {
  game = new Game()
  game.clearScene()
})

describe('timeLapse', () => {
  it('advances game time by seconds', () => {
    const before = game.time
    game.run('timeLapse', { seconds: 120 })
    expect(game.time).toBe(before + 120)
  })

  it('advances game time by minutes', () => {
    const before = game.time
    game.run('timeLapse', { minutes: 5 })
    expect(game.time).toBe(before + 300)
  })

  it('combines seconds and minutes', () => {
    const before = game.time
    game.run('timeLapse', { seconds: 30, minutes: 2 })
    expect(game.time).toBe(before + 150)
  })

  it('depletes energy over 15-minute boundaries', () => {
    game.player.basestats.set('Energy', 50)
    game.run('timeLapse', { minutes: 30 })
    expect(game.player.basestats.get('Energy')).toBeLessThan(50)
  })

  it('does not deplete energy while sleeping', () => {
    game.player.basestats.set('Energy', 50)
    game.player.sleeping = true
    game.run('timeLapse', { minutes: 60 })
    expect(game.player.basestats.get('Energy')).toBe(50)
    game.player.sleeping = false
  })

  it('throws on negative seconds', () => {
    expect(() => game.run('timeLapse', { seconds: -1 })).toThrow()
  })

  it('handles untilTime to advance to a specific hour', () => {
    const d = new Date(game.date)
    d.setHours(10, 0, 0, 0)
    game.time = Math.floor(d.getTime() / 1000)
    const before = game.time

    game.run('timeLapse', { untilTime: 12 })
    expect(game.time - before).toBe(7200)
  })

  it('does nothing if untilTime is in the past', () => {
    const d = new Date(game.date)
    d.setHours(14, 0, 0, 0)
    game.time = Math.floor(d.getTime() / 1000)
    const before = game.time

    game.run('timeLapse', { untilTime: 10 })
    expect(game.time).toBe(before)
  })
})

describe('move', () => {
  it('moves player to a location', () => {
    game.run('move', { location: 'default' })
    expect(game.currentLocation).toBe('default')
  })

  it('throws without location parameter', () => {
    expect(() => game.run('move', {})).toThrow()
  })

  it('optionally advances time after moving', () => {
    const before = game.time
    game.run('move', { location: 'default', minutes: 5 })
    expect(game.currentLocation).toBe('default')
    expect(game.time).toBe(before + 300)
  })
})

describe('inventory scripts', () => {
  it('gainItem adds item to inventory', () => {
    game.run('gainItem', { item: 'pocket-watch' })
    const item = game.player.inventory.find(i => i.id === 'pocket-watch')
    expect(item).toBeDefined()
    expect(item!.number).toBe(1)
  })

  it('gainItem adds specified quantity', () => {
    game.run('gainItem', { item: 'pocket-watch', number: 3 })
    const item = game.player.inventory.find(i => i.id === 'pocket-watch')
    expect(item!.number).toBe(3)
  })

  it('loseItem removes item from inventory', () => {
    game.run('gainItem', { item: 'pocket-watch', number: 5 })
    game.run('loseItem', { item: 'pocket-watch', number: 2 })
    const item = game.player.inventory.find(i => i.id === 'pocket-watch')
    expect(item!.number).toBe(3)
  })

  it('gainItem throws without item parameter', () => {
    expect(() => game.run('gainItem', {})).toThrow()
  })

  it('loseItem throws without item parameter', () => {
    expect(() => game.run('loseItem', {})).toThrow()
  })
})

describe('addStat', () => {
  it('modifies a base stat', () => {
    game.run('addStat', { stat: 'Strength', change: 10, hidden: true })
    expect(game.player.basestats.get('Strength')).toBe(10)
  })

  it('clamps to min/max', () => {
    game.run('addStat', { stat: 'Strength', change: 200, hidden: true })
    expect(game.player.basestats.get('Strength')).toBe(100)

    game.run('addStat', { stat: 'Strength', change: -200, hidden: true })
    expect(game.player.basestats.get('Strength')).toBe(0)
  })

  it('respects custom min/max', () => {
    game.run('addStat', { stat: 'Strength', change: 50, min: 10, max: 30, hidden: true })
    expect(game.player.basestats.get('Strength')).toBe(30)
  })

  it('no-ops when already at limit in change direction', () => {
    game.player.basestats.set('Strength', 100)
    game.player.calcStats()
    game.run('addStat', { stat: 'Strength', change: 5, hidden: true })
    expect(game.player.basestats.get('Strength')).toBe(100)
  })

  it('throws for unknown stat', () => {
    expect(() => game.run('addStat', { stat: 'NotARealStat', change: 1 })).toThrow()
  })

  it('respects chance parameter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    game.run('addStat', { stat: 'Strength', change: 10, chance: 0.5, hidden: true })
    expect(game.player.basestats.get('Strength')).toBe(0)
    vi.restoreAllMocks()

    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    game.run('addStat', { stat: 'Strength', change: 10, chance: 0.5, hidden: true })
    expect(game.player.basestats.get('Strength')).toBe(10)
    vi.restoreAllMocks()
  })

  it('recalculates stats after modification', () => {
    game.run('addStat', { stat: 'Strength', change: 25, hidden: true })
    expect(game.player.stats.get('Strength')).toBe(25)
  })
})

describe('addNpcStat', () => {
  it('modifies an NPC stat', () => {
    const npc = game.getNPC('tour-guide')
    game.scene.npc = 'tour-guide'
    game.run('addNpcStat', { stat: 'affection', change: 15, hidden: true })
    expect(npc.stats.get('affection')).toBe(15)
  })

  it('clamps with max parameter', () => {
    const npc = game.getNPC('tour-guide')
    game.scene.npc = 'tour-guide'
    game.run('addNpcStat', { stat: 'affection', change: 50, max: 20, hidden: true })
    expect(npc.stats.get('affection')).toBe(20)
  })

  it('clamps with min parameter', () => {
    const npc = game.getNPC('tour-guide')
    npc.stats.set('affection', 10)
    game.scene.npc = 'tour-guide'
    game.run('addNpcStat', { stat: 'affection', change: -50, min: 5, hidden: true })
    expect(npc.stats.get('affection')).toBe(5)
  })

  it('no-ops when actual change is zero', () => {
    const npc = game.getNPC('tour-guide')
    npc.stats.set('affection', 20)
    game.scene.npc = 'tour-guide'
    game.run('addNpcStat', { stat: 'affection', change: 5, max: 20, hidden: true })
    expect(npc.stats.get('affection')).toBe(20)
  })

  it('throws without scene NPC or explicit npc param', () => {
    game.scene.npc = undefined
    expect(() => game.run('addNpcStat', { stat: 'affection', change: 5 })).toThrow()
  })
})

describe('recordTime', () => {
  it('records current game time to a timer', () => {
    game.run('recordTime', { timer: 'testTimer' })
    expect(game.player.timers.get('testTimer' as never)).toBe(game.time)
  })

  it('throws without timer parameter', () => {
    expect(() => game.run('recordTime', {})).toThrow()
  })
})

describe('card scripts', () => {
  it('addQuest adds a quest card', () => {
    game.run('addQuest', { questId: 'find-lodgings' })
    expect(game.player.hasCard('find-lodgings')).toBe(true)
  })

  it('completeQuest marks a quest as completed', () => {
    game.run('addQuest', { questId: 'find-lodgings' })
    game.run('completeQuest', { questId: 'find-lodgings' })
    const card = game.player.cards.find(c => c.id === 'find-lodgings')
    expect(card?.completed).toBe(true)
  })
})

describe('clothing scripts', () => {
  it('wearItem throws without item parameter', () => {
    expect(() => game.run('wearItem', {})).toThrow()
  })
})

describe('reputation scripts', () => {
  it('addReputation modifies reputation score', () => {
    game.run('addReputation', { reputation: 'academic', change: 20, hidden: true })
    expect(game.player.reputation.get('academic')).toBe(20)
  })

  it('addReputation clamps to 0-100', () => {
    game.run('addReputation', { reputation: 'academic', change: 200, hidden: true })
    expect(game.player.reputation.get('academic')).toBe(100)
  })

  it('addReputation respects chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    game.run('addReputation', { reputation: 'academic', change: 20, chance: 0.5, hidden: true })
    expect(game.player.reputation.get('academic') ?? 0).toBe(0)
    vi.restoreAllMocks()
  })

  it('addReputation throws for unknown reputation', () => {
    expect(() => game.run('addReputation', { reputation: 'nonexistent', change: 5 })).toThrow()
  })
})
