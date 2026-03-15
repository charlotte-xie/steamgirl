import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Game } from '../Game'
import '../../story/World'

let game: Game

beforeEach(() => {
  game = new Game()
  game.clearScene()
})

describe('stat predicates', () => {
  it('stat returns raw value with no range', () => {
    game.player.basestats.set('Strength', 42)
    game.player.calcStats()
    expect(game.run('stat', { stat: 'Strength' })).toBe(42)
  })

  it('stat returns true when in range', () => {
    game.player.basestats.set('Strength', 42)
    game.player.calcStats()
    expect(game.run('stat', { stat: 'Strength', min: 40 })).toBe(true)
    expect(game.run('stat', { stat: 'Strength', max: 50 })).toBe(true)
    expect(game.run('stat', { stat: 'Strength', min: 40, max: 50 })).toBe(true)
  })

  it('stat returns false when out of range', () => {
    game.player.basestats.set('Strength', 42)
    game.player.calcStats()
    expect(game.run('stat', { stat: 'Strength', min: 50 })).toBe(false)
    expect(game.run('stat', { stat: 'Strength', max: 30 })).toBe(false)
  })

  it('stat returns 0 for unset stat', () => {
    expect(game.run('stat', { stat: 'Strength' })).toBe(0)
  })
})

describe('boolean logic', () => {
  it('not negates a truthy predicate', () => {
    game.player.basestats.set('Strength', 50)
    game.player.calcStats()
    expect(game.run('not', { predicate: ['stat', { stat: 'Strength', min: 40 }] })).toBe(false)
    expect(game.run('not', { predicate: ['stat', { stat: 'Strength', min: 60 }] })).toBe(true)
  })

  it('and requires all predicates to be truthy', () => {
    game.player.basestats.set('Strength', 50)
    game.player.basestats.set('Perception', 30)
    game.player.calcStats()
    expect(game.run('and', { predicates: [
      ['stat', { stat: 'Strength', min: 40 }],
      ['stat', { stat: 'Perception', min: 20 }],
    ] })).toBe(true)
    expect(game.run('and', { predicates: [
      ['stat', { stat: 'Strength', min: 40 }],
      ['stat', { stat: 'Perception', min: 40 }],
    ] })).toBe(false)
  })

  it('or requires at least one predicate to be truthy', () => {
    game.player.basestats.set('Strength', 50)
    game.player.calcStats()
    expect(game.run('or', { predicates: [
      ['stat', { stat: 'Strength', min: 60 }],
      ['stat', { stat: 'Strength', min: 40 }],
    ] })).toBe(true)
    expect(game.run('or', { predicates: [
      ['stat', { stat: 'Strength', min: 60 }],
      ['stat', { stat: 'Strength', min: 70 }],
    ] })).toBe(false)
  })

  it('and with empty predicates returns true', () => {
    expect(game.run('and', { predicates: [] })).toBe(true)
    expect(game.run('and', {})).toBe(true)
  })

  it('or with empty predicates returns false', () => {
    expect(game.run('or', { predicates: [] })).toBe(false)
    expect(game.run('or', {})).toBe(false)
  })
})

describe('chance', () => {
  it('returns true when random < probability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
    expect(game.run('chance', { probability: 0.5 })).toBe(true)
    vi.restoreAllMocks()
  })

  it('returns false when random >= probability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    expect(game.run('chance', { probability: 0.5 })).toBe(false)
    vi.restoreAllMocks()
  })

  it('defaults to 0.5 probability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
    expect(game.run('chance', {})).toBe(true)
    vi.restoreAllMocks()
  })
})

describe('location predicates', () => {
  it('inLocation checks current location', () => {
    expect(game.run('inLocation', { location: game.currentLocation })).toBe(true)
    expect(game.run('inLocation', { location: 'nonexistent' })).toBe(false)
  })

  it('inScene returns false when no options', () => {
    game.clearScene()
    expect(game.run('inScene', {})).toBe(false)
  })

  it('hasContent checks for scene content', () => {
    game.clearScene()
    expect(game.run('hasContent', {})).toBe(false)
    game.add('Some text')
    expect(game.run('hasContent', {})).toBe(true)
  })
})

