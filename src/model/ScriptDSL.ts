/**
 * Declarative Script DSL
 *
 * A thin syntax layer that compiles to [scriptName, params] tuples.
 * Instructions are executed by calling scripts from the script library.
 *
 * Key concepts:
 * - An Instruction is simply [scriptName, params] - a script call
 * - DSL builders are pure functions that construct these tuples
 * - Control flow (when, cond, seq) and predicates are also scripts
 * - Everything is JSON-serializable
 *
 * Example usage:
 * ```typescript
 * const enterTavern = [
 *   text("You enter the tavern"),
 *   say("Welcome!", "barkeeper"),
 *   when(hasItem('crown', 5),
 *     say("A paying customer!", "barkeeper"),
 *     option('buyDrink', {}, 'Buy a drink')
 *   ),
 *   option('leave', {}, 'Leave')
 * ]
 * ```
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/** An instruction is a script call: [scriptName, params] */
export type Instruction = [string, Record<string, unknown>]

// ============================================================================
// DSL BUILDERS - Pure functions that construct instruction tuples
// ============================================================================

/** Generic instruction builder - call any script */
export const run = (script: string, params: Record<string, unknown> = {}): Instruction =>
  [script, params]

// --- Content ---

/** Add plain text to the scene */
export const text = (t: string): Instruction =>
  run('dsl.text', { text: t })

/** Add a formatted paragraph with optional highlights */
export const paragraph = (...content: (string | { text: string; color: string; hoverText?: string })[]): Instruction =>
  run('dsl.paragraph', { content })

/** Highlight text within a paragraph */
export const hl = (text: string, color: string, hoverText?: string): { text: string; color: string; hoverText?: string } =>
  ({ text, color, hoverText })

/** NPC speech - uses NPC's default color if npc provided */
export const say = (text: string, npc?: string, color?: string): Instruction =>
  run('dsl.say', { text, npc, color })

/** Add an option button to the scene */
export const option = (script: string, params?: object, label?: string): Instruction =>
  run('dsl.option', { script, params: params ?? {}, label })

/** Standard NPC conversation leave option */
export const npcLeaveOption = (text?: string, reply?: string, label = 'Leave'): Instruction =>
  run('dsl.npcLeaveOption', { text, reply, label })

// --- Control Flow ---

/** Execute a sequence of instructions */
export const seq = (...instructions: Instruction[]): Instruction =>
  run('dsl.seq', { instructions })

/**
 * Conditional execution - runs `then` instructions if condition is truthy.
 * Variadic: when(cond, instr1, instr2, ...)
 */
export const when = (condition: Instruction, ...then: Instruction[]): Instruction =>
  run('dsl.when', { condition, then })

/**
 * Opposite of when - runs instructions if condition is FALSE.
 */
export const unless = (condition: Instruction, ...then: Instruction[]): Instruction =>
  run('dsl.when', { condition: _not(condition), then })

/**
 * Multi-branch conditional (like Lisp cond).
 * - With 3 args: if/else - cond(condition, thenExpr, elseExpr)
 * - With more args: pairs of (condition, expression), last odd arg is default
 */
export function cond(...args: Instruction[]): Instruction {
  if (args.length < 2) {
    throw new Error('cond requires at least 2 arguments')
  }

  const branches: { condition: Instruction; then: Instruction }[] = []
  let defaultExpr: Instruction | undefined

  let i = 0
  while (i < args.length) {
    if (i === args.length - 1 && args.length % 2 === 1) {
      // Odd number of args - last one is default
      defaultExpr = args[i]
      i++
    } else {
      // Pair: condition, expression
      branches.push({ condition: args[i], then: args[i + 1] })
      i += 2
    }
  }

  return run('dsl.cond', { branches, default: defaultExpr })
}

// --- Game Actions ---

/** Add item to inventory */
export const addItem = (item: string, number = 1): Instruction =>
  run('gainItem', { item, number })

