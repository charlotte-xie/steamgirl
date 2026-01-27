/**
 * Declarative Script DSL for narrative content
 *
 * A thin syntax layer that compiles to serialisable [scriptName, params] tuples.
 * Instructions are executed by calling scripts from the script library.
 *
 * Key concepts:
 * - An Instruction is simply [scriptName, params] - a script call
 * - DSL builders are pure functions that construct these tuples
 * - Control flow (when, cond, seq) and predicates are also scripts
 * - Everything is JSON-serializable
 *
 * General flow:
 * DSL builder => Instruction like ['scriptName', { text: 'Hello' }]
 * Instruction => game.run(scriptName, params)
 * game.run => script function(s)
 * script function => game state changes
 *
 * Example usage:
 * ```typescript
 * const enterTavern = [
 *   text("You enter the tavern."),
 *   say(npcName(), " looks up. ", '"Welcome!"'),
 *   when(hasItem('crown', 5),
 *     say('"A paying customer!"'),
 *     option('buyDrink', {}, 'Buy a drink')
 *   ),
 *   option('Leave', {}, 'leave')
 * ]
 * ```
 */

import { Game } from './Game'
import { makeScripts, type Instruction } from './Scripts'

// Re-export Instruction for convenience
export type { Instruction }

// ============================================================================
// CORE TYPES
// ============================================================================

/** A scene element: either an Instruction or a plain string (auto-wrapped in text()). */
export type SceneElement = Instruction | string

/** Convert a SceneElement to an Instruction. Strings become text() calls. */
export function toInstruction(el: SceneElement): Instruction {
  return typeof el === 'string' ? text(el) : el
}

// ============================================================================
// DSL BUILDERS - Pure functions that construct instruction tuples
// ============================================================================

/** Generic instruction builder - call any script */
export const run = (script: string, params: Record<string, unknown> = {}): Instruction =>
  [script, params]

// --- Content ---

/** A text part can be a string or an Instruction that produces content */
export type TextPart = string | Instruction

/** Add plain text to the scene. Accepts strings and Instructions (like npcName, playerName). */
export const text = (...parts: TextPart[]): Instruction =>
  run('text', { parts })

/** Add a formatted paragraph with optional highlights */
export const paragraph = (...content: (string | { text: string; color: string; hoverText?: string })[]): Instruction =>
  run('paragraph', { content })

/** Highlight text within a paragraph */
export const hl = (text: string, color: string, hoverText?: string): { text: string; color: string; hoverText?: string } =>
  ({ text, color, hoverText })

/** NPC speech - uses NPC's default color if npc provided. Accepts strings and Instructions.
 * Authors should NOT use extra quotes within say() these are provided for in the output format.
 */
export const say = (...parts: TextPart[]): Instruction =>
  run('say', { parts })

/** Display player name with highlight formatting */
export const playerName = (): Instruction =>
  run('playerName', {})

/** Display NPC name with their speech color. Uses scene NPC if not specified. */
export const npcName = (npc?: string): Instruction =>
  run('npcName', { npc })

/**
 * Add an option button to the scene — fire-and-forget navigation.
 *
 * When clicked the named script runs and takes over completely; there is
 * no automatic return to the current scene. Use for menu items, NPC
 * interactions, "Leave" buttons, and any navigation that exits the
 * current context.
 *
 * For player choices **within** a `scenes()` sequence that should resume
 * afterwards, use `branch()` instead.
 *
 * Script resolution:
 * - 'npc:scriptName' - explicitly call NPC script
 * - 'global:scriptName' - explicitly call global script
 * - 'scriptName' (no prefix) - context-aware:
 *   - If in NPC scene, tries NPC script first, falls back to global
 *   - Otherwise uses global script
 *
 * If script is omitted, derives it from label (lowercase, spaces removed).
 *
 * @param label - Button label shown to player (required)
 * @param script - Script name with optional namespace prefix (default: derived from label)
 * @param params - Parameters to pass to the script
 */
export const option = (label: string, script?: string, params?: object): Instruction =>
  run('option', { label, script, params: params ?? {} })

/** Standard NPC conversation leave option */
export const npcLeaveOption = (text?: string, reply?: string, label = 'Leave'): Instruction =>
  run('npcLeaveOption', { text, reply, label })

