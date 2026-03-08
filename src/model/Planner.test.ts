import { describe, it, expect } from 'vitest'
import { Game } from './Game'
import { registerNPC, type Planner } from './NPC'
import { registerLocation } from './Location'
import { priority, schedulePlanner, idlePlanner, actionPlanner, randomPick } from './Planner'
import '../story/World'

// Test location for NPC AI tests
registerLocation('ai-test-loc', { name: 'Test Location' })
registerLocation('ai-test-loc2', { name: 'Test Location 2' })

function makeTestGame(npcId: string): Game {
  const game = new Game()
  game.moveToLocation('ai-test-loc')
  game.getNPC(npcId) // ensure NPC is instantiated
  return game
}

describe('NPC AI — plan system', () => {
  // Register a simple planner NPC for basic tests
  registerNPC('ai-test-npc', {
    name: 'Test NPC',
    uname: 'test person',
    planner: priority(
      schedulePlanner([[0, 24, 'ai-test-loc']]),
    ),
  })

  it('should initialise plan on getNPC for planner-enabled NPC', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    const npc = game.getNPC('ai-test-npc')
    expect(npc.plan).not.toBeNull()
    // Should be the outer plan wrapper
    expect(Array.isArray(npc.plan)).toBe(true)
    expect(npc.plan![0]).toBe('plan')
  })

  it('should set NPC location immediately on instantiation', () => {
    const game = makeTestGame('ai-test-npc')
    const npc = game.getNPC('ai-test-npc')
    // NPC is positioned immediately by the initial plan tick in getNPC
    expect(npc.location).toBe('ai-test-loc')
  })

  it('should serialise and deserialise plan', () => {
    const game = makeTestGame('ai-test-npc')
    const npc = game.getNPC('ai-test-npc')

    const json = JSON.stringify(game.toJSON())
    const game2 = Game.fromJSON(json)
    const npc2 = game2.npcs.get('ai-test-npc')!

    expect(npc2.plan).toEqual(npc.plan)
    expect(npc2.location).toBe(npc.location)
  })
})

describe('NPC AI — beAt script', () => {
  registerNPC('ai-move-npc', {
    name: 'Mover',
    uname: 'mover',
    planner: (game, npc) => {
      // Alternate between two locations based on hour
      const hour = Math.floor(game.hourOfDay)
      if (hour < 12) {
        if (npc.location === 'ai-test-loc') return null
        return ['beAt', { location: 'ai-test-loc' }]
      } else {
        if (npc.location === 'ai-test-loc2') return null
        return ['beAt', { location: 'ai-test-loc2' }]
      }
    },
  })

  it('should move NPC to scheduled location', () => {
    const game = new Game()
    // Set time to morning (10am)
    const morning = new Date(1902, 0, 5, 10, 0, 0)
    game.time = Math.floor(morning.getTime() / 1000)
    game.moveToLocation('ai-test-loc')
    const npc = game.getNPC('ai-move-npc')
    game.tickNPCs(true)
    expect(npc.location).toBe('ai-test-loc')
  })

  it('should show arrival text when NPC enters player location', () => {
    const game = new Game()
    const morning = new Date(1902, 0, 5, 10, 0, 0)
    game.time = Math.floor(morning.getTime() / 1000)
    game.moveToLocation('ai-test-loc2') // player is at loc2
    const npc = game.getNPC('ai-move-npc')
    game.tickNPCs(true)
    // NPC should be at ai-test-loc (morning), not where player is
    expect(npc.location).toBe('ai-test-loc')

    // Now advance to afternoon — NPC should move to ai-test-loc2 (player's location)
    game.clearScene()
    const afternoon = new Date(1902, 0, 5, 14, 0, 0)
    game.time = Math.floor(afternoon.getTime() / 1000)
    game.tickNPCs(true)

    expect(npc.location).toBe('ai-test-loc2')
    // Should have arrival text
    const text = game.scene.content.map(c =>
      c.type === 'paragraph' ? (c as { content: { text: string }[] }).content.map(p => p.text).join('') : ''
    ).join(' ')
    expect(text).toContain('arrives')
  })
})

