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
 * Add an option button to the scene.
 *
 * Content is pushed as a stack frame when clicked; when the content
 * exhausts, control returns to the parent context (e.g. back to a menu).
 * Use `exit()` inside content to break out of the current context.
 *
 * Script calls use `run()`:
 *   option('Buy a Drink', run('npc:buyDrink'))
 *   option('Leave', exit(run('npc:farewell')))
 *
 * Inline content:
 *   option('Kiss him', text('You kiss.'), addNpcStat('affection', 5))
 *
 * @param label - Button label shown to player
 * @param content - SceneElements to execute when clicked
 */
export function option(label: string, ...content: SceneElement[]): Instruction {
  return run('option', { label, content: content.map(toInstruction) })
}

/** Standard NPC conversation leave option — includes exit() to end the conversation. */
export const npcLeaveOption = (text?: string, reply?: string, label = 'Leave'): Instruction =>
  option(label, run('endConversation', { text, reply }), exit())

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

/**
 * Pick one entry at random and execute it.
 *
 * Supports conditional entries via `when()` — only entries whose condition
 * passes are eligible. Non-`when` children are always in the pool.
 * Falsy entries (null, undefined, false, 0) are silently ignored, enabling
 * `&&` patterns for static filtering.
 *
 * ```typescript
 * random(
 *   when(hasReputation('gangster', { min: 40 }), 'People step aside as you pass.'),
 *   when(hasReputation('socialite', { min: 30 }), 'A woman in furs gives you a knowing nod.'),
 *   npc.affection > 10 && 'He gives you a warm smile.',
 *   'The street is quiet.',
 *   'Nothing catches your eye.',
 * )
 * ```
 */
export const random = (...children: (SceneElement | null | undefined | false | 0)[]): Instruction =>
  run('random', { children: children.filter((c): c is SceneElement => !!c).map(toInstruction) })

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
  return seq(first, run('pushPages', { pages: rest }))
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
 * Push a sub-scene that **replaces** the current content and options.
 * Use for interrupts where an NPC initiates something mid-scene and
 * the player must respond before the outer scene continues.
 *
 * Example:
 *   replaceScene(
 *     'He reaches for your hand...',
 *     say('May I?'),
 *     option('Let him', 'npc:allowScript'),
 *     option('Stop him', 'npc:resistScript'),
 *   )
 */
export const replaceScene = (...elements: SceneElement[]): Instruction =>
  run('replaceScene', { pages: [seq(...elements)] })

/**
 * @deprecated Use option() instead — option now pushes content onto the stack
 * and returns to the parent context by default.
 */
export const branch = option

/**
 * Clear the stack and optionally run content. Place inside a branch/option
 * to break out of a menu loop or end a scene sequence.
 *
 * @example
 * branch('Leave', say('Goodnight.'), exit(move('hotel')))
 * branch('Stop chatting', say('You excuse yourself.'), exit())
 */
export function exit(...rest: SceneElement[]): Instruction {
  return run('exitScene', { then: rest.map(toInstruction) })
}

/**
 * A repeatable choice menu. All branch options loop back automatically.
 * Use `exit()` inside a branch's content to break out of the loop.
 *
 * Accepts `branch()` and `when(condition, branch(...))`.
 * Conditions are re-evaluated each time the menu is shown.
 *
 * @example
 * menu(
 *   when(hasStat('Flirtation', 20),
 *     branch('Kiss him', 'You kiss.', addStat('Arousal', 5)),
 *   ),
 *   branch('Have a drink', 'He pours you a drink.'),
 *   branch('Chat', 'You talk for a while.'),
 *   branch('Leave', 'You say goodnight.', exit(move('hotel'))),
 * )
 */
