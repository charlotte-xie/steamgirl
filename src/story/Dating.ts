/**
 * Dating.ts — Generic date card mechanic
 *
 * Provides a reusable system for NPC dates. Each NPC registers a DatePlan
 * containing their meeting location, date script, and optional custom
 * scripts for greeting, cancellation, no-show, and completion.
 *
 * All behaviour scripts are of type Script (function | Instruction | string)
 * so they can be written in DSL, imperative code, or reference registered
 * scripts by name.
 *
 * Script builder helpers (standardGreeting, standardCancel, etc.) produce
 * sensible defaults from simple parameters. These are used as fallbacks
 * when a DatePlan doesn't supply custom scripts.
 *
 * NPC positioning during dates is handled automatically by the Date card's
 * afterUpdate hook — NPC onMove hooks do not need date-awareness. The
 * handleDateApproach helper simplifies onWait/onApproach hooks.
 *
 * Usage:
 *   1. Import { registerDatePlan } in your NPC file
 *   2. Call registerDatePlan({ npcId, dateScene, ... })
 *   3. Add a 'date' card via game.addCard('date', 'Date', { npc, meetTime, meetLocation })
 *
 * The card stores: npc (NPC ID), meetTime (unix seconds for 6pm),
 * meetLocation (location ID), dateStarted (boolean).
 */

import { Game } from '../model/Game'
import type { Card, CardDefinition, Reminder } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { makeScripts, makeScript, type Script } from '../model/Scripts'
import { type Instruction, run, seq, say, option } from '../model/ScriptDSL'
import type { ClothingLayer, ClothingPosition } from '../model/Item'
import type { Item } from '../model/Item'
import type { Player } from '../model/Player'

// ============================================================================
// DATE CARD DATA
// ============================================================================

/** The instance data stored on a date card. */
export interface DateCardData {
  npc: string
  meetTime: number
  meetLocation: string
  dateStarted: boolean
}

/** Type-safe accessor for date card properties. */
export function dateCardData(card: Card): DateCardData {
  return {
    npc: card.npc as string,
    meetTime: card.num('meetTime'),
    meetLocation: card.meetLocation as string,
    dateStarted: !!card.dateStarted,
  }
}

// ============================================================================
// DATE PLAN INTERFACE
// ============================================================================

/** A date plan defines the NPC-specific content for a date. */
export interface DatePlan {
  /** NPC ID (e.g. 'tour-guide') */
  npcId: string
  /** Display name of the NPC for reminders (e.g. 'Rob') */
  npcDisplayName: string
  /** Location ID where the date begins (e.g. 'default' for City Centre) */
  meetLocation: string
  /** Display name of meeting location for reminders */
  meetLocationName: string
  /** How long the NPC waits in minutes (default 120) */
  waitMinutes?: number

  /**
   * The date itself — any Script. Typically scenes(...) for a multi-step
   * sequence, but could be an NPC interact script, a function, etc.
   */
  dateScene: Script

  /**
   * Script run when the NPC greets the player at the meeting point.
   * Receives the game with scene.npc already set.
   * Should add options for accepting and cancelling the date.
   * Default: standardGreeting().
   */
  onGreeting?: Script

  /**
   * Script run when the player cancels the date at the meeting point.
   * Should handle affection penalty and card cleanup (or call dateCleanup).
   * Default: standardCancel(undefined, 20).
   */
  onCancel?: Script

  /**
   * Script run when the player doesn't show up within the wait window.
   * Should handle affection penalty and card cleanup (or call dateCleanup).
   * Default: standardNoShow(npcDisplayName, undefined, 15).
   */
  onNoShow?: Script

  /**
   * Script run when the date scene completes successfully.
   * Should handle affection bonus and card cleanup (or call dateCleanup).
   * Default: standardComplete(15).
   */
  onComplete?: Script
}

// ============================================================================
// DSL ACCESSORS — thin wrappers around registered scripts
// ============================================================================

