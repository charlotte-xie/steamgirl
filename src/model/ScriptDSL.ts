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

import { Game } from './Game'
import { makeScripts } from './Scripts'

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
  run('text', { text: t })

/** Add a formatted paragraph with optional highlights */
export const paragraph = (...content: (string | { text: string; color: string; hoverText?: string })[]): Instruction =>
  run('paragraph', { content })

/** Highlight text within a paragraph */
export const hl = (text: string, color: string, hoverText?: string): { text: string; color: string; hoverText?: string } =>
  ({ text, color, hoverText })

/** NPC speech - uses NPC's default color if npc provided */
export const say = (text: string, npc?: string, color?: string): Instruction =>
  run('say', { text, npc, color })

/** Add an option button to the scene */
export const option = (script: string, params?: object, label?: string): Instruction =>
  run('option', { script, params: params ?? {}, label })

/** Standard NPC conversation leave option */
export const npcLeaveOption = (text?: string, reply?: string, label = 'Leave'): Instruction =>
  run('npcLeaveOption', { text, reply, label })

// --- Control Flow ---

/** Execute a sequence of instructions */
export const seq = (...instructions: Instruction[]): Instruction =>
  run('seq', { instructions })

/**
 * Conditional execution - runs `then` instructions if condition is truthy.
 * Variadic: when(cond, instr1, instr2, ...)
 */
export const when = (condition: Instruction, ...then: Instruction[]): Instruction =>
  run('when', { condition, then })

/**
 * Opposite of when - runs instructions if condition is FALSE.
 */
export const unless = (condition: Instruction, ...then: Instruction[]): Instruction =>
  run('when', { condition: _not(condition), then })

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

  return run('cond', { branches, default: defaultExpr })
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
  run('addQuest', { questId, args })

/** Complete a quest card */
export const completeQuest = (questId: string): Instruction =>
  run('completeQuest', { questId })

/** Add an effect card */
export const addEffect = (effectId: string, args?: object): Instruction =>
  run('addEffect', { effectId, args })

// --- Predicates (return boolean) ---

/** Check if player has item */
export const hasItem = (item: string, count = 1): Instruction =>
  run('hasItem', { item, count })

/** Check player stat value */
export const hasStat = (stat: string, min?: number, max?: number): Instruction =>
  run('hasStat', { stat, min, max })

/** Check if player is at location */
export const inLocation = (location: string): Instruction =>
  run('inLocation', { location })

/** Check if currently in a scene (has options) */
export const inScene = (): Instruction =>
  run('inScene', {})

/** Check NPC stat value */
export const npcStat = (npc: string, stat: string, min?: number, max?: number): Instruction =>
  run('npcStat', { npc, stat, min, max })

/** Check if player has a card */
export const hasCard = (cardId: string): Instruction =>
  run('hasCard', { cardId })

/** Check if a card is completed */
export const cardCompleted = (cardId: string): Instruction =>
  run('cardCompleted', { cardId })

/** Negate a predicate */
export const not = (predicate: Instruction): Instruction =>
  run('not', { predicate })

// Internal not for unless - avoids name collision
const _not = not

/** All predicates must be true */
export const and = (...predicates: Instruction[]): Instruction =>
  run('and', { predicates })

/** Any predicate must be true */
export const or = (...predicates: Instruction[]): Instruction =>
  run('or', { predicates })

// ============================================================================
// EXECUTION HELPERS
// ============================================================================

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

/** Register a script that executes a sequence of DSL instructions */
export function registerDslScript(name: string, instructions: Instruction[]): void {
  makeScripts({
    [name]: (game: Game) => execAll(game, instructions)
  })
}