/** Run a named script on the current scene NPC (calls the 'interact' script). */
export const npcInteract = (script: string, params?: object): Instruction =>
  run('interact', { script, params: params ?? {} })

// --- Control Flow ---

/** Execute a sequence of instructions. Plain strings become text() calls. */
export const seq = (...instructions: SceneElement[]): Instruction =>
  run('seq', { instructions: instructions.map(toInstruction) })

/**
 * Conditional execution - runs `then` instructions if condition is truthy.
 * Variadic: when(cond, instr1, instr2, ...)
 */
export const when = (condition: Instruction, ...then: SceneElement[]): Instruction =>
  run('when', { condition, then: then.map(toInstruction) })

/**
 * Opposite of when - runs instructions if condition is FALSE.
 */
export const unless = (condition: Instruction, ...then: SceneElement[]): Instruction =>
  run('when', { condition: _not(condition), then: then.map(toInstruction) })

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

/** Execute a random instruction from the provided children. Plain strings become text() calls. */
export const random = (...children: SceneElement[]): Instruction =>
  run('random', { children: children.map(toInstruction) })

/**
 * Create a linear sequence of scenes with automatic "Continue" buttons.
 * Each page is a SceneElement — use `scene()` or `seq()` to group multiple
 * instructions into one page. Plain strings become `text()` calls.
 *
 * @example
 * scenes(
 *   scene(move('city'), 'Welcome to the city!'),
 *   scene(move('market'), 'Here is the market.'),
 *   'And finally, the park.',
 * )
 */
export const scenes = (...pages: SceneElement[]): Instruction => {
  if (pages.length === 0) return seq()
  const instructions = pages.map(toInstruction)
  if (instructions.length === 1) return instructions[0]
  const [first, ...rest] = instructions
  return seq(first, run('pushScenePages', { pages: rest }))
}

/**
 * Group multiple instructions into a single scene page.
 * Compiles to `seq()`. Plain strings become `text()` calls.
 *
 * @example
 * scenes(
 *   scene(move('lake', 15), 'Rob offers his arm...'),
 *   scene('Steam rises from the water.', say('I come here often.')),
 * )
 */
export const scene = (...elements: SceneElement[]): Instruction =>
  seq(...elements)

/**
 * Create a player-choice option that **continues** the current `scenes()`
 * sequence after its content plays out.
 *
 * Unlike `option()` (fire-and-forget — runs a script, no return), `branch()`
 * pushes its content onto the scene stack so the outer sequence resumes
 * automatically once the branch finishes. Use `branch()` for story choices
 * inside narrative sequences; use `option()` for menu navigation.
 *
 * Single-page branch:
 *   branch('Kiss him', 'You kiss.', addNpcStat('affection', 5))
 *
 * Multi-page branch — wrap in scenes():
 *   branch('Go to the garden', scenes(
 *     scene(move('garden'), 'You arrive at the garden.'),
 *     scene('The roses are beautiful.', endDate()),
 *   ))
 *
 * @param label - Button label shown to the player
 * @param rest - SceneElements to display when chosen (strings auto-wrap to text())
 */
export function branch(label: string, ...rest: SceneElement[]): Instruction {
  return option(label, 'global:advanceScene', {
    push: [seq(...rest)],
  })
}

// --- Branch detection & epilogue helpers (internal) ---

/** True if instruction is an option targeting advanceScene (i.e. output of branch()) */
function isBranchOption(instr: Instruction): boolean {
  const [name, params] = instr
  if (name !== 'option') return false
  const script = (params as { script?: string }).script
  return script === 'global:advanceScene' || script === 'advanceScene'
}

/** True if instruction is a branch or a gated branch (when wrapping a single branch) */
function isBranchLike(instr: Instruction): boolean {
  if (isBranchOption(instr)) return true
  const [name, params] = instr
  if (name === 'when') {
    const thenInstrs = (params as { then?: Instruction[] }).then
    return !!thenInstrs && thenInstrs.length === 1 && isBranchOption(thenInstrs[0])
  }
  return false
}