describe('card predicates', () => {
  it('hasCard returns true when player has card', () => {
    expect(game.run('hasCard', { cardId: 'find-lodgings' })).toBe(false)
    game.addQuest('find-lodgings', { silent: true })
    expect(game.run('hasCard', { cardId: 'find-lodgings' })).toBe(true)
  })

  it('cardCompleted returns false for incomplete card', () => {
    game.addQuest('find-lodgings', { silent: true })
    expect(game.run('cardCompleted', { cardId: 'find-lodgings' })).toBe(false)
  })

  it('cardCompleted returns true for completed card', () => {
    game.addQuest('find-lodgings', { silent: true })
    game.completeQuest('find-lodgings')
    expect(game.run('cardCompleted', { cardId: 'find-lodgings' })).toBe(true)
  })
})

describe('item predicates', () => {
  it('hasItem returns false then true after adding', () => {
    expect(game.run('hasItem', { item: 'pocket-watch' })).toBe(false)
    game.player.addItem('pocket-watch', 5)
    expect(game.run('hasItem', { item: 'pocket-watch' })).toBe(true)
  })

  it('hasItem with count checks quantity', () => {
    game.player.addItem('pocket-watch', 3)
    expect(game.run('hasItem', { item: 'pocket-watch', count: 3 })).toBe(true)
    expect(game.run('hasItem', { item: 'pocket-watch', count: 5 })).toBe(false)
  })
})

describe('time predicates', () => {
  it('hourBetween checks current hour', () => {
    const result = game.run('hourBetween', { from: 0, to: 24 })
    expect(result).toBe(true)
  })

  it('hourBetween handles wrap-around', () => {
    const d = new Date(game.date)
    d.setHours(23, 0, 0, 0)
    game.time = Math.floor(d.getTime() / 1000)

    expect(game.run('hourBetween', { from: 22, to: 6 })).toBe(true)
    expect(game.run('hourBetween', { from: 8, to: 18 })).toBe(false)
  })

  it('timeElapsed returns true when no timer recorded', () => {
    expect(game.run('timeElapsed', { timer: 'nonexistent', minutes: 60 })).toBe(true)
  })

  it('timeElapsed checks elapsed time', () => {
    game.run('recordTime', { timer: 'testTimer' })
    expect(game.run('timeElapsed', { timer: 'testTimer', minutes: 60 })).toBe(false)
    game.time += 3600
    expect(game.run('timeElapsed', { timer: 'testTimer', minutes: 60 })).toBe(true)
  })
})

describe('comparison predicates', () => {
  it('compare with > (default)', () => {
    expect(game.run('compare', { a: 10, b: 5 })).toBe(true)
    expect(game.run('compare', { a: 5, b: 10 })).toBe(false)
  })

  it('compare with various operators', () => {
    expect(game.run('compare', { a: 5, b: 10, op: '<' })).toBe(true)
    expect(game.run('compare', { a: 10, b: 10, op: '>=' })).toBe(true)
    expect(game.run('compare', { a: 10, b: 10, op: '<=' })).toBe(true)
    expect(game.run('compare', { a: 10, b: 10, op: '==' })).toBe(true)
    expect(game.run('compare', { a: 10, b: 11, op: '==' })).toBe(false)
  })

  it('compare with instruction operands', () => {
    game.player.basestats.set('Strength', 50)
    game.player.calcStats()
    expect(game.run('compare', {
      a: ['stat', { stat: 'Strength' }],
      b: 40,
      op: '>',
    })).toBe(true)
  })

  it('sub subtracts two values', () => {
    expect(game.run('sub', { a: 10, b: 3 })).toBe(7)
    expect(game.run('sub', { a: 3, b: 10 })).toBe(-7)
  })
})

describe('NPC predicates', () => {
  it('nobodyPresent returns true when no NPCs at location', () => {
    expect(game.run('nobodyPresent', {})).toBe(true)
  })

  it('npcStat returns 0 for non-instantiated NPC', () => {
    expect(game.run('npcStat', { npc: 'tour-guide', stat: 'affection' })).toBe(0)
  })

  it('npcStat returns value after modification', () => {
    const npc = game.getNPC('tour-guide')
    npc.stats.set('affection', 25)
    expect(game.run('npcStat', { npc: 'tour-guide', stat: 'affection' })).toBe(25)
    expect(game.run('npcStat', { npc: 'tour-guide', stat: 'affection', min: 20 })).toBe(true)
    expect(game.run('npcStat', { npc: 'tour-guide', stat: 'affection', min: 30 })).toBe(false)
  })
})