/** Remove item from inventory */
export const removeItem = (item: string, number = 1): Instruction =>
  run('loseItem', { item, number })

/** Move player to location */
export const move = (location: string): Instruction =>
  run('move', { location })

/** Advance game time */
export const timeLapse = (minutes: number): Instruction =>
  run('timeLapse', { minutes })

/** Add to a player stat */
export const addStat = (stat: string, change: number): Instruction =>
  run('addStat', { stat, change })

/** Add a quest card */
export const addQuest = (questId: string, args?: object): Instruction =>
  run('dsl.addQuest', { questId, args })

/** Complete a quest card */
export const completeQuest = (questId: string): Instruction =>
  run('dsl.completeQuest', { questId })

/** Add an effect card */
export const addEffect = (effectId: string, args?: object): Instruction =>
  run('dsl.addEffect', { effectId, args })

// --- Predicates (return boolean) ---

/** Check if player has item */
export const hasItem = (item: string, count = 1): Instruction =>
  run('dsl.hasItem', { item, count })

/** Check player stat value */
export const hasStat = (stat: string, min?: number, max?: number): Instruction =>
  run('dsl.hasStat', { stat, min, max })

/** Check if player is at location */
export const inLocation = (location: string): Instruction =>
  run('dsl.inLocation', { location })

/** Check if currently in a scene (has options) */
export const inScene = (): Instruction =>
  run('dsl.inScene', {})

/** Check NPC stat value */
export const npcStat = (npc: string, stat: string, min?: number, max?: number): Instruction =>
  run('dsl.npcStat', { npc, stat, min, max })

/** Check if player has a card */
export const hasCard = (cardId: string): Instruction =>
  run('dsl.hasCard', { cardId })

/** Check if a card is completed */
export const cardCompleted = (cardId: string): Instruction =>
  run('dsl.cardCompleted', { cardId })

/** Negate a predicate */
export const not = (predicate: Instruction): Instruction =>
  run('dsl.not', { predicate })

// Internal not for unless - avoids name collision
const _not = not

/** All predicates must be true */
export const and = (...predicates: Instruction[]): Instruction =>
  run('dsl.and', { predicates })

/** Any predicate must be true */
export const or = (...predicates: Instruction[]): Instruction =>
  run('dsl.or', { predicates })

// ============================================================================
// SCRIPT DEFINITIONS - The actual implementations
// ============================================================================

import { Game, type ParagraphContent } from './Game'
import { speech, p, highlight } from './Format'
import { getNPCDefinition } from './NPC'
import { makeScripts, type Script } from './Scripts'
import { type StatName } from './Stats'

/** Execute an instruction and return its result */
export function exec(game: Game, instruction: Instruction): unknown {
  const [scriptName, params] = instruction
  return game.run(scriptName, params)
}

/** Execute a sequence of instructions */
export function execAll(game: Game, instructions: Instruction[]): void {
  for (const instr of instructions) {
    exec(game, instr)
  }
}