/** Append epilogue to the last page of a branch option's push array */
function appendEpilogueToBranch(instr: Instruction, epilogue: Instruction[]): Instruction {
  const [name, params] = instr
  const p = params as { label: string; script: string; params: { push: Instruction[] } }
  const push = p.params?.push ?? []

  const newPush = push.length === 0
    ? [seq(...epilogue)]
    : push.map((page, i) =>
      i === push.length - 1 ? seq(page, ...epilogue) : page
    )

  return [name, { ...params, params: { ...p.params, push: newPush } }]
}

/** Append epilogue to a branch-like instruction (plain branch or gated branch) */
function appendEpilogue(instr: Instruction, epilogue: Instruction[]): Instruction {
  if (isBranchOption(instr)) {
    return appendEpilogueToBranch(instr, epilogue)
  }
  // gatedBranch pattern: when(condition, branch(...))
  const [name, params] = instr
  const p = params as { condition: Instruction; then: Instruction[] }
  return [name, { ...p, then: [appendEpilogueToBranch(p.then[0], epilogue)] }]
}

/**
 * Group branches with an optional shared epilogue.
 *
 * Arguments are a mix of `branch()` / `gatedBranch()` results and plain
 * SceneElements. Branches become player options; non-branch elements
 * form the shared epilogue, merged into the **last page** of each branch
 * (no extra Continue click).
 *
 * Convention: list branches first, then epilogue elements.
 *
 * @example
 * choice(
 *   branch('Kiss him', 'You kiss.', say('Wow.')),
 *   branch('Not tonight', 'You decline gracefully.'),
 *   addNpcStat('affection', 5, { npc: 'tour-guide', hidden: true, max: 55 }),
 *   endDate(),
 * )
 */
export function choice(...args: SceneElement[]): Instruction {
  const branches: Instruction[] = []
  const epilogue: Instruction[] = []

  for (const arg of args) {
    const instr = toInstruction(arg)
    if (isBranchLike(instr)) {
      branches.push(instr)
    } else {
      epilogue.push(instr)
    }
  }

  if (epilogue.length === 0) {
    return seq(...branches)
  }

  return seq(...branches.map(b => appendEpilogue(b, epilogue)))
}

/**
 * A branch that only appears when a condition is met.
 * Compiles to `when(condition, branch(label, ...))`.
 *
 * Works inside `choice()` — the epilogue will be merged through the gate.
 *
 * @example
 * choice(
 *   gatedBranch(npcStat('affection', { min: 35 }),
 *     'Go to the hidden garden', ...gardenPath()),
 *   branch('Walk to the pier', ...pierPath()),
 *   endDate(),
 * )
 */
export function gatedBranch(
  condition: Instruction, label: string, ...rest: SceneElement[]
): Instruction {
  return when(condition, branch(label, ...rest))
}

/**
 * Perform a skill test. Can be used as:
 * - Predicate: skillCheck('Flirtation', 10) - returns boolean
 * - With callbacks: skillCheck('Charm', 12, seq('You charm them.', say('Wow!')), seq('You fumble.'))
 *
 * Use seq() to group multiple instructions into a single callback.
 */
export const skillCheck = (
  skill: string,
  difficulty = 0,
  onSuccess?: SceneElement,
  onFailure?: SceneElement
): Instruction =>
  run('skillCheck', {
    skill, difficulty,
    onSuccess: onSuccess != null ? toInstruction(onSuccess) : undefined,
    onFailure: onFailure != null ? toInstruction(onFailure) : undefined,
  })

// --- Game Actions ---

/** Add item to inventory */
export const addItem = (item: string, number = 1): Instruction =>
  run('gainItem', { item, number })

/** Remove item from inventory */
export const removeItem = (item: string, number = 1): Instruction =>
  run('loseItem', { item, number })

/** Move player to location (instant teleport). Optionally advance time after moving. */
export const move = (location: string, minutes?: number): Instruction =>
  run('move', { location, minutes })

/** Move player to location and advance time (combines move + timeLapse) */
export const go = (location: string, minutes?: number): Instruction =>
  run('go', { location, minutes })

/** Advance game time */
export const timeLapse = (minutes: number): Instruction =>
  run('timeLapse', { minutes })

/** Set the current scene's NPC (for dialogue scenes with a specific character) */
export const setNpc = (npc: string): Instruction =>
  run('setNpc', { npc })

