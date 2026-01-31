import { describe, it, expect } from 'vitest'
import { Game } from './Game'
import { addReputation, reputation } from './ScriptDSL'
import { getFaction, getReputation, getReputationsForFaction, getAllFactionIds, getAllReputationIds } from './Faction'
import '../story/World'

describe('Faction system', () => {
  // ── Registry ──

  describe('registry', () => {
    it('registers the three factions', () => {
      const ids = getAllFactionIds()
      expect(ids).toContain('school')
      expect(ids).toContain('lowtown')
      expect(ids).toContain('high-society')
    })

    it('registers all reputation tracks', () => {
      const ids = getAllReputationIds()
      expect(ids).toContain('academic')
      expect(ids).toContain('social')
      expect(ids).toContain('sporting')
      expect(ids).toContain('gangster')
      expect(ids).toContain('bad-girl')
      expect(ids).toContain('junkie')
      expect(ids).toContain('socialite')
      expect(ids).toContain('entertainer')
      expect(ids).toContain('politics')
      expect(ids).toContain('service')
      expect(ids).length(10)
    })

    it('maps reputations to factions', () => {
      expect(getReputationsForFaction('school')).toEqual(['academic', 'social', 'sporting'])
      expect(getReputationsForFaction('lowtown')).toEqual(['gangster', 'bad-girl', 'junkie'])
      expect(getReputationsForFaction('high-society')).toEqual(['socialite', 'entertainer', 'politics', 'service'])
    })

    it('returns faction and reputation definitions', () => {
      const school = getFaction('school')
      expect(school?.name).toBe('School')

      const academic = getReputation('academic')
      expect(academic?.name).toBe('Academic')
      expect(academic?.faction).toBe('school')
    })

    it('returns undefined for unknown IDs', () => {
      expect(getFaction('nonexistent')).toBeUndefined()
      expect(getReputation('nonexistent')).toBeUndefined()
      expect(getReputationsForFaction('nonexistent')).toEqual([])
    })
  })

  // ── DSL builders ──

  describe('DSL builders', () => {
    it('addReputation produces correct instruction', () => {
      expect(addReputation('academic', 5)).toEqual(['addReputation', { reputation: 'academic', change: 5 }])
    })

    it('addReputation with options', () => {
      expect(addReputation('gangster', 3, { max: 50, hidden: true })).toEqual(
        ['addReputation', { reputation: 'gangster', change: 3, max: 50, hidden: true }]
      )
    })

    it('reputation produces correct instruction', () => {
      expect(reputation('socialite', { min: 30 })).toEqual(
        ['reputation', { reputation: 'socialite', min: 30 }]
      )
    })

    it('reputation with no options', () => {
      expect(reputation('academic')).toEqual(['reputation', { reputation: 'academic' }])
    })
  })

  // ── Script execution ──

  describe('addReputation', () => {
    it('modifies player reputation', () => {
      const game = new Game()
      game.run(addReputation('academic', 10))
      expect(game.player.reputation.get('academic')).toBe(10)
    })

    it('clamps to max (default 100)', () => {
      const game = new Game()
      game.run(addReputation('academic', 999))
      expect(game.player.reputation.get('academic')).toBe(100)
    })

    it('clamps to custom max', () => {
      const game = new Game()
      game.run(addReputation('academic', 999, { max: 50 }))
      expect(game.player.reputation.get('academic')).toBe(50)
    })

    it('clamps to min (default 0)', () => {
      const game = new Game()
      game.player.reputation.set('gangster', 10)
      game.run(addReputation('gangster', -999))
      expect(game.player.reputation.get('gangster')).toBe(0)
    })

    it('clamps to custom min', () => {
      const game = new Game()
      game.player.reputation.set('gangster', 10)
      game.run(addReputation('gangster', -999, { min: 5 }))
      expect(game.player.reputation.get('gangster')).toBe(5)
    })

    it('skips if actual change is zero', () => {
      const game = new Game()
      game.run(addReputation('academic', -5)) // already 0, can't go lower
      expect(game.player.reputation.get('academic')).toBeUndefined() // never set
    })

    it('throws for unknown reputation', () => {
      const game = new Game()
      expect(() => game.run(['addReputation', { reputation: 'nonexistent', change: 1 }])).toThrow('unknown reputation')
    })

    it('shows feedback text when not hidden', () => {
      const game = new Game()
      game.run(addReputation('academic', 5))
      const output = game.scene.content
      expect(output.length).toBeGreaterThan(0)
      const last = output[output.length - 1]
      expect(JSON.stringify(last)).toContain('Academic')
    })

    it('suppresses feedback when hidden', () => {
      const game = new Game()
      game.run(addReputation('academic', 5, { hidden: true }))
      expect(game.scene.content.length).toBe(0)
    })
  })

  describe('reputation', () => {
    it('returns 0 when reputation is 0 (default check)', () => {
      const game = new Game()
      expect(game.run(reputation('academic'))).toBe(0)
    })

    it('returns raw value when reputation > 0 (default check)', () => {
      const game = new Game()
      game.player.reputation.set('academic', 1)
      expect(game.run(reputation('academic'))).toBe(1)
    })

    it('checks min threshold', () => {
      const game = new Game()
      game.player.reputation.set('academic', 30)
      expect(game.run(reputation('academic', { min: 20 }))).toBe(true)
      expect(game.run(reputation('academic', { min: 50 }))).toBe(false)
    })

    it('checks max threshold', () => {
      const game = new Game()
      game.player.reputation.set('academic', 30)
      expect(game.run(reputation('academic', { max: 40 }))).toBe(true)
      expect(game.run(reputation('academic', { max: 20 }))).toBe(false)
    })

    it('checks min and max together', () => {
      const game = new Game()
      game.player.reputation.set('academic', 30)
      expect(game.run(reputation('academic', { min: 20, max: 40 }))).toBe(true)
      expect(game.run(reputation('academic', { min: 40, max: 50 }))).toBe(false)
    })
  })

  // ── Serialisation ──

  describe('serialisation', () => {
    it('reputation survives save/load round-trip', () => {
      const game = new Game()
      game.player.reputation.set('academic', 42)
      game.player.reputation.set('gangster', 15)

      const json = JSON.stringify(game.toJSON())
      const restored = Game.fromJSON(json)

      expect(restored.player.reputation.get('academic')).toBe(42)
      expect(restored.player.reputation.get('gangster')).toBe(15)
    })

    it('missing reputation data loads cleanly (backwards compatible)', () => {
      const game = new Game()
      const data = game.toJSON()
      // Simulate old save with no reputation field
      delete (data.player as unknown as Record<string, unknown>).reputation

      const restored = Game.fromJSON(data)
      // Should default to 0 (empty map, get returns undefined, scripts use ?? 0)
      expect(restored.player.reputation.get('academic')).toBeUndefined()
    })

    it('zero-value reputations are not serialised', () => {
      const game = new Game()
      game.player.reputation.set('academic', 0)
      const data = game.toJSON()
      expect(data.player.reputation).toBeUndefined()
    })
  })
})