/**
 * Standard date greeting. NPC says a greeting line and the player
 * gets Cancel / Go options.
 *
 * @param greeting - Custom greeting text (default: 'You came! Shall we go?')
 * @param goLabel - Custom label for the accept option (default: uses NPC pronouns)
 */
export function standardGreeting(greeting?: string, goLabel?: string): Instruction {
  return run('standardGreeting', { greeting, goLabel })
}

/**
 * Standard cancel. NPC says something sad, affection drops, card removed.
 */
export function standardCancel(response?: string, penalty = 20): Instruction {
  return run('standardCancel', { response, penalty })
}

/**
 * Standard no-show. Narration + affection penalty + card removed.
 */
export function standardNoShow(npcDisplayName: string, narration?: string, penalty = 15): Instruction {
  return run('standardNoShow', { npcDisplayName, narration, penalty })
}

/**
 * Standard completion. Affection bonus + card removed + NPC returned to schedule.
 */
export function standardComplete(bonus = 15): Instruction {
  return run('standardComplete', { bonus })
}

// ============================================================================
// DSL HELPERS
// ============================================================================

/** DSL instruction to end a date successfully. Use as the last instruction in a date scene.
 *  The NPC is resolved automatically from the active date card. */
export const endDate = (): Instruction =>
  run('dateComplete', {})

// ============================================================================
// DATE PLAN REGISTRY
// ============================================================================

const DATE_PLANS: Record<string, DatePlan> = {}

/** Register a date plan for an NPC. Call this from the NPC's story file. */
export function registerDatePlan(plan: DatePlan): void {
  DATE_PLANS[plan.npcId] = plan
}

/** Look up a date plan by NPC ID. */
export function getDatePlan(npcId: string): DatePlan | undefined {
  return DATE_PLANS[npcId]
}

/** Get the player's active date card, if any. */
export function getDateCard(game: Game): Card | undefined {
  return game.player.cards.find(c => c.id === 'date')
}

// ============================================================================
// NPC HOOK HELPERS
// ============================================================================

/**
 * Handle date-related NPC approach / wait. Call from an NPC's onWait
 * or onApproach hook.
 *
 * If the player is at the meeting location during the date window,
 * triggers `dateApproach`. Returns true if the date system handled
 * the interaction (caller should return), false otherwise.
 *
 * NPC positioning is handled automatically by the date card's afterUpdate
 * hook (which runs after onMove), so NPCs do **not** need date logic in
 * their onMove hooks.
 *
 * @example
 * onWait: (game) => {
 *   if (handleDateApproach(game, 'tour-guide')) return
 *   // ...normal wait logic
 * },
 */
export function handleDateApproach(game: Game, npcId: string): boolean {
  const card = getDateCard(game)
  if (!card || dateCardData(card).npc !== npcId || card.dateStarted) return false

  const data = dateCardData(card)
  const plan = DATE_PLANS[npcId]
  if (!plan) return false

  const waitMinutes = plan.waitMinutes ?? 120
  const deadline = data.meetTime + waitMinutes * 60

  if (game.time >= data.meetTime && game.time < deadline && game.currentLocation === data.meetLocation) {
    game.run('dateApproach', { npc: npcId })
    return true
  }

  return false
}

