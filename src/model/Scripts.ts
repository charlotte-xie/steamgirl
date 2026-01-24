/**
 * Script Registry and Core Scripts
 *
 * This module provides:
 * 1. The script registry - where all scripts are registered and looked up
 * 2. Core scripts - generic, reusable scripts that are part of the scripting system itself
 *
 * Core scripts are:
 * - Game actions: timeLapse, move, gainItem, loseItem, addStat, calcStats
 * - Control flow: seq, when, cond
 * - Predicates: hasItem, hasStat, inLocation, inScene, hasCard, cardCompleted, npcStat, not, and, or
 * - Content: text, paragraph, say, option, npcLeaveOption
 * - Cards: addQuest, completeQuest, addEffect
 *
 * Story-specific scripts (that depend on game world content) belong in story/Utility.ts
 */

import { Game} from './Game'
import { type InlineContent } from './Format'
import { speech, p, highlight, colour } from './Format'
import { type StatName, type MeterName, MAIN_STAT_INFO, SKILL_INFO, METER_INFO } from './Stats'
import { type TimerName } from './Player'
import { capitalise } from './Text'
import { getLocation } from './Location'
import { getItem } from './Item'

// ============================================================================
// SCRIPT TYPES
// ============================================================================

/** A script function - the imperative form */
export type ScriptFn = (game: Game, params: Record<string, unknown>) => unknown

/** An instruction is a script call: [scriptName, params] tuple - the declarative form */
export type Instruction = [string, Record<string, unknown>]

/**
 * A Script can be any of:
 * - ScriptFn: A function (imperative) - (game, params) => result
 * - Instruction: A tuple [scriptName, params] (declarative) - use seq() for multiple
 * - string: A registered script name
 */
export type Script = ScriptFn | Instruction | string

/** Check if a value is a ScriptFn (function) */
export function isScriptFn(value: unknown): value is ScriptFn {
  return typeof value === 'function'
}

/** Check if a value is an Instruction tuple */
export function isInstruction(value: unknown): value is Instruction {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string'
}

// ============================================================================
// SCRIPT REGISTRY
// ============================================================================

const SCRIPTS: Record<string, ScriptFn> = {}

export function makeScript(name: string, script: ScriptFn): void {
  if (name in SCRIPTS) {
    throw new Error(`Duplicate script name: ${name}`)
  }
  SCRIPTS[name] = script
}

export function makeScripts(scripts: Record<string, ScriptFn>): void {
  for (const [name, script] of Object.entries(scripts)) {
    makeScript(name, script)
  }
}

export function getScript(name: string): ScriptFn | undefined {
  return SCRIPTS[name]
}

export function getAllScripts(): Record<string, ScriptFn> {
  return { ...SCRIPTS }
}

/** @deprecated Use Script type instead */
export type ScriptRef = string | Instruction

// ============================================================================
// CORE SCRIPTS - Generic scripts that are part of the scripting system
// ============================================================================

/** Execute an instruction and return its result */
function exec(game: Game, instruction: Instruction): unknown {
  const [scriptName, params] = instruction
  return game.run(scriptName, params)
}

/** Execute a sequence of instructions */
function execAll(game: Game, instructions: Instruction[]): void {
  for (const instr of instructions) {
    exec(game, instr)
  }
}

/** Resolve an array of parts (strings or Instructions) into resolved content */
function resolveParts(game: Game, parts: (string | Instruction)[]): (string | InlineContent)[] {
  const result: (string | InlineContent)[] = []
  for (const part of parts) {
    if (typeof part === 'string') {
      result.push(part)
    } else if (isInstruction(part)) {
      const resolved = exec(game, part)
      // If the instruction returned InlineContent, add it
      if (resolved && typeof resolved === 'object' && 'type' in resolved) {
        result.push(resolved as InlineContent)
      }
    }
  }
  return result
}

