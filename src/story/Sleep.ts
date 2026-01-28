/**
 * Sleep.ts - Sleep and rest system
 *
 * Handles sleeping mechanics including:
 * - Energy restoration based on sleep duration
 * - Alarm constraints
 * - Min/max duration constraints
 * - Sleep quality modifiers
 * - Contextual wakeup messages
 */

import { Game } from '../model/Game'
import { makeScript } from '../model/Scripts'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Energy restored per minute of sleep (1 energy per 6 mins = 10 per hour) */
const ENERGY_PER_MINUTE = 1 / 6

/** Maximum energy level */
const MAX_ENERGY = 100

/** Energy threshold below which full sleep is allowed */
const TIRED_THRESHOLD = 70

/** Sleep is processed in chunks to allow interruption */
const SLEEP_CHUNK_MINUTES = 30

// ============================================================================
// TYPES
// ============================================================================

export type SleepParams = {
  /** Force wakeup at a specific hour (0-24, e.g., 7 for 7am) */
  alarm?: number
  /** Maximum sleep duration in minutes (for naps) */
  max?: number
  /** Minimum sleep duration in minutes */
  min?: number
  /** Quality modifier (1.0 = default, higher = more restorative) */
  quality?: number
  /** If true, this is a full sleep (sets lastSleep timer). Auto-detected if no max is set. */
  fullSleep?: boolean
}

export type WakeupReason = 'rested' | 'alarm' | 'max' | 'min' | 'interrupted'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate minutes until a given hour of day.
 * If the hour has already passed today, calculates to that hour tomorrow.
 */
function minutesUntilHour(game: Game, targetHour: number): number {
  const currentHour = game.hourOfDay
  let hoursUntil = targetHour - currentHour
  if (hoursUntil <= 0) {
    hoursUntil += 24 // Next day
  }
  return Math.round(hoursUntil * 60)
}

/**
 * Generate an appropriate wakeup message based on the reason and final energy level.
 */
function getWakeupMessage(reason: WakeupReason, energy: number, minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const durationText = hours > 0
    ? (mins > 0 ? `${hours} hours and ${mins} minutes` : `${hours} hours`)
    : `${mins} minutes`

  switch (reason) {
    case 'interrupted':
      return 'You wake suddenly...'

    case 'alarm':
      if (energy >= 90) {
        return `You are woken by your alarm after ${durationText}. You feel well rested despite the interruption.`
      } else if (energy >= 60) {
        return `Your alarm pulls you from sleep after ${durationText}. You could have used more rest, but you'll manage.`
      } else {
        return `The alarm drags you unwillingly from sleep after only ${durationText}. You feel groggy and unrested.`
      }

    case 'max':
      if (energy >= 80) {
        return `You wake after a refreshing ${durationText} nap, feeling much better.`
      } else if (energy >= 50) {
        return `You wake after ${durationText}. That was a pleasant rest.`
      } else {
        return `You doze for ${durationText} before stirring. It helped a little.`
      }

    case 'min':
      return `You rest for ${durationText}, then get up. You feel somewhat restored.`

    case 'rested':
    default:
      if (energy >= 95) {
        return `You wake naturally after ${durationText}, feeling completely restored. The world seems brighter somehow.`
      } else if (energy >= 80) {
        return `You sleep for ${durationText} and wake feeling refreshed and ready for the day.`
      } else if (energy >= 60) {
        return `After ${durationText} of sleep, you wake feeling reasonably rested.`
      } else {
        return `You manage ${durationText} of fitful sleep. It's something, at least.`
      }
  }
}

// ============================================================================
// MAIN SLEEP FUNCTION
// ============================================================================

/**
 * Sleep script - handles sleeping with various constraints.
 *
 * Energy is restored at a rate of 1 point per 6 minutes (10 per hour),
 * so 8 hours of sleep restores 80 energy.
 *
 * Sleep is processed in chunks using the wait system, allowing events
 * to interrupt sleep (e.g., NPC encounters, random events).
 *
 * @param alarm - Force wakeup at a specific hour (0-24)
 * @param max - Maximum sleep duration in minutes (for naps)
 * @param min - Minimum sleep duration in minutes
 * @param quality - Quality modifier (1.0 = default, higher = more restorative)
 */