// ============================================================================
// DATE CARD DEFINITION
// ============================================================================

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatMeetTime(meetTime: number): string {
  const d = new Date(meetTime * 1000)
  const h = d.getHours()
  const m = d.getMinutes()
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  const time = m > 0 ? `${h12}:${m.toString().padStart(2, '0')}${period}` : `${h12}${period}`
  return `${time}, ${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const dateCardDefinition: CardDefinition = {
  name: 'Date',
  description: 'You have a date arranged.',
  type: 'Date',
  colour: '#f472b6',

  displayName: (card: Card) => {
    const plan = DATE_PLANS[dateCardData(card).npc]
    return plan ? `Date with ${plan.npcDisplayName}` : 'Date'
  },

  displayDescription: (card: Card) => {
    const data = dateCardData(card)
    const plan = DATE_PLANS[data.npc]
    if (!plan) return 'You have a date arranged.'
    return `Meet ${plan.npcDisplayName} at ${plan.meetLocationName} at ${formatMeetTime(data.meetTime)}`
  },

  onAdded: (game: Game, card: Card) => {
    const data = dateCardData(card)
    const plan = DATE_PLANS[data.npc]
    if (plan) {
      game.add({
        type: 'text',
        text: `You have a date with ${plan.npcDisplayName} tomorrow evening.`,
        color: '#f472b6',
      })
    }
  },

  reminders: (game: Game, card: Card): Reminder[] => {
    if (card.dateStarted) return []
    if (card.completed || card.failed) return []

    const data = dateCardData(card)
    const plan = DATE_PLANS[data.npc]
    if (!plan) return []

    const meetDate = new Date(data.meetTime * 1000)
    const today = game.date

    const isToday = today.getFullYear() === meetDate.getFullYear() &&
                    today.getMonth() === meetDate.getMonth() &&
                    today.getDate() === meetDate.getDate()

    if (!isToday) {
      return [{
        text: `Date with ${plan.npcDisplayName} tomorrow at 6pm`,
        urgency: 'info',
        cardId: card.id,
        detail: `Meet ${plan.npcDisplayName} in ${plan.meetLocationName} at 6pm tomorrow.`,
      }]
    }

    // Date is today
    const hour = game.hourOfDay
    const meetHour = meetDate.getHours()

    if (hour < meetHour) {
      return [{
        text: `Meet ${plan.npcDisplayName} in ${plan.meetLocationName} at 6pm today`,
        urgency: 'info',
        cardId: card.id,
        detail: `Don't forget your date! Head to ${plan.meetLocationName} before 6pm.`,
      }]
    }

    // Past meeting time — NPC is waiting
    const waitMinutes = plan.waitMinutes ?? 120
    const deadline = data.meetTime + waitMinutes * 60
    if (game.time < deadline) {
      return [{
        text: `${plan.npcDisplayName} is waiting for you in ${plan.meetLocationName}!`,
        urgency: 'urgent',
        cardId: card.id,
        detail: `Hurry! ${plan.npcDisplayName} won't wait forever.`,
      }]
    }

    return [] // Past deadline — afterUpdate handles cleanup
  },

  afterUpdate: (game: Game) => {
    const card = getDateCard(game)
    if (!card || card.dateStarted || card.completed || card.failed) return

    const data = dateCardData(card)
    const plan = DATE_PLANS[data.npc]
    if (!plan) return

    const waitMinutes = plan.waitMinutes ?? 120
    const deadline = data.meetTime + waitMinutes * 60

    if (game.time >= deadline) {
      // Player didn't show — run the no-show script
      const noShow = plan.onNoShow ?? standardNoShow(plan.npcDisplayName)
      game.run(noShow)
      return
    }

    // During the wait window, override NPC position to the meeting location.
    // This runs after onMove, so the NPC's normal schedule is set first,
    // then the date card moves them to the meeting point.
    if (game.time >= data.meetTime && game.time < deadline) {
      const npc = game.getNPC(data.npc)
      npc.location = data.meetLocation
      game.updateNPCsPresent()
    }
  },
}

registerCardDefinition('date', dateCardDefinition)

// ============================================================================
// DATE LIFECYCLE SCRIPTS
// ============================================================================

