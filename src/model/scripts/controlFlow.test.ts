import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Game } from '../Game'
import '../../story/World'

let game: Game

beforeEach(() => {
  game = new Game()
  game.clearScene()
})

describe('seq', () => {
  it('executes instructions in order', () => {
    game.run('seq', { instructions: [
      ['addStat', { stat: 'Strength', change: 5, hidden: true }],
      ['addStat', { stat: 'Perception', change: 3, hidden: true }],
    ] })
    expect(game.player.basestats.get('Strength')).toBe(5)
    expect(game.player.basestats.get('Perception')).toBe(3)
  })

  it('no-ops with no instructions', () => {
    game.run('seq', {})
  })
})

describe('when', () => {
  it('executes then-branch when condition is truthy', () => {
    game.player.basestats.set('Strength', 10)
    game.player.calcStats()
    game.run('when', {
      condition: ['stat', { stat: 'Strength', min: 5 }],
      then: [['addStat', { stat: 'Wits', change: 1, hidden: true }]],
    })
    expect(game.player.basestats.get('Wits')).toBe(1)
  })

  it('skips then-branch when condition is falsy', () => {
    game.run('when', {
      condition: ['stat', { stat: 'Strength', min: 50 }],
      then: [['addStat', { stat: 'Wits', change: 1, hidden: true }]],
    })
    expect(game.player.basestats.get('Wits')).toBe(0)
  })
})

describe('cond', () => {
  it('runs the first matching branch', () => {
    game.player.basestats.set('Strength', 30)
    game.player.calcStats()
    game.run('cond', {
      branches: [
        { condition: ['stat', { stat: 'Strength', min: 50 }], then: ['addStat', { stat: 'Wits', change: 10, hidden: true }] },
        { condition: ['stat', { stat: 'Strength', min: 20 }], then: ['addStat', { stat: 'Wits', change: 5, hidden: true }] },
        { condition: ['stat', { stat: 'Strength', min: 1 }], then: ['addStat', { stat: 'Wits', change: 1, hidden: true }] },
      ],
    })
    expect(game.player.basestats.get('Wits')).toBe(5)
  })

  it('runs default when no branches match', () => {
    game.run('cond', {
      branches: [
        { condition: ['stat', { stat: 'Strength', min: 99 }], then: ['addStat', { stat: 'Wits', change: 10, hidden: true }] },
      ],
      default: ['addStat', { stat: 'Wits', change: 1, hidden: true }],
    })
    expect(game.player.basestats.get('Wits')).toBe(1)
  })

  it('does nothing when no branches match and no default', () => {
    game.run('cond', {
      branches: [
        { condition: ['stat', { stat: 'Strength', min: 99 }], then: ['addStat', { stat: 'Wits', change: 10, hidden: true }] },
      ],
    })
    expect(game.player.basestats.get('Wits')).toBe(0)
  })
})

describe('random', () => {
  it('executes one of the children', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // pick first
    game.run('random', {
      children: [
        ['addStat', { stat: 'Strength', change: 1, hidden: true }],
        ['addStat', { stat: 'Wits', change: 1, hidden: true }],
      ],
    })
    expect(game.player.basestats.get('Strength')).toBe(1)
    expect(game.player.basestats.get('Wits')).toBe(0)
    vi.restoreAllMocks()
  })

  it('skips falsy children', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    game.run('random', {
      children: [
        null,
        false,
        0,
        ['addStat', { stat: 'Strength', change: 1, hidden: true }],
      ],
    })
    expect(game.player.basestats.get('Strength')).toBe(1)
    vi.restoreAllMocks()
  })

  it('does nothing with empty children', () => {
    game.run('random', { children: [] })
  })
})

describe('skillCheck', () => {
  it('returns boolean when no callbacks provided', () => {
    game.player.basestats.set('Charm', 50)
    game.player.calcStats()
    const result = game.run('skillCheck', { skill: 'Charm', difficulty: 0 })
    expect(typeof result).toBe('boolean')
  })

  it('executes onSuccess callback on pass', () => {
    game.player.basestats.set('Charm', 100)
    game.player.calcStats()
    game.run('skillCheck', {
      skill: 'Charm',
      difficulty: 0,
      onSuccess: ['addStat', { stat: 'Wits', change: 5, hidden: true }],
      onFailure: ['addStat', { stat: 'Wits', change: -5, hidden: true }],
    })
    expect(game.player.basestats.get('Wits')).toBe(5)
  })
})

describe('menu', () => {
  it('creates options that can be selected', () => {
    game.run('menu', { items: [
      ['option', { label: 'Choice A' }],
      ['option', { label: 'Choice B' }],
    ] })
    expect(game.scene.options).toHaveLength(2)
    expect(game.scene.options[0].label).toBe('Choice A')
    expect(game.scene.options[1].label).toBe('Choice B')
  })
})

describe('exitScene', () => {
  it('clears the scene stack', () => {
    game.run('menu', { items: [['option', { label: 'X' }]] })
    expect(game.scene.stack.length).toBeGreaterThan(0)
    game.run('exitScene', {})
    expect(game.scene.stack).toHaveLength(0)
  })
})
