import { describe, it, expect } from 'vitest'
import { Game } from '../model/Game'
import { PRONOUNS, registerNPC } from '../model/NPC'
import '../story/World' // Load all story content

import {
  getDateCard, getDatePlan, dateCardData,
  registerDatePlan, handleDateApproach,
  standardGreeting, standardCancel, standardNoShow, standardComplete,
  endDate,
} from './Dating'
import { scene, scenes } from '../model/ScriptDSL'

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Create a game set to a specific date/time. */
function gameAt(year: number, month: number, day: number, hour: number, minute = 0): Game {
  const game = new Game()
  const d = new Date(year, month - 1, day, hour, minute, 0)
  game.time = Math.floor(d.getTime() / 1000)
  return game
}

/** Add a date card to the game for a given NPC. */
function addDateCard(game: Game, npcId: string, meetTime: number, meetLocation = 'default'): void {
  game.addCard('date', 'Date', {
    npc: npcId,
    meetTime,
    meetLocation,
    dateStarted: false,
  })
}

/** Calculate meet time for a given date at 6pm. */
function meetTimeAt(year: number, month: number, day: number, hour = 18): number {
  const d = new Date(year, month - 1, day, hour, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

// Register a minimal test NPC for dating tests
registerNPC('date-test-npc', {
  name: 'Test Date NPC',
  uname: 'test date person',
  pronouns: PRONOUNS.he,
  speechColor: '#aabbcc',
  onMove: (game: Game) => {
    const npc = game.getNPC('date-test-npc')
    npc.followSchedule(game, [[9, 18, 'station']])
  },
})

registerDatePlan({
  npcId: 'date-test-npc',
  npcDisplayName: 'TestNPC',
  meetLocation: 'default',
  meetLocationName: 'the City Centre',
  waitMinutes: 120,
  dateScene: scenes(
    'The date begins.',
    scene('The date continues.', endDate()),
  ),
  onGreeting: standardGreeting('Hello!'),
  onCancel: standardCancel('Oh no.', 20),
  onNoShow: standardNoShow('TestNPC', 'TestNPC waited, but you never came.', 15),
  onComplete: standardComplete(10),
})

// ============================================================================
// TESTS
// ============================================================================

describe('Dating System', () => {
  describe('DateCardData typing', () => {
    it('dateCardData returns typed properties', () => {
      const game = gameAt(1902, 1, 5, 12)
      const mt = meetTimeAt(1902, 1, 6)
      addDateCard(game, 'date-test-npc', mt, 'default')

      const card = getDateCard(game)
      expect(card).toBeDefined()

      const data = dateCardData(card!)
      expect(data.npc).toBe('date-test-npc')
      expect(data.meetTime).toBe(mt)
      expect(data.meetLocation).toBe('default')
      expect(data.dateStarted).toBe(false)
    })
  })

  describe('Date plan registry', () => {
    it('getDatePlan returns registered plan', () => {
      const plan = getDatePlan('date-test-npc')
      expect(plan).toBeDefined()
      expect(plan!.npcDisplayName).toBe('TestNPC')
      expect(plan!.meetLocation).toBe('default')
      expect(plan!.waitMinutes).toBe(120)
    })

    it('getDatePlan returns undefined for unknown NPC', () => {
      expect(getDatePlan('nonexistent')).toBeUndefined()
    })
  })

  describe('Date card lifecycle', () => {
    it('getDateCard returns the active date card', () => {
      const game = gameAt(1902, 1, 5, 12)
      expect(getDateCard(game)).toBeUndefined()

      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))
      const card = getDateCard(game)
      expect(card).toBeDefined()
      expect(card!.id).toBe('date')
      expect(card!.type).toBe('Date')
    })

    it('only one date card can exist at a time', () => {
      const game = gameAt(1902, 1, 5, 12)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))
      // Second add should fail (duplicate)
      const added = game.addCard('date', 'Date', { npc: 'someone-else' })
      expect(added).toBe(false)
      expect(game.player.cards.filter(c => c.id === 'date').length).toBe(1)
    })

    it('date card serialises and deserialises correctly', () => {
      const game = gameAt(1902, 1, 5, 12)
      const mt = meetTimeAt(1902, 1, 6)
      addDateCard(game, 'date-test-npc', mt)

      const json = JSON.stringify(game.toJSON())
      const restored = Game.fromJSON(json)

      const card = getDateCard(restored)
      expect(card).toBeDefined()
      const data = dateCardData(card!)
      expect(data.npc).toBe('date-test-npc')
      expect(data.meetTime).toBe(mt)
      expect(data.meetLocation).toBe('default')
      expect(data.dateStarted).toBe(false)
    })
  })

  describe('Reminders', () => {
    it('shows "tomorrow" reminder the day before', () => {
      // Date card for Jan 6, game is Jan 5 at noon
      const game = gameAt(1902, 1, 5, 12)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const reminders = game.reminders
      expect(reminders.length).toBe(1)
      expect(reminders[0].text).toContain('tomorrow')
      expect(reminders[0].urgency).toBe('info')
    })

    it('shows "today" reminder before meeting time', () => {
      // Date is Jan 6 at 6pm, game is Jan 6 at 2pm
      const game = gameAt(1902, 1, 6, 14)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const reminders = game.reminders
      expect(reminders.length).toBe(1)
      expect(reminders[0].text).toContain('6pm today')
      expect(reminders[0].urgency).toBe('info')
    })

    it('shows urgent "waiting" reminder during wait window', () => {
      // Date is Jan 6 at 6pm, game is Jan 6 at 7pm (within 2hr window)
      const game = gameAt(1902, 1, 6, 19)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const reminders = game.reminders
      expect(reminders.length).toBe(1)
      expect(reminders[0].text).toContain('waiting')
      expect(reminders[0].urgency).toBe('urgent')
    })

    it('shows no reminders after date has started', () => {
      const game = gameAt(1902, 1, 6, 19)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const card = getDateCard(game)!
      card.dateStarted = true

      expect(game.reminders.length).toBe(0)
    })

    it('shows no reminders past deadline', () => {
      // Date at 6pm, game at 9pm (past 2hr window)
      const game = gameAt(1902, 1, 6, 21)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const reminders = game.reminders
      // No reminders — afterUpdate handles cleanup
      expect(reminders.length).toBe(0)
    })
  })

  describe('No-show detection (afterUpdate)', () => {
    it('triggers no-show when deadline passes', () => {
      const game = gameAt(1902, 1, 6, 21) // 9pm, past 6pm + 2hr
      const npc = game.getNPC('date-test-npc')
      npc.affection = 30
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      // Run afterAction which calls afterUpdate for all cards
      game.afterAction()

      // Date card should be removed
      expect(getDateCard(game)).toBeUndefined()
      // Affection should have dropped by 15
      expect(npc.affection).toBe(15)
    })

    it('does not trigger no-show during wait window', () => {
      const game = gameAt(1902, 1, 6, 19) // 7pm, within 6pm–8pm window
      const npc = game.getNPC('date-test-npc')
      npc.affection = 30
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.afterAction()

      // Card should still exist
      expect(getDateCard(game)).toBeDefined()
      // Affection unchanged
      expect(npc.affection).toBe(30)
    })

    it('does not trigger no-show if date already started', () => {
      const game = gameAt(1902, 1, 6, 21)
      const npc = game.getNPC('date-test-npc')
      npc.affection = 30
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const card = getDateCard(game)!
      card.dateStarted = true

      game.afterAction()

      // Card should still exist (date is in progress)
      expect(getDateCard(game)).toBeDefined()
      expect(npc.affection).toBe(30)
    })
  })

  describe('NPC positioning via afterUpdate', () => {
    it('moves NPC to meeting location during wait window', () => {
      const game = gameAt(1902, 1, 6, 19) // 7pm, within 6pm–8pm window
      const npc = game.getNPC('date-test-npc')
      npc.location = 'station' // Normal schedule position

      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.afterAction()

      // NPC should be at meeting location
      expect(npc.location).toBe('default')
    })

    it('does not move NPC before meeting time', () => {
      const game = gameAt(1902, 1, 6, 14) // 2pm, before 6pm
      const npc = game.getNPC('date-test-npc')
      npc.location = 'station'

      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.afterAction()

      // NPC should stay at station
      expect(npc.location).toBe('station')
    })

    it('does not move NPC after date has started', () => {
      const game = gameAt(1902, 1, 6, 19)
      const npc = game.getNPC('date-test-npc')
      npc.location = 'lake' // Moved during date scene

      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))
      const card = getDateCard(game)!
      card.dateStarted = true

      game.afterAction()

      // NPC should stay at lake (not overridden)
      expect(npc.location).toBe('lake')
    })
  })

  describe('handleDateApproach helper', () => {
    it('returns true and runs dateApproach when player is at meeting location during window', () => {
      const game = gameAt(1902, 1, 6, 19)
      game.moveToLocation('default') // Player at City Centre
      game.getNPC('date-test-npc') // Ensure NPC is generated
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const result = handleDateApproach(game, 'date-test-npc')
      expect(result).toBe(true)

      // dateStarted should be set by dateApproach
      const card = getDateCard(game)!
      expect(card.dateStarted).toBe(true)
    })

    it('returns false when player is at wrong location', () => {
      const game = gameAt(1902, 1, 6, 19)
      // Player at station, date is at City Centre
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const result = handleDateApproach(game, 'date-test-npc')
      expect(result).toBe(false)
    })

    it('returns false when outside date window', () => {
      const game = gameAt(1902, 1, 6, 14) // Before meeting time
      game.moveToLocation('default')
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const result = handleDateApproach(game, 'date-test-npc')
      expect(result).toBe(false)
    })

    it('returns false when date already started', () => {
      const game = gameAt(1902, 1, 6, 19)
      game.moveToLocation('default')
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))
      getDateCard(game)!.dateStarted = true

      const result = handleDateApproach(game, 'date-test-npc')
      expect(result).toBe(false)
    })

    it('returns false for wrong NPC', () => {
      const game = gameAt(1902, 1, 6, 19)
      game.moveToLocation('default')
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const result = handleDateApproach(game, 'some-other-npc')
      expect(result).toBe(false)
    })

    it('returns false when no date card exists', () => {
      const game = gameAt(1902, 1, 6, 19)
      game.moveToLocation('default')

      const result = handleDateApproach(game, 'date-test-npc')
      expect(result).toBe(false)
    })
  })

  describe('Date lifecycle scripts', () => {
    it('dateApproach sets dateStarted and runs greeting', () => {
      const game = gameAt(1902, 1, 6, 19)
      game.getNPC('date-test-npc') // Ensure NPC is generated
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.clearScene()
      game.run('dateApproach', { npc: 'date-test-npc' })

      const card = getDateCard(game)!
      expect(card.dateStarted).toBe(true)

      // Greeting should have added speech and options
      const hasSpeech = game.scene.content.some(
        item => item.type === 'speech' && (item as { text: string }).text === 'Hello!'
      )
      expect(hasSpeech).toBe(true)

      // Should have Cancel and Go options
      expect(game.scene.options.length).toBe(2)
      expect(game.scene.options[0].label).toBe('Cancel the date')
      expect(game.scene.options[1].label).toBe('Go with him')
    })

    it('dateCancel applies penalty and removes card', () => {
      const game = gameAt(1902, 1, 6, 19)
      const npc = game.getNPC('date-test-npc')
      npc.affection = 30
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.scene.npc = 'date-test-npc'
      game.run('dateCancel', { npc: 'date-test-npc' })

      expect(getDateCard(game)).toBeUndefined()
      expect(npc.affection).toBe(10) // 30 - 20
    })

    it('dateStart runs the date scene', () => {
      const game = gameAt(1902, 1, 6, 19)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.clearScene()
      game.run('dateStart', { npc: 'date-test-npc' })

      // First scene should be shown
      const hasText = game.scene.content.some(
        item => item.type === 'paragraph' && (item as any).content.some(
          (c: any) => c.text === 'The date begins.'
        )
      )
      expect(hasText).toBe(true)
    })

    it('dateComplete applies bonus and removes card', () => {
      const game = gameAt(1902, 1, 6, 19)
      const npc = game.getNPC('date-test-npc')
      npc.affection = 30
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.run('dateComplete', { npc: 'date-test-npc' })

      expect(getDateCard(game)).toBeUndefined()
      expect(npc.affection).toBe(40) // 30 + 10 bonus
    })
  })

  describe('standardGreeting pronoun support', () => {
    it('uses NPC pronouns for accept button label', () => {
      const game = gameAt(1902, 1, 6, 19)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      // Build greeting with no custom goLabel
      const greeting = standardGreeting('Hello!')
      game.scene.npc = 'date-test-npc'
      game.getNPC('date-test-npc') // ensure generated
      game.clearScene()
      game.run(greeting)

      // Should say "Go with him" because the NPC uses PRONOUNS.he
      const goOption = game.scene.options.find(o => o.label?.startsWith('Go with'))
      expect(goOption).toBeDefined()
      expect(goOption!.label).toBe('Go with him')
    })

    it('allows custom goLabel override', () => {
      const game = gameAt(1902, 1, 6, 19)
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const greeting = standardGreeting('Hello!', 'Follow him')
      game.scene.npc = 'date-test-npc'
      game.getNPC('date-test-npc')
      game.clearScene()
      game.run(greeting)

      const goOption = game.scene.options.find(o => o.label === 'Follow him')
      expect(goOption).toBeDefined()
    })
  })

  describe('standardCancel affection handling', () => {
    it('clamps affection at 0', () => {
      const game = gameAt(1902, 1, 6, 19)
      const npc = game.getNPC('date-test-npc')
      npc.affection = 5 // Less than penalty of 20
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      game.scene.npc = 'date-test-npc'
      const cancel = standardCancel('Sad.', 20)
      game.run(cancel)

      expect(npc.affection).toBe(0) // Clamped, not negative
    })
  })

  describe('standardComplete affection handling', () => {
    it('clamps affection at 100', () => {
      const game = gameAt(1902, 1, 6, 19)
      const npc = game.getNPC('date-test-npc')
      npc.affection = 95
      addDateCard(game, 'date-test-npc', meetTimeAt(1902, 1, 6))

      const complete = standardComplete(15)
      game.run(complete)

      expect(npc.affection).toBe(100) // Clamped, not 110
    })
  })

  describe('endDate DSL instruction', () => {
    it('produces a dateComplete instruction tuple', () => {
      const instruction = endDate()
      expect(instruction).toEqual(['dateComplete', {}])
    })
  })
})
