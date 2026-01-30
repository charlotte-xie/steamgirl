import { describe, it, expect } from 'vitest'
import { Game } from './Game'
import type { InlineContent } from './Format'
import '../story/World'

describe('Text Interpolation', () => {
  function getResolvedParts(game: Game, template: string): (string | InlineContent)[] {
    // Use say() to capture resolved parts — say joins them into speech content
    // Instead, use text() which adds a paragraph with the resolved parts
    game.scene.content = []
    game.run('text', { parts: [template] })
    const content = game.scene.content[0]
    if (content && 'content' in content && content.type === 'paragraph') {
      return content.content.map(c =>
        c.color ? c : c.text // Return InlineContent if it has color, else plain string
      )
    }
    return []
  }

  it('resolves {pc} to player name with colour', () => {
    const game = new Game()
    game.player.name = 'Elise'
    const parts = getResolvedParts(game, 'Hello {pc}!')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('Hello ')
    expect(parts[1]).toEqual({ type: 'text', text: 'Elise', color: '#e0b0ff' })
    expect(parts[2]).toBe('!')
  })

  it('resolves {playerName} (existing script)', () => {
    const game = new Game()
    game.player.name = 'TestPlayer'
    const parts = getResolvedParts(game, '{playerName}')
    expect(parts).toHaveLength(1)
    expect(parts[0]).toEqual({ type: 'text', text: 'TestPlayer', color: '#e0b0ff' })
  })

  it('produces red error for unknown scripts', () => {
    const game = new Game()
    const parts = getResolvedParts(game, 'Hello {unknownScript}!')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('Hello ')
    expect(parts[1]).toEqual({ type: 'text', text: '{unknownScript}', color: '#ff4444' })
    expect(parts[2]).toBe('!')
  })

  it('handles escaped braces', () => {
    const game = new Game()
    const parts = getResolvedParts(game, 'Use {{pc}} for names')
    expect(parts).toHaveLength(1)
    expect(parts[0]).toBe('Use {pc} for names')
  })

  it('passes through strings without braces unchanged', () => {
    const game = new Game()
    const parts = getResolvedParts(game, 'No interpolation here')
    expect(parts).toHaveLength(1)
    expect(parts[0]).toBe('No interpolation here')
  })

  it('handles empty braces as error', () => {
    const game = new Game()
    const parts = getResolvedParts(game, 'Empty {} here')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('Empty ')
    expect(parts[1]).toEqual({ type: 'text', text: '{}', color: '#ff4444' })
    expect(parts[2]).toBe(' here')
  })

  it('handles unclosed brace as literal', () => {
    const game = new Game()
    const parts = getResolvedParts(game, 'Unclosed { brace')
    expect(parts).toHaveLength(1)
    expect(parts[0]).toBe('Unclosed { brace')
  })

  it('works with say() producing speech content', () => {
    const game = new Game()
    game.player.name = 'Elise'
    // Set up a scene NPC for say() to use
    game.scene.content = []
    game.run('say', { parts: ['Hello {pc}!'] })
    const content = game.scene.content[0]
    expect(content).toBeDefined()
    expect(content.type).toBe('speech')
    if (content.type === 'speech') {
      expect(content.text).toBe('Hello Elise!')
    }
  })

  it('handles multiple interpolations in one string', () => {
    const game = new Game()
    game.player.name = 'Elise'
    const parts = getResolvedParts(game, '{pc} meets {pc}')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toEqual({ type: 'text', text: 'Elise', color: '#e0b0ff' })
    expect(parts[1]).toBe(' meets ')
    expect(parts[2]).toEqual({ type: 'text', text: 'Elise', color: '#e0b0ff' })
  })

  describe('NPC accessor', () => {
    function npcGame(): Game {
      const game = new Game()
      game.scene.npc = 'tour-guide'
      game.getNPC('tour-guide').stats.set('nameKnown', 1)
      return game
    }

    it('{npc} returns scene NPC display name', () => {
      const game = npcGame()
      const parts = getResolvedParts(game, '{npc} looks up.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toEqual({ type: 'text', text: 'Rob Hayes', color: '#94a3b8' })
      expect(parts[1]).toBe(' looks up.')
    })

    it('{npc} returns uname when name not known', () => {
      const game = npcGame()
      game.getNPC('tour-guide').stats.set('nameKnown', 0)
      const parts = getResolvedParts(game, '{npc} looks up.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toEqual({ type: 'text', text: 'tour guide', color: '#94a3b8' })
    })

    it('{npc:he} returns pronoun', () => {
      const game = npcGame()
      const parts = getResolvedParts(game, '{npc:he} smiles.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toBe('he')
      expect(parts[1]).toBe(' smiles.')
    })

    it('{npc:He} returns capitalised pronoun', () => {
      const game = npcGame()
      const parts = getResolvedParts(game, '{npc:He} smiles.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toBe('He')
    })

    it('{npc:him} and {npc:his} return object/possessive pronouns', () => {
      const game = npcGame()
      expect(getResolvedParts(game, '{npc:him}')[0]).toBe('him')
      expect(getResolvedParts(game, '{npc:his}')[0]).toBe('his')
    })

    it('{npc(tour-guide)} returns specific NPC name', () => {
      const game = new Game() // no scene NPC set
      game.getNPC('tour-guide').stats.set('nameKnown', 1)
      const parts = getResolvedParts(game, '{npc(tour-guide)} waves.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toEqual({ type: 'text', text: 'Rob Hayes', color: '#94a3b8' })
    })

    it('{npc(tour-guide):he} returns specific NPC pronoun', () => {
      const game = new Game()
      const parts = getResolvedParts(game, '{npc(tour-guide):he} waves.')
      expect(parts).toHaveLength(2)
      expect(parts[0]).toBe('he')
    })

    it('{npc:unknown} produces red error', () => {
      const game = npcGame()
      const parts = getResolvedParts(game, '{npc:unknown}')
      expect(parts).toHaveLength(1)
      expect(parts[0]).toEqual({ type: 'text', text: '{npc:unknown}', color: '#ff4444' })
    })
  })
})
