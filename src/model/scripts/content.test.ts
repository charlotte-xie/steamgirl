import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../Game'
import { registerNPC, getNPCDefinition, PRONOUNS } from '../NPC'
import '../../story/World'

if (!getNPCDefinition('content-test-npc')) registerNPC('content-test-npc', {
  name: 'TestNPC',
  uname: 'test person',
  speechColor: '#aabbcc',
  pronouns: PRONOUNS.she,
})

let game: Game

beforeEach(() => {
  game = new Game()
  game.clearScene()
})

describe('text', () => {
  it('adds a paragraph to scene content', () => {
    game.run('text', { parts: ['Hello world'] })
    expect(game.scene.content).toHaveLength(1)
    expect(game.scene.content[0].type).toBe('paragraph')
  })

  it('does nothing with empty parts', () => {
    game.run('text', { parts: [] })
    expect(game.scene.content).toHaveLength(0)
  })

  it('does nothing with no parts', () => {
    game.run('text', {})
    expect(game.scene.content).toHaveLength(0)
  })
})

describe('say', () => {
  it('adds speech content with NPC colour', () => {
    game.scene.npc = 'content-test-npc'
    game.getNPC('content-test-npc') // ensure instantiated
    game.run('say', { parts: ['Hello there.'] })
    expect(game.scene.content).toHaveLength(1)
    expect(game.scene.content[0].type).toBe('speech')
  })

  it('does nothing with empty parts', () => {
    game.run('say', { parts: [] })
    expect(game.scene.content).toHaveLength(0)
  })
})

describe('option', () => {
  it('adds an option button to the scene', () => {
    game.run('option', { label: 'Click me', content: [['text', { parts: ['Clicked'] }]] })
    expect(game.scene.options).toHaveLength(1)
    expect(game.scene.options[0].label).toBe('Click me')
  })

  it('creates a continue button when no content', () => {
    game.run('option', { label: 'Continue' })
    expect(game.scene.options).toHaveLength(1)
    expect(game.scene.options[0].label).toBe('Continue')
    expect(game.scene.options[0].action).toBe('continue')
  })

  it('does nothing without label', () => {
    game.run('option', {})
    expect(game.scene.options).toHaveLength(0)
  })
})

describe('npcLeaveOption', () => {
  it('adds a leave option with default label', () => {
    game.run('npcLeaveOption', {})
    expect(game.scene.options).toHaveLength(1)
    expect(game.scene.options[0].label).toBe('Leave')
  })

  it('uses custom label when provided', () => {
    game.run('npcLeaveOption', { label: 'Goodbye' })
    expect(game.scene.options[0].label).toBe('Goodbye')
  })
})

describe('playerName / pc', () => {
  it('returns player name as InlineContent', () => {
    game.player.name = 'Charlotte'
    const result = game.run('playerName', {}) as { type: string; text: string }
    expect(result.type).toBe('text')
    expect(result.text).toBe('Charlotte')
  })

  it('pc is an alias for playerName', () => {
    game.player.name = 'Charlotte'
    const result = game.run('pc', {}) as { type: string; text: string }
    expect(result.text).toBe('Charlotte')
  })

  it('defaults to Elise when no name set', () => {
    game.player.name = ''
    const result = game.run('playerName', {}) as { type: string; text: string }
    expect(result.text).toBe('Elise')
  })
})

describe('npcName', () => {
  it('returns NPC name when known', () => {
    const npc = game.getNPC('content-test-npc')
    npc.nameKnown = 1
    game.scene.npc = 'content-test-npc'
    const result = game.run('npcName', {}) as { type: string; text: string }
    expect(result.text).toBe('TestNPC')
  })

  it('returns uname when name not known', () => {
    const npc = game.getNPC('content-test-npc')
    npc.nameKnown = 0
    game.scene.npc = 'content-test-npc'
    const result = game.run('npcName', {}) as { type: string; text: string }
    expect(result.text).toBe('test person')
  })

  it('returns someone when no NPC set', () => {
    game.scene.npc = undefined
    const result = game.run('npcName', {}) as { type: string; text: string }
    expect(result.text).toBe('someone')
  })
})