const coreScripts: Record<string, ScriptFn> = {
  // -------------------------------------------------------------------------
  // GAME ACTIONS
  // -------------------------------------------------------------------------

  /** Advance the game's time by a given number of seconds/minutes */
  timeLapse: (game: Game, params: { seconds?: number, minutes?: number, untilTime?: number } = {}) => {
    let seconds = params.seconds ?? 0
    let minutes = params.minutes ?? 0

    // If untilTime is provided (as hour of day, e.g., 10 or 10.25 for 10:15am)
    if (params.untilTime !== undefined) {
      if (typeof params.untilTime !== 'number') {
        throw new Error('timeLapse untilTime must be a number (hour of day, e.g., 10 or 10.25)')
      }

      const targetHour = params.untilTime
      const currentHour = game.hourOfDay

      // Only advance if target is in the future on the same day
      if (currentHour < targetHour) {
        const hoursDifference = targetHour - currentHour
        seconds = Math.floor(hoursDifference * 3600)
        minutes = 0
      } else {
        seconds = 0
        minutes = 0
      }
    }

    if (typeof seconds !== 'number' || seconds < 0) {
      throw new Error('timeLapse requires a non-negative number of seconds')
    }
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('timeLapse requires a non-negative number of minutes')
    }

    const totalSeconds = seconds + (minutes * 60)
    const hourBefore = Math.floor(game.hourOfDay)

    if (totalSeconds > 0) {
      game.time += totalSeconds
    }

    const hourAfter = Math.floor(game.hourOfDay)
    const hourChanged = hourBefore !== hourAfter

    // Call onTime for all player cards
    if (totalSeconds > 0) {
      const cards = [...game.player.cards]
      for (const card of cards) {
        const cardDef = card.template
        if (cardDef.onTime && typeof cardDef.onTime === 'function') {
          cardDef.onTime(game, card, totalSeconds)
        }
      }
    }

    // If hour changed, call onMove for all NPCs
    if (hourChanged) {
      game.npcs.forEach((npc) => {
        game.run(npc.template.onMove)
      })
      game.updateNPCsPresent()
    }
  },

  /** Unconditionally move the player to a location (instant teleport) */
  move: (game: Game, params: { location?: string } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('move script requires a location parameter')
    }
    game.getLocation(locationId)
    game.moveToLocation(locationId)
  },

  /** Add an item to the player's inventory */
  gainItem: (game: Game, params: { text?: string; item?: string; number?: number } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('gainItem script requires an item parameter')
    }

    const number = params.number ?? 1
    if (typeof number !== 'number' || number < 0) {
      throw new Error('gainItem script requires a non-negative number')
    }

    if (params.text) {
      game.add({ type: 'text', text: params.text, color: '#ffeb3b' })
    }

    game.player.addItem(itemId, number)
    game.player.calcStats()
  },

  /** Remove an item from the player's inventory */
  loseItem: (game: Game, params: { item?: string; number?: number } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('loseItem script requires an item parameter')
    }

    const number = params.number ?? 1
    if (typeof number !== 'number' || number < 0) {
      throw new Error('loseItem script requires a non-negative number')
    }

    game.player.removeItem(itemId, number)
    game.player.calcStats()
  },

  /** Modify a base stat with optional display text and color */
  addStat: (game: Game, params: {
    stat?: StatName
    change?: number
    min?: number
    max?: number
    colour?: string
    text?: string
    chance?: number
    hidden?: boolean
  }) => {
    const statName = params.stat
    if (!statName || typeof statName !== 'string') {
      throw new Error('addStat script requires a stat parameter')
    }
    if (!(statName in MAIN_STAT_INFO || statName in SKILL_INFO || statName in METER_INFO)) {
      throw new Error(`addStat: unknown stat '${statName}'`)
    }

    const change = params.change
    if (typeof change !== 'number') {
      throw new Error('addStat script requires a change parameter')
    }

    const chance = params.chance ?? 1.0
    if (typeof chance !== 'number' || chance < 0 || chance > 1) {
      throw new Error('addStat chance must be a number between 0 and 1')
    }

    if (Math.random() > chance) {
      return
    }

    const currentValue = game.player.basestats.get(statName as StatName) || 0
    let newValue = currentValue + change

    const min = params.min ?? 0
    const max = params.max ?? 100
    newValue = Math.max(min, Math.min(max, newValue))
    const actualChange = newValue - currentValue

    if ((actualChange == 0) || (Math.sign(actualChange) != Math.sign(change))) {
      return
    }

    game.player.basestats.set(statName as StatName, newValue)
    game.player.calcStats()

    if (!params.hidden) {
      let displayColor: string
      if (params.colour) {
        displayColor = params.colour
      } else {
        const meterInfo = METER_INFO[statName as MeterName]
        if (meterInfo) {
          displayColor = change > 0 ? meterInfo.gainColor : meterInfo.lossColor
        } else {
          displayColor = change > 0 ? '#10b981' : '#ef4444'
        }
      }

      let displayText: string
      if (params.text) {
        displayText = params.text
      } else {
        const sign = change > 0 ? '+' : ''
        displayText = `${capitalise(statName)} ${sign}${change}`
      }

      if (actualChange !== 0) {
        game.add(colour(displayText, displayColor))
      }
    }
  },

  /** Recalculate stats based on basestats and modifiers */
  calcStats: (game: Game) => {
    game.player.calcStats()
  },

  /** Record the current game time to a named timer */
  recordTime: (game: Game, params: { timer?: string }) => {
    if (!params.timer || typeof params.timer !== 'string') {
      throw new Error('recordTime requires a timer parameter (string name)')
    }
    game.player.timers.set(params.timer as TimerName, game.time)
  },

  // -------------------------------------------------------------------------
  // CONTROL FLOW
  // -------------------------------------------------------------------------

  /** Execute a sequence of instructions */
  seq: (game: Game, params: { instructions?: Instruction[] }) => {
    if (!params.instructions) return
    execAll(game, params.instructions)
  },

  /** Conditional execution - runs instructions if condition is truthy */
  when: (game: Game, params: { condition?: Instruction; then?: Instruction[] }) => {
    if (!params.condition || !params.then) return
    const result = exec(game, params.condition)
    if (result) {
      execAll(game, params.then)
    }
  },

  /** Multi-branch conditional */
  cond: (game: Game, params: { branches?: { condition: Instruction; then: Instruction }[]; default?: Instruction }) => {
    if (!params.branches) return

    for (const branch of params.branches) {
      const result = exec(game, branch.condition)
      if (result) {
        exec(game, branch.then)
        return
      }
    }

    if (params.default) {
      exec(game, params.default)
    }
  },

  /** Execute a random child instruction from the provided array */
  random: (game: Game, params: { children?: Instruction[] }) => {
    if (!params.children || params.children.length === 0) return
    const index = Math.floor(Math.random() * params.children.length)
    return exec(game, params.children[index])
  },

  /** Perform a skill test. Returns boolean if no callbacks provided, otherwise executes callbacks. */
  skillCheck: (game: Game, params: {
    skill?: string
    difficulty?: number
    onSuccess?: Instruction[]
    onFailure?: Instruction[]
  }): boolean | void => {
    if (!params.skill) return false
    const difficulty = params.difficulty ?? 0
    const success = game.player.skillTest(params.skill as StatName, difficulty)

    // If no callbacks, return boolean (predicate mode)
    if (!params.onSuccess && !params.onFailure) {
      return success
    }

    // Execute appropriate callback
    if (success && params.onSuccess) {
      execAll(game, params.onSuccess)
    } else if (!success && params.onFailure) {
      execAll(game, params.onFailure)
    }

    return success
  },

  // -------------------------------------------------------------------------
  // PREDICATES (return boolean)
  // -------------------------------------------------------------------------

  /** Check if player has item */
  hasItem: (game: Game, params: { item?: string; count?: number }): boolean => {
    if (!params.item) return false
    return game.player.inventory.some(
      i => i.id === params.item && i.number >= (params.count ?? 1)
    )
  },

  /** Check player stat value */
  hasStat: (game: Game, params: { stat?: string; min?: number; max?: number }): boolean => {
    if (!params.stat) return false
    const value = game.player.stats.get(params.stat as StatName) ?? 0
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  /** Check if player is at location */
  inLocation: (game: Game, params: { location?: string }): boolean => {
    return game.currentLocation === params.location
  },

  /** Check if currently in a scene (has options) */
  inScene: (game: Game): boolean => {
    return game.inScene
  },

  /** Check NPC stat value */
  npcStat: (game: Game, params: { npc?: string; stat?: string; min?: number; max?: number }): boolean => {
    if (!params.npc || !params.stat) return false
    const npc = game.npcs.get(params.npc)
    if (!npc) return false
    const value = npc.stats.get(params.stat) ?? 0
    if (params.min !== undefined && value < params.min) return false
    if (params.max !== undefined && value > params.max) return false
    return true
  },

  /** Check if player has a card */
  hasCard: (game: Game, params: { cardId?: string }): boolean => {
    if (!params.cardId) return false
    return game.player.cards.some(c => c.id === params.cardId)
  },

  /** Check if a card is completed */
  cardCompleted: (game: Game, params: { cardId?: string }): boolean => {
    if (!params.cardId) return false
    const card = game.player.cards.find(c => c.id === params.cardId)
    return card?.completed === true
  },

  /** Negate a predicate */
  not: (game: Game, params: { predicate?: Instruction }): boolean => {
    if (!params.predicate) return true
    return !exec(game, params.predicate)
  },

  /** All predicates must be true */
  and: (game: Game, params: { predicates?: Instruction[] }): boolean => {
    if (!params.predicates) return true
    return params.predicates.every(p => exec(game, p))
  },

  /** Any predicate must be true */
  or: (game: Game, params: { predicates?: Instruction[] }): boolean => {
    if (!params.predicates) return false
    return params.predicates.some(p => exec(game, p))
  },

  /** Check if at least `minutes` have elapsed since a recorded timer */
  timeElapsed: (game: Game, params: { timer?: string; minutes?: number }): boolean => {
    if (!params.timer || typeof params.timer !== 'string') {
      throw new Error('timeElapsed requires a timer parameter (string name)')
    }
    if (params.minutes === undefined || typeof params.minutes !== 'number') {
      throw new Error('timeElapsed requires a minutes parameter (number)')
    }
    const recorded = game.player.timers.get(params.timer as TimerName)
    if (recorded === undefined) return true // No record means "long enough ago"
    const elapsed = game.time - recorded
    const required = params.minutes * 60 // Convert minutes to seconds
    return elapsed >= required
  },

  // -------------------------------------------------------------------------
  // CONTENT (add to scene)
  // -------------------------------------------------------------------------

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
   * Add an option button to the scene.
   *
   * Script resolution with namespace prefixes:
   * - 'npc:scriptName' - explicitly call NPC script via interact
   * - 'global:scriptName' - explicitly call global script
   * - 'scriptName' (no prefix) - context-aware:
   *   - If in NPC scene and NPC has this script, calls it via interact
   *   - Otherwise uses global script
   *
   * If script is omitted, derives it from label (lowercase, non-alphanumeric removed).
   */
  option: (game: Game, params: { label?: string; script?: string; params?: object }) => {
    const label = params.label
    if (!label) return

    // Derive script name from label if not provided
    const rawScript = params.script ?? label.toLowerCase().replace(/[^a-z0-9]/g, '')
    const scriptParams = params.params ?? {}

    // Parse namespace prefix
    let namespace: 'npc' | 'global' | 'auto' = 'auto'
    let scriptName = rawScript

    if (rawScript.startsWith('npc:')) {
      namespace = 'npc'
      scriptName = rawScript.slice(4)
    } else if (rawScript.startsWith('global:')) {
      namespace = 'global'
      scriptName = rawScript.slice(7)
    }

    // Resolve the script based on namespace and context
    if (namespace === 'npc') {
      // Explicit NPC script
      game.addOption('interact', { script: scriptName, params: scriptParams }, label)
    } else if (namespace === 'global') {
      // Explicit global script
      game.addOption(scriptName, scriptParams, label)
    } else {
      // Auto: check NPC context first
      const npcId = game.scene.npc
      if (npcId) {
        const npc = game.getNPC(npcId)
        if (npc.template.scripts?.[scriptName]) {
          // NPC has this script - use interact
          game.addOption('interact', { script: scriptName, params: scriptParams }, label)
          return
        }
      }
      // Fall back to global script
      game.addOption(scriptName, scriptParams, label)
    }
  },

  /** Standard NPC conversation leave option */
  npcLeaveOption: (game: Game, params: { text?: string; reply?: string; label?: string }) => {
    game.addOption('endConversation', { text: params.text, reply: params.reply }, params.label ?? 'Leave')
  },

  // -------------------------------------------------------------------------
  // CARDS
  // -------------------------------------------------------------------------

  /** Add a quest card */
  addQuest: (game: Game, params: { questId?: string; args?: Record<string, unknown> }) => {
    if (!params.questId) return
    game.addQuest(params.questId, params.args ?? {})
  },

  /** Complete a quest card */
  completeQuest: (game: Game, params: { questId?: string }) => {
    if (!params.questId) return
    game.completeQuest(params.questId)
  },

  /** Add an effect card */
  addEffect: (game: Game, params: { effectId?: string; args?: Record<string, unknown> }) => {
    if (!params.effectId) return
    game.addEffect(params.effectId, params.args ?? {})
  },

  // -------------------------------------------------------------------------
  // PLAYER ACTIONS
  // -------------------------------------------------------------------------

  /** Conscious wait at current location: timeLapse, optional narrative, then optionally run another script if not in a scene. */
  wait: (game: Game, params: { minutes?: number; text?: string; then?: { script: string; params?: Record<string, unknown> } } = {}) => {
    const minutes = params.minutes ?? 15
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('wait script requires minutes (non-negative number)')
    }
    game.timeLapse(minutes)
    if (params.text) {
      game.add(params.text)
    }

    if (game.inScene) {
      return
    }

    const t = params.then
    if (t?.script) {
      game.run(t.script, t.params ?? {})
    }
  },

  /** Navigate to a given location (checks links, triggers arrival scripts, time lapse, etc.) */
  go: (game: Game, params: { location?: string; minutes?: number } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('go script requires a location parameter')
    }

    const locationFromRegistry = getLocation(locationId)
    if (!locationFromRegistry) {
      throw new Error(`Location not found: ${locationId}`)
    }

    const currentLocation = game.location
    const link = currentLocation.template.links?.find((l: { dest: string }) => l.dest === locationId)

    if (!link) {
      const locationName = locationFromRegistry.name || locationId
      game.add(`You can't see a way to ${locationName}.`)
      return
    }

    if (link.checkAccess) {
      const accessReason = link.checkAccess(game)
      if (accessReason) {
        game.add(accessReason)
        return
      }
    }

    if (link.onFollow) {
      game.run(link.onFollow)
      if (game.inScene) {
        return
      }
    }

    const gameLocation = game.getLocation(locationId)
    const isFirstVisit = gameLocation.numVisits === 0
    gameLocation.numVisits++

    const minutes = params.minutes !== undefined ? params.minutes : (link.time ?? 1)
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('go script minutes must be a non-negative number')
    }
    game.timeLapse(minutes)

    game.run('move', { location: locationId })

    gameLocation.discovered = true

    if (isFirstVisit && gameLocation.template.onFirstArrive) {
      game.run(gameLocation.template.onFirstArrive)
    }

    if (gameLocation.template.onArrive) {
      game.run(gameLocation.template.onArrive)
    }
  },

  /** Discover a location - sets discovered flag and optionally displays text */
  discoverLocation: (game: Game, params: {
    location?: string
    text?: string
    colour?: string
  } = {}) => {
    const locationId = params.location
    if (!locationId || typeof locationId !== 'string') {
      throw new Error('discoverLocation script requires a location parameter')
    }

    const gameLocation = game.getLocation(locationId)
    if (gameLocation.discovered) return

    gameLocation.discovered = true

    if (params.text) {
      const displayColor = params.colour || '#3b82f6'
      game.add(colour(params.text, displayColor))
    }
  },

  /** End the current NPC conversation with optional text */
  endConversation: (game: Game, params: { text?: string; reply?: string } = {}) => {
    const text = params.text ?? 'You politely end the conversation.'
    game.add(text)
    if (params.reply) {
      if (game.scene.npc) {
        const npc = game.npc
        npc.say(params.reply)
      } else {
        game.add(speech(params.reply, '#a8d4f0'))
      }
    }
  },

  /** End the current scene with optional text */
  endScene: (game: Game, params: { text?: string } = {}) => {
    if (params.text) {
      game.add(params.text)
    }
  },

  /** Run a named activity at the current location */
  runActivity: (game: Game, params: { activity?: string } = {}) => {
    const name = params.activity
    if (!name || typeof name !== 'string') {
      throw new Error('runActivity script requires an activity parameter (string name)')
    }
    const activities = game.location.template.activities || []
    const act = activities.find((a: { name: string }) => a.name === name)
    if (!act) {
      game.add('Activity not found.')
      return
    }
    game.run(act.script)
  },

  /** Run the current location's onRelax if defined; otherwise a generic message. */
  relaxAtLocation: (game: Game) => {
    const onRelax = game.location.template.onRelax
    if (onRelax) {
      game.run(onRelax)
    } else {
      game.add("There's nothing particularly relaxing to do here.")
    }
  },

  /** Examine an item (run its onExamine script) */
  examineItem: (game: Game, params: { item?: string } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('examineItem script requires an item parameter (string id)')
    }
    const def = getItem(itemId)
    if (!def?.onExamine) {
      game.add('Nothing happens.')
      return
    }
    game.run(def.onExamine)
  },

  /** Consume an item (run its onConsume script and remove from inventory) */
  consumeItem: (game: Game, params: { item?: string } = {}) => {
    const itemId = params.item
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('consumeItem script requires an item parameter (string id)')
    }
    const def = getItem(itemId)
    if (!def?.onConsume) {
      game.add('You cannot use that.')
      return
    }
    const has = game.player.inventory.some((i) => i.id === itemId && i.number >= 1)
    if (!has) {
      game.add("You don't have that item.")
      return
    }
    game.player.removeItem(itemId, 1)
    game.player.calcStats()
    game.run(def.onConsume)
  },

  /** Run a named script on an NPC */
  interact: (game: Game, params: { npc?: string; script?: string; params?: object } = {}) => {
    const npcId = params.npc ?? game.scene.npc
    const scriptName = params.script
    if (!npcId || typeof npcId !== 'string') {
      throw new Error('interact script requires an npc parameter (or an active NPC scene) and a script parameter')
    }
    if (!scriptName || typeof scriptName !== 'string') {
      throw new Error('interact script requires a script parameter (string name)')
    }
    const npc = game.getNPC(npcId)
    const script = npc.template.scripts?.[scriptName]
    if (!script) {
      throw new Error(`NPC ${npcId} has no script "${scriptName}"`)
    }
    game.timeLapse(1)
    game.run(script, (params.params ?? {}) as Record<string, unknown>)
  },

  /** Approach an NPC to talk to them */
  approach: (game: Game, params: { npc?: string } = {}) => {
    const npcId = params.npc
    if (!npcId || typeof npcId !== 'string') {
      throw new Error('approach script requires an npc parameter (string id)')
    }

    const npc = game.getNPC(npcId)
    npc.approachCount++

    const npcDef = npc.template

    game.scene.npc = npcId
    game.scene.hideNpcImage = false

    if (npcDef.onApproach) {
      game.run(npcDef.onApproach)
    } else {
      const displayName = npc.nameKnown > 0 && npcDef.name
        ? npcDef.name
        : (npcDef.uname || npcDef.description || npcDef.name || 'The NPC')
      game.add(`${displayName} isn't interested in talking to you.`)
    }
  },
}

// Register all core scripts
makeScripts(coreScripts)