export function menu(...args: SceneElement[]): Instruction {
  return run('menu', { items: args.map(toInstruction) })
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

/** Wear an item the player already has in inventory */
export const wearItem = (item: string): Instruction =>
  run('wearItem', { item })

/** Unwear all clothing (respects locks unless force is true) */
export const stripAll = (force = false): Instruction =>
  run('stripAll', { force })

/** Strip all clothing and wear a list of items */
export const changeOutfit = (items: string[], force = false): Instruction =>
  run('changeOutfit', { items, force })

/** Save the current outfit under a name (for later restoration with wearOutfit) */
export const saveOutfit = (name: string): Instruction =>
  run('saveOutfit', { name })

/** Restore a previously saved outfit by name. If delete is true, removes the saved outfit afterwards. */
export const wearOutfit = (name: string, opts?: { delete?: boolean }): Instruction =>
  run('wearOutfit', { name, ...opts })

/** Move player to location (instant teleport). Optionally advance time after moving. */
export const move = (location: string, minutes?: number): Instruction =>
  run('move', { location, minutes })

/** Move player to location and advance time (combines move + timeLapse) */
export const go = (location: string, minutes?: number): Instruction =>
  run('go', { location, minutes })

/** Advance game time */
export const time = (minutes: number): Instruction =>
  run('timeLapse', { minutes })

/** Interruptible wait at the current location. NPC hooks may create a scene to interrupt. */
export const wait = (minutes: number): Instruction =>
  run('wait', { minutes })

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

/** Add a trait card */
export const addTrait = (traitId: string, args?: object): Instruction =>
  run('addTrait', { traitId, args })

/** Apply socialise trait effects for the given duration */
export const socialise = (minutes: number): Instruction =>
  run('socialise', { minutes })

/** Sleep together with an NPC. Wakes at 7am for a morning scene. */
export const sleepTogether = (quality?: number): Instruction =>
  run('sleepTogether', { quality })

/** Standard intimacy effects: increments madeLove, records lastIntimacy, caps Arousal at 30. */
export const madeLove = (npc?: string): Instruction =>
  run('madeLove', { npc })

/** Record the current game time to a named timer */
export const recordTime = (timer: string): Instruction =>
  run('recordTime', { timer })

/** Apply a kiss — adds intensity to Arousal (capped at 50). 2 = peck, 5 = normal, 10 = intense. */
export const kiss = (intensity: number, max?: number): Instruction =>
  run('kiss', { intensity, ...(max !== undefined && { max }) })

/** Eat food. Sets lastEat timer and removes hunger based on quantity. */
export const eatFood = (quantity: number): Instruction =>
  run('eatFood', { quantity })

/**
 * Sleep to restore energy.
 * @param options.alarm - Force wakeup at a specific hour (0-24, e.g., 7 for 7am)
 * @param options.max - Maximum sleep duration in minutes (for naps)
 * @param options.min - Minimum sleep duration in minutes
 * @param options.quality - Quality modifier (1.0 = default, higher = more restorative)
 */
export const sleep = (options?: {
  alarm?: number
  max?: number
  min?: number
  quality?: number
}): Instruction =>
  run('sleep', options ?? {})

/** Discover a location (sets discovered flag, optionally with announcement text) */
export const discoverLocation = (location: string, text?: string, colour?: string): Instruction =>
  run('discoverLocation', { location, text, colour })

/** Advance time until a specific hour of day (e.g., 10.25 for 10:15am) */
export const timeUntil = (untilTime: number): Instruction =>
  run('timeLapse', { untilTime })

/** Conditional lesson segment. Runs body if fewer than `minutes` have elapsed since lesson start.
 *  When skipped (time already past), produces no content and advanceScene auto-skips. */
export function lessonTime(minutes: number, ...content: SceneElement[]): Instruction {
  return run('lessonTime', { minutes, body: content.map(toInstruction) })
}

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

/** Modify a faction reputation score (0-100). Shows coloured feedback unless hidden. */
export const addReputation = (
  reputation: string, change: number,
  options?: { hidden?: boolean; max?: number; min?: number; chance?: number }
): Instruction =>
  run('addReputation', { reputation, change, ...(options ?? {}) })

// --- Predicates (return boolean) ---

/** Check if player has item */
export const hasItem = (item: string, count = 1): Instruction =>
  run('hasItem', { item, count })

/** Player stat: returns value if no range, boolean if min/max specified. */
export const stat = (stat: string, min?: number, max?: number): Instruction =>
  run('stat', { stat, min, max })

/** Check if player is at location */
export const inLocation = (location: string): Instruction =>
  run('inLocation', { location })

/** Check if player is in a bedroom (any location with isBedroom flag) */
export const inBedroom = (): Instruction =>
  run('inBedroom', {})

/** Check if player is in a private location (bedroom, bathroom, etc.) */
export const inPrivate = (): Instruction =>
  run('inPrivate', {})

/** True if a body position is exposed (nothing worn at under, inner, or outer layers). */
export const exposed = (position: string): Instruction =>
  run('exposed', { position })

/** Check if currently in a scene (has options) */
export const inScene = (): Instruction =>
  run('inScene', {})

/** True when the current scene already has content. Use with unless() to skip flavour text when other hooks have already added output. */
export const hasContent = (): Instruction =>
  run('hasContent', {})

/** Check NPC stat value. Defaults to stat > 0 if no min/max specified. Uses scene NPC if npc omitted. */
export const npcStat = (stat: string, options?: { npc?: string; min?: number; max?: number }): Instruction =>
  run('npcStat', { stat, ...(options ?? {}) })

/** Computed impression score (0-100): returns value if no range, boolean if min/max specified. Uses scene NPC if npc omitted. */
export const impression = (name: string, options?: { npc?: string; min?: number; max?: number }): Instruction =>
  run('impression', { impression: name, ...(options ?? {}) })

/** Faction reputation: returns value if no range, boolean if min/max specified. */
export const reputation = (reputation: string, options?: { min?: number; max?: number }): Instruction =>
  run('reputation', { reputation, ...(options ?? {}) })

/** Check if player has a card */
export const hasCard = (cardId: string): Instruction =>
  run('hasCard', { cardId })

/** Check if player has a relationship with an NPC. Uses scene NPC if npc omitted. */
export const hasRelationship = (relationship?: string, npc?: string): Instruction =>
  run('hasRelationship', { relationship, npc })

/** Set a relationship with an NPC. Uses scene NPC if npc omitted. */
export const setRelationship = (relationship: string, npc?: string): Instruction =>
  run('setRelationship', { relationship, npc })

/** Check if a card is completed */
export const cardCompleted = (cardId: string): Instruction =>
  run('cardCompleted', { cardId })

/** Check if a location has been discovered */
export const locationDiscovered = (location: string): Instruction =>
  run('locationDiscovered', { location })

/** Check that no NPCs are present at the current location */
export const nobodyPresent = (): Instruction =>
  run('nobodyPresent', {})

/** Move the player to a destination immediately (no time cost). Used for ejecting from locations. */
export const ejectPlayer = (location: string): Instruction =>
  run('ejectPlayer', { location })

/** True if the player is indecently dressed in a public place (decency below level, not in a private location). Default level 40. */
export const indecent = (level?: number): Instruction =>
  run('indecent', { ...(level !== undefined ? { level } : {}) })

/** Check if the current day is a weekday (Mon-Fri) */
export const isWeekday = (): Instruction =>
  run('isWeekday', {})

/** Check if the current hour is within a range (supports wrap-around, e.g. hourBetween(22, 6) for night) */
export const hourBetween = (from: number, to: number): Instruction =>
  run('hourBetween', { from, to })

/** Check if at least `minutes` have elapsed since a recorded timer */
export const timeElapsed = (timer: string, minutes: number): Instruction =>
  run('timeElapsed', { timer, minutes })

/** True when debug mode is enabled */
export const debug = (): Instruction =>
  run('debug', {})

/** True when steamy content is enabled in game settings */
export const steamy = (): Instruction =>
  run('steamy', {})

/** True with the given probability (0-1). Evaluated at runtime. */
export const chance = (probability: number): Instruction =>
  run('chance', { probability })

// ── Comparison predicates ─────────────────────────────────────────────────
// Use npcStat/hasStat/hasReputation with no min/max to get raw values for comparisons.
// e.g. gt(npcStat('lust'), npcStat('affection'))

/**  True when a > b. a and b are value-returning instructions (e.g. npcStat, hasStat). */
export const gt = (a: Instruction, b: Instruction): Instruction =>
  run('compare', { a, b, op: '>' })

/** True when a < b. */
export const lt = (a: Instruction, b: Instruction): Instruction =>
  run('compare', { a, b, op: '<' })

/** True when a >= b. */
export const gte = (a: Instruction, b: Instruction): Instruction =>
  run('compare', { a, b, op: '>=' })

/** True when a <= b. */
export const lte = (a: Instruction, b: Instruction): Instruction =>
  run('compare', { a, b, op: '<=' })

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
 * { script: script(time(10), random(text('A'), text('B'))) }
 *
 * // In makeScripts
 * makeScripts({
 *   myImperativeScript: (g) => { g.add('Hello') },
 *   myDslScript: script(text('Welcome'), option('Start'))
 * })
 */
export const script = (...instructions: SceneElement[]): ((game: Game) => void) =>
  (game: Game) => game.run(seq(...instructions))