export function sleep(game: Game, params: SleepParams = {}): void {
  let { alarm, max, min, quality = 1.0, fullSleep } = params

  // Determine if this is a full sleep (sets lastSleep timer)
  // Auto-detect: if no max is set, it's full sleep; otherwise it's a nap
  const isFullSleep = fullSleep ?? (max === undefined)

  // Get current energy
  const startEnergy = game.player.basestats.get('Energy') ?? 0

  // Check if player is too energetic for full sleep
  if (isFullSleep && startEnergy >= TIRED_THRESHOLD) {
    game.add('You\'re not tired enough to sleep properly. You lie down but find yourself staring at the ceiling, mind racing.')
    return
  }

  // For naps when not tired, cap at 30 minutes
  if (!isFullSleep && startEnergy >= TIRED_THRESHOLD) {
    max = Math.min(max ?? 30, 30)
  }

  const energyNeeded = MAX_ENERGY - startEnergy

  // Calculate base sleep duration needed to fully restore energy
  // Higher quality = faster energy gain = less sleep needed
  const effectiveEnergyPerMinute = ENERGY_PER_MINUTE * quality
  const baseMinutesNeeded = energyNeeded / effectiveEnergyPerMinute

  // Start with ideal sleep duration
  let targetMinutes = baseMinutesNeeded
  let wakeupReason: WakeupReason = 'rested'

  // Apply minimum constraint
  if (min !== undefined && targetMinutes < min) {
    targetMinutes = min
    wakeupReason = 'min'
  }

  // Apply maximum constraint
  if (max !== undefined && targetMinutes > max) {
    targetMinutes = max
    wakeupReason = 'max'
  }

  // Apply alarm constraint
  if (alarm !== undefined) {
    const minutesToAlarm = minutesUntilHour(game, alarm)
    if (minutesToAlarm < targetMinutes) {
      targetMinutes = minutesToAlarm
      wakeupReason = 'alarm'
    }
  }

  // Ensure we sleep at least 1 minute
  targetMinutes = Math.max(1, Math.round(targetMinutes))

  // Set sleeping flag
  game.player.sleeping = true

  // Process sleep in chunks using wait, allowing interruption
  let minutesSlept = 0
  let interrupted = false

  while (minutesSlept < targetMinutes) {
    const remaining = targetMinutes - minutesSlept
    const chunk = Math.min(remaining, SLEEP_CHUNK_MINUTES)

    // Use wait to allow events to trigger
    game.run('wait', { minutes: chunk })
    minutesSlept += chunk

    // Check if a scene was triggered (sleep interrupted)
    if (game.inScene) {
      interrupted = true
      wakeupReason = 'interrupted'
      break
    }
  }

  // Clear sleeping flag (player is now awake)
  game.player.sleeping = false

  // Calculate actual energy restored based on time slept
  const energyRestored = Math.min(
    minutesSlept * effectiveEnergyPerMinute,
    MAX_ENERGY - startEnergy
  )

  // Apply energy restoration
  const newEnergy = Math.min(MAX_ENERGY, startEnergy + energyRestored)
  game.player.basestats.set('Energy', Math.round(newEnergy))

  // Set lastSleep timer for full sleep (even if interrupted)
  if (isFullSleep && minutesSlept >= (min ?? 0)) {
    game.player.setTimer('lastSleep', game.time)
  }

  // Generate wakeup message
  const wakeupMessage = getWakeupMessage(wakeupReason, newEnergy, minutesSlept)

  if (interrupted) {
    // Prepend wakeup message to existing scene content
    game.scene.content.unshift({ type: 'paragraph', content: [{ type: 'text', text: wakeupMessage }] })
    if (energyRestored > 0) {
      game.scene.content.splice(1, 0, { type: 'text', text: `+${Math.round(energyRestored)} Energy`, color: '#10b981' })
    }
  } else {
    // Normal wakeup - add messages normally
    game.add(wakeupMessage)
    if (energyRestored > 0) {
      game.add({ type: 'text', text: `+${Math.round(energyRestored)} Energy`, color: '#10b981' })
    }
  }
}

// ============================================================================
// SCRIPT REGISTRATION
// ============================================================================

makeScript('sleep', (game: Game, params: SleepParams) => {
  sleep(game, params)
})