const dateScripts = {
  // ── Standard date helpers (called via DSL accessors) ──

  /** Standard greeting: NPC says hello, player gets Cancel / Go options. */
  standardGreeting: (game: Game, params: { greeting?: string; goLabel?: string }) => {
    const npc = game.npc
    npc.say(params.greeting ?? 'You came! Shall we go?')
    const label = params.goLabel ?? `Go with ${npc.pronouns.object}`
    game.addOption(['dateCancel', { npc: game.scene.npc }], 'Cancel the date')
    game.addOption(['dateStart', { npc: game.scene.npc }], label)
  },

  /** Standard cancel: NPC says something sad, affection drops, card removed. */
  standardCancel: (game: Game, params: { response?: string; penalty?: number }) => {
    const npcId = game.scene.npc
    if (!npcId) return
    const npc = game.getNPC(npcId)
    const penalty = params.penalty ?? 20
    npc.say(params.response ?? 'Oh. Right. Maybe some other time, then.')
    game.run('addNpcStat', { npc: npcId, stat: 'affection', change: -penalty, min: 0 })
    game.removeCard('date', true)
    if (npc.template.onMove) game.run(npc.template.onMove)
  },

  /** Standard no-show: narration + affection penalty + card removed. */
  standardNoShow: (game: Game, params: { npcDisplayName?: string; narration?: string; penalty?: number }) => {
    const card = getDateCard(game)
    if (!card) return
    const data = dateCardData(card)
    const npcId = data.npc
    const penalty = params.penalty ?? 15
    const name = params.npcDisplayName ?? 'They'
    game.add(params.narration ?? `${name} waited for you, but you never came.`)
    game.run('addNpcStat', { npc: npcId, stat: 'affection', change: -penalty, min: 0 })
    card.failed = true
    game.removeCard('date', true)
  },

  /** Standard completion: affection bonus + card removed + NPC returned to schedule. */
  standardComplete: (game: Game, params: { bonus?: number }) => {
    const card = getDateCard(game)
    if (!card) return
    const data = dateCardData(card)
    const npcId = data.npc
    const npc = game.getNPC(npcId)
    const bonus = params.bonus ?? 15
    game.run('addNpcStat', { npc: npcId, stat: 'affection', change: bonus, max: 100 })
    game.removeCard('date', true)
    if (npc.template.onMove) game.run(npc.template.onMove)
  },

  // ── Date lifecycle scripts ──

  /** NPC approaches the player at the meeting point. */
  dateApproach: (game: Game, params: { npc?: string }) => {
    const card = getDateCard(game)
    if (!card) return
    const data = dateCardData(card)
    const npcId = params.npc ?? data.npc
    const plan = DATE_PLANS[npcId]
    if (!plan) return

    card.dateStarted = true

    game.scene.npc = npcId
    game.scene.hideNpcImage = false

    // Run the greeting script (custom or default)
    const greeting = plan.onGreeting ?? standardGreeting()
    game.run(greeting)
  },

  /** Player cancels the date at the meeting point. */
  dateCancel: (game: Game, params: { npc?: string }) => {
    const card = getDateCard(game)
    if (!card) return
    const data = dateCardData(card)
    const npcId = params.npc ?? data.npc
    const plan = DATE_PLANS[npcId]
    if (!plan) return

    // Ensure scene NPC is set for cancel script
    game.scene.npc = npcId

    const cancel = plan.onCancel ?? standardCancel()
    game.run(cancel)
  },

  /** Start the date sequence. */
  dateStart: (game: Game, params: { npc?: string }) => {
    const card = getDateCard(game)
    if (!card) return
    const data = dateCardData(card)
    const npcId = params.npc ?? data.npc
    const plan = DATE_PLANS[npcId]
    if (!plan) return

    // Run the NPC-specific date scene
    game.run(plan.dateScene)
  },

  /** Called at the end of the date scene sequence. */
  dateComplete: (game: Game, params: { npc?: string }) => {
    const card = getDateCard(game)
    if (!card) return
    const data = dateCardData(card)
    const npcId = params.npc ?? data.npc
    const plan = DATE_PLANS[npcId]
    if (!plan) return

    const complete = plan.onComplete ?? standardComplete()
    game.run(complete)
  },
}

makeScripts(dateScripts)

// ============================================================================
// CLOTHING REMOVAL — generic NPC strip attempts during intimate scenes
// ============================================================================

/** Layers eligible for removal, in priority order (outer first). */
const STRIP_LAYERS: ClothingLayer[] = ['outer', 'inner', 'under']

/** Positions in strip priority order (feet first, chest/hips last). */
const STRIP_POSITIONS: ClothingPosition[] = [
  'feet', 'legs', 'hands', 'wrists', 'arms', 'waist',
  'neck', 'head', 'face', 'belly', 'hips', 'chest',
]