/** DSL scripts - registered with the script system */
export const dslScripts: Record<string, Script> = {
  // --- Content ---

  'dsl.text': (game: Game, params: { text?: string }) => {
    if (params.text) {
      game.add(params.text)
    }
  },

  'dsl.paragraph': (game: Game, params: { content?: (string | { text: string; color: string; hoverText?: string })[] }) => {
    if (!params.content) return
    const content: (string | ParagraphContent)[] = params.content.map(item => {
      if (typeof item === 'string') return item
      return highlight(item.text, item.color, item.hoverText)
    })
    game.add(p(...content))
  },

  'dsl.say': (game: Game, params: { text?: string; npc?: string; color?: string }) => {
    if (!params.text) return
    let color = params.color
    if (!color && params.npc) {
      const npcDef = getNPCDefinition(params.npc)
      color = npcDef?.speechColor
    }
    game.add(speech(params.text, color))
  },

  'dsl.option': (game: Game, params: { script?: string; params?: object; label?: string }) => {
    if (!params.script) return
    game.addOption(params.script, params.params ?? {}, params.label)
  },

  'dsl.npcLeaveOption': (game: Game, params: { text?: string; reply?: string; label?: string }) => {
    game.addOption('endConversation', { text: params.text, reply: params.reply }, params.label ?? 'Leave')
  },

  // --- Control Flow ---

  'dsl.seq': (game: Game, params: { instructions?: Instruction[] }) => {
    if (!params.instructions) return
    execAll(game, params.instructions)
  },

  'dsl.when': (game: Game, params: { condition?: Instruction; then?: Instruction[] }) => {
    if (!params.condition || !params.then) return
    const result = exec(game, params.condition)
    if (result) {
      execAll(game, params.then)
    }
  },

  'dsl.cond': (game: Game, params: { branches?: { condition: Instruction; then: Instruction }[]; default?: Instruction }) => {
    if (!params.branches) return

    for (const branch of params.branches) {
      const result = exec(game, branch.condition)
      if (result) {
        exec(game, branch.then)
        return
      }
    }

    // No branch matched, run default if present
    if (params.default) {
      exec(game, params.default)
    }
  },

  // --- Cards ---

  'dsl.addQuest': (game: Game, params: { questId?: string; args?: Record<string, unknown> }) => {
    if (!params.questId) return
    game.addQuest(params.questId, params.args ?? {})
  },

  'dsl.completeQuest': (game: Game, params: { questId?: string }) => {
    if (!params.questId) return
    game.completeQuest(params.questId)
  },

  'dsl.addEffect': (game: Game, params: { effectId?: string; args?: Record<string, unknown> }) => {
    if (!params.effectId) return
    game.addEffect(params.effectId, params.args ?? {})
  },

  // --- Predicates ---

  'dsl.hasItem': (game: Game, params: { item?: string; count?: number }): boolean => {
    if (!params.item) return false
    return game.player.inventory.some(
      i => i.id === params.item && i.number >= (params.count ?? 1)
    )
  },

  'dsl.hasStat': (game: Game, params: { stat?: string; min?: number; max?: number }): boolean => {
    if (!params.stat) return false
    const value = game.player.stats.get(params.stat as StatName) ?? 0
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  'dsl.inLocation': (game: Game, params: { location?: string }): boolean => {
    return game.currentLocation === params.location
  },

  'dsl.inScene': (game: Game): boolean => {
    return game.inScene
  },

  'dsl.npcStat': (game: Game, params: { npc?: string; stat?: string; min?: number; max?: number }): boolean => {
    if (!params.npc || !params.stat) return false
    const npc = game.npcs.get(params.npc)
    if (!npc) return false
    const value = npc.stats.get(params.stat) ?? 0
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  'dsl.hasCard': (game: Game, params: { cardId?: string }): boolean => {
    if (!params.cardId) return false
    return game.player.cards.some(c => c.id === params.cardId)
  },

  'dsl.cardCompleted': (game: Game, params: { cardId?: string }): boolean => {
    if (!params.cardId) return false
    const card = game.player.cards.find(c => c.id === params.cardId)
    return card?.completed === true
  },

  'dsl.not': (game: Game, params: { predicate?: Instruction }): boolean => {
    if (!params.predicate) return true
    return !exec(game, params.predicate)
  },

  'dsl.and': (game: Game, params: { predicates?: Instruction[] }): boolean => {
    if (!params.predicates) return true
    return params.predicates.every(p => exec(game, p))
  },

  'dsl.or': (game: Game, params: { predicates?: Instruction[] }): boolean => {
    if (!params.predicates) return false
    return params.predicates.some(p => exec(game, p))
  },
}

// Register all DSL scripts
makeScripts(dslScripts)

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/** Register a script that executes a sequence of DSL instructions */
export function registerDslScript(name: string, instructions: Instruction[]): void {
  makeScripts({
    [name]: (game: Game) => execAll(game, instructions)
  })
}