describe('NPC AI — idle script', () => {
  it('should persist until time passes', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')

    // Run idle plan directly
    const startTime = game.time
    const result1 = game.run(['idle', { until: startTime + 600 }]) // 10 minutes
    expect(result1).toEqual(['idle', { until: startTime + 600 }]) // still waiting

    game.time = startTime + 600
    const result2 = game.run(['idle', { until: startTime + 600 }])
    expect(result2).toBeNull() // done
  })
})

describe('NPC AI — composite planners', () => {
  it('priority returns first non-null plan', () => {
    const never: Planner = () => null
    const always: Planner = () => ['beAt', { location: 'ai-test-loc' }]
    const combined = priority(never, always)

    const game = new Game()
    game.moveToLocation('ai-test-loc')
    const npc = game.getNPC('ai-test-npc')

    const plan = combined(game, npc)
    expect(plan).toEqual(['beAt', { location: 'ai-test-loc' }])
  })

  it('priority returns null when all planners return null', () => {
    const never: Planner = () => null
    const combined = priority(never, never)

    const game = new Game()
    game.moveToLocation('ai-test-loc')
    const npc = game.getNPC('ai-test-npc')

    expect(combined(game, npc)).toBeNull()
  })

  it('randomPick eventually selects each planner', () => {
    let aCount = 0
    let bCount = 0
    const planA: Planner = () => { aCount++; return ['beAt', { location: 'ai-test-loc' }] }
    const planB: Planner = () => { bCount++; return ['beAt', { location: 'ai-test-loc2' }] }
    const combined = randomPick(planA, planB)

    const game = new Game()
    game.moveToLocation('ai-test-loc')
    const npc = game.getNPC('ai-test-npc')

    // Run enough times that both should be picked at least once
    for (let i = 0; i < 50; i++) {
      combined(game, npc)
    }
    expect(aCount).toBeGreaterThan(0)
    expect(bCount).toBeGreaterThan(0)
  })
})

describe('NPC AI — tickNPCs', () => {
  registerNPC('ai-tick-npc', {
    name: 'Ticker',
    uname: 'ticker',
    planner: schedulePlanner([[0, 24, 'ai-test-loc']]),
  })

  it('should not tick during scenes', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    const npc = game.getNPC('ai-tick-npc')
    npc.location = null
    npc.plan = ['plan', { current: null, planner: ['basePlanner', {}] }]

    // Create a scene (add options)
    game.addOption('test', 'Test')
    game.tickNPCs(true)

    // NPC should NOT have moved because we're in a scene
    expect(npc.location).toBeNull()
  })
})

describe('NPC AI — approach intercept', () => {
  registerNPC('ai-approach-npc', {
    name: 'Approacher',
    uname: 'approacher',
    planner: schedulePlanner([[0, 24, 'ai-test-loc']]),
    onApproach: (game: Game) => {
      game.getNPC('ai-approach-npc').say('Hello!')
      game.getNPC('ai-approach-npc').leaveOption()
    },
  })

  it('should run normal approach for planner NPC that stays put', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    game.getNPC('ai-approach-npc')
    game.tickNPCs(true)

    game.clearScene()
    game.run('approach', { npc: 'ai-approach-npc' })

    // Should have NPC speech content
    expect(game.scene.content.length).toBeGreaterThan(0)
    expect(game.scene.npc).toBe('ai-approach-npc')
  })
})

describe('NPC AI — idlePlanner', () => {
  registerNPC('ai-idle-npc', {
    name: 'Idler',
    uname: 'idler',
    planner: priority(
      idlePlanner([
        { chance: 1.0, script: ['text', { parts: ['Idler fidgets.'] }] },
      ]),
      schedulePlanner([[0, 24, 'ai-test-loc']]),
    ),
  })

  it('should produce ambient text when co-located', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    game.getNPC('ai-idle-npc')
    game.tickNPCs(true) // first tick sets location via schedulePlanner
    game.clearScene()

    // Second tick — idlePlanner should fire since NPC is now co-located
    game.tickNPCs(true)

    const text = game.scene.content.map(c =>
      c.type === 'paragraph' ? (c as { content: { text: string }[] }).content.map(p => p.text).join('') : ''
    ).join(' ')
    expect(text).toContain('fidgets')
  })
})

