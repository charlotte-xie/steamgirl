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
import { makeScripts, type Script } from '../model/Scripts'
import { type Instruction, run } from '../model/ScriptDSL'

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
   * Should add options for 'Go with him' and 'Cancel the date'.
   * Default: standardGreeting(npcDisplayName).
   */
  onGreeting?: Script

  /**
   * Script run when the player cancels the date at the meeting point.
   * Should handle affection penalty and card cleanup (or call dateCleanup).
   * Default: standardCancel(npcDisplayName, 20).
   */
  onCancel?: Script

  /**
   * Script run when the player doesn't show up within the wait window.
   * Should handle affection penalty and card cleanup (or call dateCleanup).
   * Default: standardNoShow(npcDisplayName, 15).
   */
  onNoShow?: Script

  /**
   * Script run when the date scene completes successfully.
   * Should handle affection bonus and card cleanup (or call dateCleanup).
   * Default: standardComplete(npcDisplayName, 15).
   */
  onComplete?: Script
}

// ============================================================================
// SCRIPT BUILDERS — sensible defaults from simple parameters
// ============================================================================

/**
 * Build a standard greeting script. The NPC says a greeting line and
 * the player gets Cancel / Go options.
 */
export function standardGreeting(greeting?: string): Script {
  return (game: Game) => {
    const npc = game.npc
    npc.say(greeting ?? 'You came! Shall we go?')
    game.addOption('dateCancel', { npc: game.scene.npc }, 'Cancel the date')
    game.addOption('dateStart', { npc: game.scene.npc }, 'Go with him')
  }
}

/**
 * Build a standard cancel script. The NPC says something sad,
 * affection drops, and the date card is removed.
 */
export function standardCancel(response?: string, penalty = 20): Script {
  return (game: Game) => {
    const npcId = game.scene.npc
    if (!npcId) return
    const npc = game.getNPC(npcId)
    npc.say(response ?? 'Oh. Right. Maybe some other time, then.')
    npc.stats.set('affection', Math.max(0, npc.affection - penalty))
    game.add({ type: 'text', text: `Affection -${penalty}`, color: '#ef4444' })
    game.removeCard('date', true)
    if (npc.template.onMove) game.run(npc.template.onMove)
  }
}

/**
 * Build a standard no-show script. Narration of the NPC leaving,
 * affection drops, and the date card is removed.
 */
export function standardNoShow(npcDisplayName: string, narration?: string, penalty = 15): Script {
  return (game: Game) => {
    const card = getDateCard(game)
    if (!card) return
    const npcId = card.npc as string
    const npc = game.getNPC(npcId)
    game.add(narration ?? `${npcDisplayName} waited for you, but you never came.`)
    npc.stats.set('affection', Math.max(0, npc.affection - penalty))
    game.add({ type: 'text', text: `Affection -${penalty}`, color: '#ef4444' })
    card.failed = true
    game.removeCard('date', true)
  }
}

/**
 * Build a standard completion script. Affection bonus, card removed,
 * NPC returned to schedule.
 */
export function standardComplete(bonus = 15): Script {
  return (game: Game) => {
    const card = getDateCard(game)
    if (!card) return
    const npcId = card.npc as string
    const npc = game.getNPC(npcId)
    npc.stats.set('affection', Math.min(100, npc.affection + bonus))
    game.add({ type: 'text', text: `Affection +${bonus}`, color: '#10b981' })
    game.removeCard('date', true)
    if (npc.template.onMove) game.run(npc.template.onMove)
  }
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
// DATE CARD DEFINITION
// ============================================================================

const dateCardDefinition: CardDefinition = {
  name: 'Date',
  description: 'You have a date arranged.',
  type: 'Date',
  color: '#f472b6',

  onAdded: (game: Game, card: Card) => {
    const plan = DATE_PLANS[card.npc as string]
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

    const plan = DATE_PLANS[card.npc as string]
    if (!plan) return []

    const meetTime = card.meetTime as number
    const meetDate = new Date(meetTime * 1000)
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
    const deadline = meetTime + waitMinutes * 60
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

    const plan = DATE_PLANS[card.npc as string]
    if (!plan) return

    const meetTime = card.meetTime as number
    const waitMinutes = plan.waitMinutes ?? 120
    const deadline = meetTime + waitMinutes * 60

    if (game.time >= deadline) {
      // Player didn't show — run the no-show script
      const noShow = plan.onNoShow ?? standardNoShow(plan.npcDisplayName)
      game.run(noShow)
    }
  },
}

registerCardDefinition('date', dateCardDefinition)

// ============================================================================
// DATE LIFECYCLE SCRIPTS
// ============================================================================

const dateScripts = {
  /** NPC approaches the player at the meeting point. */
  dateApproach: (game: Game, params: { npc?: string }) => {
    const card = getDateCard(game)
    if (!card) return
    const npcId = params.npc ?? card.npc as string
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
    const npcId = params.npc ?? card.npc as string
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
    const npcId = params.npc ?? card.npc as string
    const plan = DATE_PLANS[npcId]
    if (!plan) return

    // Run the NPC-specific date scene
    game.run(plan.dateScene)
  },

  /** Called at the end of the date scene sequence. */
  dateComplete: (game: Game, params: { npc?: string }) => {
    const card = getDateCard(game)
    if (!card) return
    const npcId = params.npc ?? card.npc as string
    const plan = DATE_PLANS[npcId]
    if (!plan) return

    const complete = plan.onComplete ?? standardComplete()
    game.run(complete)
  },
}

makeScripts(dateScripts)
