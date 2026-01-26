import { Game } from '../../model/Game'
import type { Card, CardDefinition, Reminder } from '../../model/Card'
import { registerCardDefinition } from '../../model/Card'
import { makeScripts } from '../../model/Scripts'

// ============================================================================
// TIMETABLE STRUCTURE
// ============================================================================

/** A single weekly time slot. */
interface LessonSlot {
  day: number       // 0=Sun, 1=Mon, ..., 6=Sat
  startHour: number // e.g. 11
  endHour: number   // e.g. 13
}

/** Timetable entry for a lesson, keyed by card ID in the TIMETABLE map. */
interface LessonTiming {
  name: string
  slots: LessonSlot[]
  startDate?: number  // unix timestamp — lesson not active before this
  endDate?: number    // unix timestamp — lesson not active after this
}

// ============================================================================
// TIMETABLE DATA
// ============================================================================

/**
 * Central timetable — maps lesson card IDs to their scheduling.
 * Cards look up their timing here; changing the timetable does not
 * require touching the card definitions.
 */
const TIMETABLE: Record<string, LessonTiming> = {
  'lesson-basic-aetherics': {
    name: 'Basic Aetherics',
    slots: [
      { day: 1, startHour: 11, endHour: 13 }, // Monday
      { day: 3, startHour: 9, endHour: 11 },  // Wednesday
      { day: 5, startHour: 14, endHour: 16 }, // Friday
    ],
  },
  'lesson-basic-mechanics': {
    name: 'Basic Mechanics',
    slots: [
      { day: 1, startHour: 14, endHour: 16 }, // Monday
      { day: 2, startHour: 9, endHour: 11 },  // Tuesday
      { day: 4, startHour: 11, endHour: 13 }, // Thursday
    ],
  },
}

// ============================================================================
// TIMETABLE UTILITIES
// ============================================================================

/** Format an hour number as a human-readable time string. */
function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12am'
  if (hour === 12) return '12pm'
  if (hour < 12) return `${hour}am`
  return `${hour - 12}pm`
}

/**
 * Generate reminders for a lesson by looking up its timetable entry.
 * Returns an empty array if the lesson has no timetable entry, is outside
 * its start/end date range, or has no slots on the current day.
 */
function lessonReminders(game: Game, card: Card): Reminder[] {
  if (card.completed || card.failed) return []
  const timing = TIMETABLE[card.id]
  if (!timing) return []

  // Check date range
  if (timing.startDate && game.time < timing.startDate) return []
  if (timing.endDate && game.time > timing.endDate) return []

  const dayOfWeek = game.date.getDay()
  const hour = game.hourOfDay
  const reminders: Reminder[] = []
  for (const slot of timing.slots) {
    if (slot.day !== dayOfWeek) continue
    if (hour <= slot.startHour) {
      reminders.push({ text: `${timing.name} at ${formatHour(slot.startHour)}`, urgency: 'info', cardId: card.id })
    } else if (hour < slot.endHour) {
      reminders.push({ text: `Late for ${timing.name}!`, urgency: 'urgent', cardId: card.id })
    }
    // After endHour: no reminder
  }
  return reminders
}

// ============================================================================
// LESSON QUEST DEFINITIONS
// ============================================================================

/**
 * Lessons are Quest cards representing university courses.
 * Each lesson tracks attendance via a custom `attended` counter on the card instance.
 * The quest completes once the player has attended enough sessions.
 */

const LESSONS_REQUIRED = 3 // Number of sessions to complete a lesson

const basicAethericsLesson: CardDefinition = {
  name: 'Basic Aetherics',
  description: `Attend ${LESSONS_REQUIRED} Basic Aetherics lectures to complete the course.`,
  type: 'Quest',
  afterUpdate: (game: Game) => {
    const quest = game.player.cards.find(c => c.id === 'lesson-basic-aetherics')
    if (!quest || quest.completed || quest.failed) return
    if ((quest.attended as number ?? 0) >= LESSONS_REQUIRED) {
      game.completeQuest('lesson-basic-aetherics')
    }
  },
  reminders: lessonReminders,
}

const basicMechanicsLesson: CardDefinition = {
  name: 'Basic Mechanics',
  description: `Attend ${LESSONS_REQUIRED} Basic Mechanics lectures to complete the course.`,
  type: 'Quest',
  afterUpdate: (game: Game) => {
    const quest = game.player.cards.find(c => c.id === 'lesson-basic-mechanics')
    if (!quest || quest.completed || quest.failed) return
    if ((quest.attended as number ?? 0) >= LESSONS_REQUIRED) {
      game.completeQuest('lesson-basic-mechanics')
    }
  },
  reminders: lessonReminders,
}

// ============================================================================
// SCRIPTS
// ============================================================================

const lessonScripts = {
  /** Add all lesson quests to the player. Called during induction and debug starts. */
  enrollLessons: (g: Game) => {
    for (const id of Object.keys(TIMETABLE)) {
      g.addQuest(id)
    }
  },
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerCardDefinition('lesson-basic-aetherics', basicAethericsLesson)
registerCardDefinition('lesson-basic-mechanics', basicMechanicsLesson)
makeScripts(lessonScripts)
