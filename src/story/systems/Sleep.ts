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

import { Game } from '../../model/Game'
import { makeScript } from '../../model/Scripts'
import { applyRelaxation } from '../Effects'

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
function getWakeupMessage(reason: WakeupReason, energy: number): string {
  switch (reason) {
    case 'interrupted':
      return 'You wake suddenly...'

    case 'alarm':
      if (energy >= 90) {
        return 'You are woken by your alarm. You feel well rested despite the interruption.'
      } else if (energy >= 60) {
        return 'Your alarm pulls you from sleep. You could have used more rest, but you will manage.'
      } else {
        return 'The alarm drags you unwillingly from sleep. You feel groggy and unrested.'
      }

    case 'max':
      if (energy >= 80) {
        return 'You wake from a refreshing nap, feeling much better.'
      } else if (energy >= 50) {
        return 'You wake from a pleasant rest.'
      } else {
        return 'You doze for a while before stirring. It helped a little.'
      }

    case 'min':
      return 'You rest for a while, then get up. You feel somewhat restored.'

    case 'rested':
    default:
      if (energy >= 95) {
        return 'You wake naturally, feeling completely restored. The world seems brighter somehow.'
      } else if (energy >= 80) {
        return 'You wake feeling refreshed and ready for the day.'
      } else if (energy >= 60) {
        return 'You wake feeling reasonably rested.'
      } else {
        return 'You manage some fitful sleep. It is something, at least.'
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

  // When an alarm is set, sleep until the alarm regardless of energy.
  // This handles sleepTogether (7am alarm) and "sleep until morning".
  const hasAlarm = alarm !== undefined
  const minutesToAlarm = hasAlarm ? minutesUntilHour(game, alarm) : 0

  // Check if player is too energetic for full sleep (unless alarm forces it)
  if (!hasAlarm && isFullSleep && startEnergy >= TIRED_THRESHOLD) {
    game.add('You\'re not tired enough to sleep properly. You lie down but find yourself staring at the ceiling, mind racing.')
    return
  }

  // For naps when not tired (no alarm), cap at 30 minutes
  if (!hasAlarm && !isFullSleep && startEnergy >= TIRED_THRESHOLD) {
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

  // When alarm is set, use it as the target — sleep until the alarm
  if (hasAlarm) {
    targetMinutes = minutesToAlarm
    wakeupReason = 'alarm'
  }

  // Apply minimum constraint
  if (min !== undefined && targetMinutes < min) {
    targetMinutes = min
    wakeupReason = 'min'
  }

  // Apply maximum constraint (alarm still respects max if both are set)
  if (max !== undefined && targetMinutes > max) {
    targetMinutes = max
    wakeupReason = 'max'
  }

  // Ensure we sleep at least 1 minute
  targetMinutes = Math.max(1, Math.round(targetMinutes))

  // Set sleeping flag
  game.player.sleeping = true

  // Process sleep in chunks using wait, allowing interruption.
  // Energy is restored incrementally each chunk so that timeEffects
  // (which runs during wait) sees the rising energy and clears
  // Tired/Exhausted naturally during sleep rather than after.
  let minutesSlept = 0
  let interrupted = false

  while (minutesSlept < targetMinutes) {
    const remaining = targetMinutes - minutesSlept
    const chunk = Math.min(remaining, SLEEP_CHUNK_MINUTES)

    // Restore energy for this chunk before wait, so timeEffects sees it
    const currentEnergy = game.player.basestats.get('Energy') ?? 0
    const chunkEnergy = chunk * effectiveEnergyPerMinute
    const newChunkEnergy = Math.min(MAX_ENERGY, currentEnergy + chunkEnergy)
    game.player.basestats.set('Energy', Math.round(newChunkEnergy))

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

  // Calculate total energy restored for the wakeup message
  const finalEnergy = game.player.basestats.get('Energy') ?? 0
  const energyRestored = finalEnergy - startEnergy

  // Set lastSleep timer for full sleep (even if interrupted)
  if (isFullSleep && minutesSlept >= (min ?? 0)) {
    game.player.setTimer('lastSleep', game.time)
  }

  // Generate wakeup message
  const wakeupMessage = getWakeupMessage(wakeupReason, finalEnergy)

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
// BED ACTIVITY
// ============================================================================

export type BedParams = {
  /** Quality modifier for this bed (1.0 = default, higher = more restorative) */
  quality?: number
}

/**
 * Standard bed activity that can be added to any location with a bed.
 * Shows a scene with options for Nap or Sleep.
 *
 * @param quality - Quality modifier (1.0 = default, higher = more restorative)
 * @returns A LocationActivity that can be added to a location's activities array
 */
export function bedActivity(params: BedParams = {}) {
  return {
    name: 'Bed',
    symbol: '🛏',
    script: ['bedScene', params] as [string, BedParams],
  }
}

// ============================================================================
// SCRIPT REGISTRATION
// ============================================================================

makeScript('sleep', (game: Game, params: SleepParams) => {
  sleep(game, params)
})

/**
 * Sleep together with an NPC. Wakes at 7am so the morning scene
 * plays naturally. NPC scripts should gate availability on time
 * (e.g. post 10pm) and provide their own morning content after
 * this instruction via `when(not(inScene()), ...)`.
 *
 * Usage in NPC scripts:
 *   seq(
 *     run('sleepTogether', { quality: 1.2 }),
 *     when(not(inScene()), ...morningScene),
 *   )
 */
makeScript('sleepTogether', (game: Game, params: { quality?: number }) => {
  sleep(game, { alarm: 7, quality: params.quality ?? 1.0 })
})

makeScript('bedScene', (game: Game, params: BedParams) => {
  const quality = params.quality ?? 1.0
  const energy = game.player.basestats.get('Energy') ?? 0
  const isTired = energy < TIRED_THRESHOLD

  game.add('You approach the bed.')
  game.addOption(['relax', { quality }], 'Relax')
  game.addOption(['sleep', { max: 60, quality }], 'Take a Nap')
  if (isTired) {
    game.addOption(['sleep', { quality }], 'Go to Sleep')
  } else {
    game.addOption(['sleep', { alarm: 7, quality }], 'Sleep Until Morning')
  }
  game.addOption('endScene', 'Never mind')
})

makeScript('relax', (game: Game, params: { quality?: number }) => {
  game.add('You lie down and relax for a while.')
  game.run('wait', { minutes: 20 })

  // Only apply relaxation if not interrupted
  if (!game.inScene) {
    applyRelaxation(game, 20, params.quality || 1.0)
  }
})
