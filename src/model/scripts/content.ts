/** Core content/display scripts: text, paragraph, say, option, npcLeaveOption. */

import type { Game } from '../Game'
import type { InlineContent } from '../Format'
import { speech, p, highlight } from '../Format'
import { type ScriptFn, type Instruction, makeScripts } from '../Scripts'
import { resolveParts } from './helpers'

const contentScripts: Record<string, ScriptFn> = {
  /** Add plain text to the scene. Parts can be strings or Instructions that return ParagraphContent. */
  text: (game: Game, params: { parts?: (string | Instruction)[] }) => {
    if (!params.parts || params.parts.length === 0) return
    const resolvedParts = resolveParts(game, params.parts)
    if (resolvedParts.length > 0) {
      game.add(p(...resolvedParts))
    }
  },

  /** Add a formatted paragraph with optional highlights */
  paragraph: (game: Game, params: { content?: (string | { text: string; color: string; hoverText?: string })[] }) => {
    if (!params.content) return
    const content: (string | InlineContent)[] = params.content.map(item => {
      if (typeof item === 'string') return item
      return highlight(item.text, item.color, item.hoverText)
    })
    game.add(p(...content))
  },

  /** NPC speech - parts can be strings or Instructions that return ParagraphContent */
  say: (game: Game, params: { parts?: (string | Instruction)[] }) => {
    if (!params.parts || params.parts.length === 0) return
    const resolvedParts = resolveParts(game, params.parts)
    if (resolvedParts.length > 0) {
      // Join all parts into a single text string for speech
      const text = resolvedParts.map(part => {
        if (typeof part === 'string') return part
        // ParagraphContent - extract text
        return part.text
      }).join('')
      // Use the scene NPC's speech color if available
      const npcId = game.scene.npc
      const color = npcId ? game.getNPC(npcId).template.speechColor : undefined
      game.add(speech(text, color))
    }
  },

  /** Return the player's name as InlineContent */
  playerName: (game: Game): InlineContent => {
    const name = game.player.name || 'Elise'
    return { type: 'text', text: name, color: '#e0b0ff' }
  },

  /** Short alias for playerName — for use in text interpolation: {pc} */
  pc: (game: Game): InlineContent => {
    const name = game.player.name || 'Elise'
    return { type: 'text', text: name, color: '#e0b0ff' }
  },

  /** Return an NPC's name as InlineContent. Uses scene NPC if not specified. */
  npcName: (game: Game, params: { npc?: string }): InlineContent => {
    const npcId = params.npc ?? game.scene.npc
    if (!npcId) {
      return { type: 'text', text: 'someone' }
    }
    const npc = game.getNPC(npcId)
    const name = npc.nameKnown > 0 ? npc.template.name : npc.template.uname
    const displayName = name || 'someone'
    const color = npc.template.speechColor ?? '#888'
    return { type: 'text', text: displayName, color }
  },

  /**
   * Add an option button to the scene. Content is pushed as a stack frame
   * when the player clicks; when it exhausts, control returns to the parent context.
   * An option with no content acts as a "continue" button (advances the stack).
   */
  option: (game: Game, params: { label?: string; content?: Instruction[] }) => {
    const label = params.label
    if (!label) return
    const content = params.content
    if (!content || content.length === 0) {
      game.addOption('continue', label)
      return
    }
    const action: Instruction = content.length === 1 ? content[0] : ['seq', { instructions: content }]
    game.addOption(action, label)
  },

  /** Standard NPC conversation leave option — includes exitScene to break out of menu loops. */
  npcLeaveOption: (game: Game, params: { text?: string; reply?: string; label?: string }) => {
    const action: Instruction = ['seq', { instructions: [
      ['endConversation', { text: params.text, reply: params.reply }] as Instruction,
      ['exitScene', {}] as Instruction,
    ] }]
    game.addOption(action, params.label ?? 'Leave')
  },
}

makeScripts(contentScripts)