/** Hide the NPC image in the current scene (e.g., when showing location scenery) */
export const hideNpcImage = (): Instruction =>
  run('hideNpcImage', {})

/** Show the NPC image in the current scene */
export const showNpcImage = (): Instruction =>
  run('showNpcImage', {})

/** Mark the current scene NPC's name as known to the player */
export const learnNpcName = (): Instruction =>
  run('learnNpcName', {})

/** Add to a player stat */
export const addStat = (
  stat: string,
  change: number,
  options?: { max?: number; min?: number; chance?: number; hidden?: boolean }
): Instruction =>
  run('addStat', { stat, change, ...options })

/** Add a quest card */
export const addQuest = (questId: string, args?: object): Instruction =>
  run('addQuest', { questId, args })

/** Complete a quest card */
export const completeQuest = (questId: string): Instruction =>
  run('completeQuest', { questId })

/** Add an effect card */
export const addEffect = (effectId: string, args?: object): Instruction =>
  run('addEffect', { effectId, args })

/** Record the current game time to a named timer */
export const recordTime = (timer: string): Instruction =>
  run('recordTime', { timer })

/** Eat food. Sets lastEat timer and removes hunger based on quantity. */
export const eatFood = (quantity: number): Instruction =>
  run('eatFood', { quantity })

/** Discover a location (sets discovered flag, optionally with announcement text) */
export const discoverLocation = (location: string, text?: string, colour?: string): Instruction =>
  run('discoverLocation', { location, text, colour })

/** Advance time until a specific hour of day (e.g., 10.25 for 10:15am) */
export const timeLapseUntil = (untilTime: number): Instruction =>
  run('timeLapse', { untilTime })

/** Modify an NPC stat (e.g. affection). Uses scene NPC if npc omitted from options. */
export const addNpcStat = (
  stat: string, change: number,
  options?: { npc?: string; hidden?: boolean; max?: number; min?: number }
): Instruction => {
  return run('addNpcStat', { stat, change, ...(options ?? {}) })
}

/** Move an NPC to a location (or null to clear). Uses scene NPC if npc omitted. */
export const moveNpc = (npc: string, location: string | null): Instruction =>
  run('setNpcLocation', { npc, location })

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

/** Check NPC stat value. Defaults to stat > 0 if no min/max specified. Uses scene NPC if npc omitted. */
export const npcStat = (stat: string, options?: { npc?: string; min?: number; max?: number }): Instruction =>
  run('npcStat', { stat, ...(options ?? {}) })

/** Check if player has a card */
export const hasCard = (cardId: string): Instruction =>
  run('hasCard', { cardId })

/** Check if a card is completed */
export const cardCompleted = (cardId: string): Instruction =>
  run('cardCompleted', { cardId })

/** Check if a location has been discovered */
export const locationDiscovered = (location: string): Instruction =>
  run('locationDiscovered', { location })

/** Check if the current hour is within a range (supports wrap-around, e.g. hourBetween(22, 6) for night) */
export const hourBetween = (from: number, to: number): Instruction =>
  run('hourBetween', { from, to })

/** Check if at least `minutes` have elapsed since a recorded timer */
export const timeElapsed = (timer: string, minutes: number): Instruction =>
  run('timeElapsed', { timer, minutes })

/** True when debug mode is enabled */
export const debug = (): Instruction =>
  run('debug', {})

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

/** Register a script that executes a sequence of DSL instructions */
export function registerDslScript(name: string, instructions: SceneElement[]): void {
  makeScripts({
    [name]: (game: Game) => game.run(seq(...instructions))
  })
}

/**
 * Convert a sequence of DSL instructions into a ScriptFn.
 * This is the bridge between declarative DSL and imperative script entry points
 * (activity scripts, makeScripts, etc.).
 *
 * With a single instruction, executes it directly.
 * With multiple instructions, executes them in sequence (like seq).
 *
 * @example
 * // Activity script
 * { script: script(timeLapse(10), random(text('A'), text('B'))) }
 *
 * // In makeScripts
 * makeScripts({
 *   myImperativeScript: (g) => { g.add('Hello') },
 *   myDslScript: script(text('Welcome'), option('Start'))
 * })
 */
export const script = (...instructions: SceneElement[]): ((game: Game) => void) =>
  (game: Game) => game.run(seq(...instructions))