/**
 * Select the next clothing item an NPC should try to remove.
 * Prioritises outer layers and extremities, with some randomness
 * so the order isn't perfectly predictable.
 */
export function selectStripItem(player: Player): Item | undefined {
  const candidates = player.getWornItems().filter(item => {
    const layer = item.template.layer
    return layer && STRIP_LAYERS.includes(layer) && !item.locked
  })
  if (candidates.length === 0) return undefined

  // Score: layer priority * 100 + max position priority, with random jitter
  const scored = candidates.map(item => {
    const layerIdx = STRIP_LAYERS.indexOf(item.template.layer!)
    const positions = item.template.positions ?? []
    const posIdx = positions.length > 0
      ? Math.max(...positions.map(p => STRIP_POSITIONS.indexOf(p)).filter(i => i >= 0))
      : 0
    const score = layerIdx * 100 + posIdx + Math.random() * 3
    return { item, score }
  })

  scored.sort((a, b) => a.score - b.score)
  return scored[0].item
}

const FUMBLE_NARRATION = [
  (name: string) => `He reaches for your ${name}, fingers clumsy with nerves.`,
  (name: string) => `His hands find your ${name}. He hesitates, looking at you uncertainly.`,
  (name: string) => `He tugs at your ${name}, fumbling with the fastenings.`,
  (name: string) => `His fingers brush your ${name}. He pauses, glancing up at you.`,
  (name: string) => `He tries to work out how your ${name} comes off. It takes him a moment.`,
]

const FUMBLE_ASK = [
  'Is this — can I—?',
  'May I?',
  'Is this all right?',
  'Do you mind if I—?',
]

const ALLOW_NARRATION = [
  'He manages it eventually, grinning like he just solved a puzzle.',
  'He lets out a shaky breath of relief when he finally gets it.',
  'His hands are trembling, but he manages.',
  'He fumbles it twice before getting it right. His ears go red.',
]

const RESIST_NARRATION = [
  'Sorry — sorry. I got carried away.',
  'Right. Of course. Sorry.',
  "I shouldn't have — I'm sorry.",
  'Too much? I — sorry. I just got caught up in the moment.',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

makeScript('tryRemoveClothing', (game: Game) => {
  const npcId = game.scene.npc
  if (!npcId) return
  const npc = game.getNPC(npcId)

  // Probability check: base 40%, reduced by stripResisted
  const resisted = npc.stats.get('stripResisted') ?? 0
  if (Math.random() >= 0.4 / (1 + resisted)) return

  const item = selectStripItem(game.player)
  if (!item) return

  const itemName = item.template.name ?? 'clothing'

  // Push a sub-scene that replaces the current content and options
  game.run('replaceScene', { pages: [seq(
    pickRandom(FUMBLE_NARRATION)(itemName),
    say(pickRandom(FUMBLE_ASK)),
    option(`Let ${npc.pronouns.object}`, ['tryStripAllow', { item: item.id }]),
    option(`Stop ${npc.pronouns.object}`, run('tryStripResist')),
  )] })
})

makeScript('tryStripAllow', (game: Game, params: { item?: string }) => {
  const npcId = game.scene.npc
  if (!npcId || !params.item) return
  const npc = game.getNPC(npcId)

  game.player.unwearItem(params.item)
  npc.stats.set('stripResisted', 0)

  game.add(pickRandom(ALLOW_NARRATION))
  game.run('interact', { script: 'makeOutMenu' })
})

makeScript('tryStripResist', (game: Game) => {
  const npcId = game.scene.npc
  if (!npcId) return
  const npc = game.getNPC(npcId)

  const cur = npc.stats.get('stripResisted') ?? 0
  npc.stats.set('stripResisted', cur + 1)
  npc.stats.set('affection', Math.max(0, (npc.stats.get('affection') ?? 0) - 1))

  npc.say(pickRandom(RESIST_NARRATION))
  game.run('interact', { script: 'makeOutMenu' })
})

/** DSL accessor: NPC may try to remove a clothing item. Place at end of makeout menus. */
export function tryStrip(): Instruction {
  return run('tryRemoveClothing', {})
}