describe('NPC AI — actionPlanner', () => {
  registerNPC('ai-interact-npc', {
    name: 'Interactor',
    uname: 'interactor',
    planner: priority(
      actionPlanner([
        // rate=1s: with 1 hour elapsed, p ≈ 1.0
        { rate: 1, script: ['text', { parts: ['Interactor waves.'] }] },
      ]),
      schedulePlanner([[0, 24, 'ai-test-loc']]),
    ),
  })

  it('should set baseline on first co-located tick without firing', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    game.getNPC('ai-interact-npc')
    game.tickNPCs(true) // schedulePlanner places NPC
    game.clearScene()

    game.tickNPCs(true) // actionPlanner sets baseline
    const npc = game.getNPC('ai-interact-npc')
    expect(npc.stats.get('_lastTick')).toBe(game.time)
    expect(game.scene.content.length).toBe(0)
  })

  it('should fire after time elapses (rate=1s, elapsed=1h)', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    game.getNPC('ai-interact-npc')
    game.tickNPCs(true) // place NPC
    game.clearScene()
    game.tickNPCs(true) // baseline
    game.clearScene()

    game.time += 3600
    game.tickNPCs(true)

    const text = game.scene.content.map(c =>
      c.type === 'paragraph' ? (c as { content: { text: string }[] }).content.map(p => p.text).join('') : ''
    ).join(' ')
    expect(text).toContain('waves')
  })

  it('should respect entry conditions', () => {
    registerNPC('ai-interact-cond', {
      name: 'Conditional Interactor',
      uname: 'conditional interactor',
      planner: priority(
        actionPlanner([
          {
            rate: 1,
            condition: ['stat', { stat: 'Charm', min: 999 }],
            script: ['text', { parts: ['Should not fire.'] }],
          },
        ]),
        schedulePlanner([[0, 24, 'ai-test-loc']]),
      ),
    })

    const game = new Game()
    game.moveToLocation('ai-test-loc')
    game.getNPC('ai-interact-cond')
    game.tickNPCs(true) // place
    game.clearScene()
    game.tickNPCs(true) // baseline
    game.clearScene()

    game.time += 3600
    game.tickNPCs(true)

    expect(game.scene.content.length).toBe(0)
  })

  it('should not fire when NPC is not at player location', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    game.getNPC('ai-interact-npc')
    game.tickNPCs(true) // place
    game.tickNPCs(true) // baseline
    game.clearScene()

    game.moveToLocation('ai-test-loc2')
    game.time += 3600
    game.tickNPCs(true)

    expect(game.scene.content.length).toBe(0)
  })

  it('should not fire when player is sleeping', () => {
    const game = new Game()
    game.moveToLocation('ai-test-loc')
    game.getNPC('ai-interact-npc')
    game.tickNPCs(true) // place
    game.tickNPCs(true) // baseline
    game.clearScene()

    game.player.sleeping = true
    game.time += 3600
    game.tickNPCs(true)

    expect(game.scene.content.length).toBe(0)
  })

  it('away entry should fire when NPC is NOT at player location', () => {
    registerNPC('ai-away-npc', {
      name: 'Away Actor',
      uname: 'away actor',
      planner: priority(
        actionPlanner([
          { rate: 1, away: true, script: ['text', { parts: ['Away action fires.'] }] },
        ]),
        schedulePlanner([[0, 24, 'ai-test-loc2']]),
      ),
    })

    const game = new Game()
    game.moveToLocation('ai-test-loc') // player at loc1
    game.getNPC('ai-away-npc') // NPC placed at loc2 by scheduler
    game.tickNPCs(true) // baseline
    game.clearScene()

    game.time += 3600
    game.tickNPCs(true)

    const text = game.scene.content.map(c =>
      c.type === 'paragraph' ? (c as { content: { text: string }[] }).content.map(p => p.text).join('') : ''
    ).join(' ')
    expect(text).toContain('Away action')
  })

  it('away entry should NOT fire when NPC IS at player location', () => {
    registerNPC('ai-away-npc2', {
      name: 'Away Actor 2',
      uname: 'away actor 2',
      planner: priority(
        actionPlanner([
          { rate: 1, away: true, script: ['text', { parts: ['Should not fire.'] }] },
        ]),
        schedulePlanner([[0, 24, 'ai-test-loc']]),
      ),
    })

    const game = new Game()
    game.moveToLocation('ai-test-loc') // same location
    game.getNPC('ai-away-npc2')
    game.tickNPCs(true) // baseline
    game.clearScene()

    game.time += 3600
    game.tickNPCs(true)

    expect(game.scene.content.length).toBe(0)
  })
})
