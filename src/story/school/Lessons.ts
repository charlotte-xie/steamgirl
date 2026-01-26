import { Game } from '../../model/Game'
import type { Card, CardDefinition, Reminder } from '../../model/Card'
import { registerCardDefinition } from '../../model/Card'
import { makeScripts } from '../../model/Scripts'

/** Pick a random element from an array. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

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
const LESSON_DURATION = 100 // minutes (1h40)
const PHASE_DURATION = 25   // minutes per lesson phase

const TIMETABLE: Record<string, LessonTiming> = {
  'lesson-basic-aetherics': {
    name: 'Basic Aetherics',
    slots: [
      { day: 1, startHour: 11, endHour: 11 + LESSON_DURATION / 60 }, // Monday 11:00–12:40
      { day: 3, startHour: 9, endHour: 9 + LESSON_DURATION / 60 },   // Wednesday 9:00–10:40
      { day: 5, startHour: 14, endHour: 14 + LESSON_DURATION / 60 }, // Friday 14:00–15:40
    ],
  },
  'lesson-basic-mechanics': {
    name: 'Basic Mechanics',
    slots: [
      { day: 1, startHour: 14, endHour: 14 + LESSON_DURATION / 60 }, // Monday 14:00–15:40
      { day: 2, startHour: 9, endHour: 9 + LESSON_DURATION / 60 },   // Tuesday 9:00–10:40
      { day: 4, startHour: 11, endHour: 11 + LESSON_DURATION / 60 }, // Thursday 11:00–12:40
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
  if (card.inLesson) return [] // suppress reminders while attending
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

/** Result of getNextLesson — the earliest attendable lesson right now. */
interface NextLesson {
  id: string
  name: string
  slot: LessonSlot
}

/**
 * Find the earliest lesson the player can attend right now.
 * A lesson is attendable from 1 hour before it starts until it ends,
 * provided the player has the active (non-completed, non-failed) quest.
 * Only the earliest slot is returned — you can't skip ahead to a later
 * lesson while an earlier one is still in progress.
 */
export function getNextLesson(game: Game): NextLesson | null {
  const dayOfWeek = game.date.getDay()
  const hour = game.hourOfDay

  // Collect all attendable slots across all lessons
  const candidates: { id: string; name: string; slot: LessonSlot }[] = []

  for (const [id, timing] of Object.entries(TIMETABLE)) {
    // Must have an active quest for this lesson
    const quest = game.player.cards.find(c => c.id === id)
    if (!quest || quest.completed || quest.failed) continue

    // Check date range
    if (timing.startDate && game.time < timing.startDate) continue
    if (timing.endDate && game.time > timing.endDate) continue

    for (const slot of timing.slots) {
      if (slot.day !== dayOfWeek) continue
      // Attendable from 1 hour before start until end
      if (hour >= slot.startHour - 1 && hour < slot.endHour) {
        candidates.push({ id, name: timing.name, slot })
      }
    }
  }

  if (candidates.length === 0) return null

  // Return the earliest by startHour
  candidates.sort((a, b) => a.slot.startHour - b.slot.startHour)
  return candidates[0]
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
// LESSON PHASE FLAVOUR TEXT
// ============================================================================

interface LessonFlavour {
  intro: string[]
  middle: string[][]  // one array per middle phase
  conclusion: string[]
}

const LESSON_FLAVOUR: Record<string, LessonFlavour> = {
  'lesson-basic-aetherics': {
    intro: [
      'The professor adjusts her brass spectacles and begins chalking luminous formulae onto the board. The air hums with residual aetheric charge.',
      'A tall woman in a copper-trimmed coat strides to the lectern and taps a tuning fork against a crystal sphere. It rings with a faint, unearthly resonance.',
      'The professor ignites a small aetheric lamp without touching it, drawing impressed murmurs from the students. "Pay attention," she says. "That was the easy part."',
    ],
    middle: [
      [
        'The professor demonstrates how aetheric resonance differs from simple galvanic current, her hands tracing patterns in the charged air.',
        'You take careful notes as the professor explains the three Laws of Aetheric Conduction, scratching diagrams into your notebook.',
        'A complex diagram of aetheric flow channels fills the blackboard. You copy it down, trying to follow the cascading logic.',
      ],
      [
        'Students take turns attempting to channel a small aetheric current through a crystal matrix. Yours flickers uncertainly before stabilising.',
        'The professor passes around samples of charged aetherstone. You feel a faint tingling warmth as you hold your piece up to the light.',
        'You work through a set of practice calculations, converting between aetheric potentials and resonance frequencies.',
      ],
    ],
    conclusion: [
      'The professor dismisses the class with a reminder to review chapter four before the next session. You gather your notes, your mind buzzing with new concepts.',
      'As the lesson ends, the professor extinguishes the demonstration apparatus with a wave of her hand. "Practice your focusing exercises," she calls out as students begin to leave.',
      'The crystal spheres are carefully packed away as the lecture concludes. You feel you understand the fundamentals a little better now.',
    ],
  },
  'lesson-basic-mechanics': {
    intro: [
      'The workshop master, a stocky man with oil-stained hands, gestures at the partially disassembled engine on the central bench. "Right then. Let\'s see what makes her tick."',
      'Gears and springs are laid out in precise rows on the workbench. The instructor picks up a brass cog and holds it to the light. "Every tooth matters," he says.',
      'The instructor wheels in a complex clockwork assembly on a trolley, its exposed mechanisms gleaming. "Today we get practical," he announces.',
    ],
    middle: [
      [
        'You learn to identify the key components of a differential steam regulator, tracing the flow of pressure through its chambers.',
        'The instructor walks you through the principles of gear ratios, demonstrating with a set of interlocking brass wheels.',
        'A detailed cross-section diagram is projected onto the wall. You follow along as the instructor explains each valve and piston.',
      ],
      [
        'You carefully disassemble a small clockwork mechanism, laying out each piece in order. Putting it back together is the real test.',
        'Working in pairs, you attempt to calibrate a pressure gauge. It takes several tries before the needle settles in the correct range.',
        'You oil and adjust a set of miniature gears, learning to feel when the tolerances are right by the smoothness of the rotation.',
      ],
    ],
    conclusion: [
      'The instructor calls time and you wipe the oil from your hands with a rag. Your fingers ache pleasantly from the precise work.',
      'Tools are returned to their racks as the session ends. The instructor nods approvingly at your workbench. "Not bad for a beginner."',
      'You pack away your tools, satisfied with the small mechanism now ticking steadily on your bench. The fundamentals are starting to click.',
    ],
  },
}

const EARLY_ARRIVAL_FLAVOUR = [
  'You arrive at the classroom ahead of time. The room is mostly empty, with only a few other early students settling into their seats.',
  'The classroom is quiet when you arrive. A few students are already here, leafing through their notes or chatting softly.',
  'You\'re early. The lecturer hasn\'t arrived yet and the room has a calm, expectant atmosphere.',
]

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

  /** Attend the next available lesson. Moves to classroom and shows early arrival or starts directly. */
  attendLesson: (g: Game) => {
    const next = getNextLesson(g)
    if (!next) {
      g.add('There are no lessons to attend right now.')
      return
    }

    const quest = g.player.cards.find(c => c.id === next.id)
    if (!quest) return

    // Move to classroom
    g.run('move', { location: 'classroom' })

    const lessonData = { lessonId: next.id, lessonName: next.name, startHour: next.slot.startHour }

    // Check if early (before lesson start)
    if (g.hourOfDay < next.slot.startHour) {
      g.add(pick(EARLY_ARRIVAL_FLAVOUR))
      g.add({ type: 'text', text: `${next.name} begins at ${formatHour(next.slot.startHour)}.`, color: '#d0b691' })
      g.addOption('lessonEarlyWait', lessonData, 'Wait quietly')
      g.addOption('lessonEarlyStudy', lessonData, 'Study your notes')
      g.addOption('lessonEarlySocialise', lessonData, 'Chat with classmates')
    } else {
      // Already at or past start time — go straight into the lesson
      g.run('lessonStart', lessonData)
    }
  },

  /** Early arrival: wait quietly until the lesson starts. */
  lessonEarlyWait: (g: Game, p: Record<string, unknown>) => {
    g.run('timeLapse', { untilTime: p.startHour })
    g.add('You sit quietly and wait, watching students file in as the start time approaches.')
    g.add('The lecturer arrives and begins setting up.')
    g.addOption('lessonStart', p, 'Start Lesson')
  },

  /** Early arrival: study notes until the lesson starts. */
  lessonEarlyStudy: (g: Game, p: Record<string, unknown>) => {
    g.run('timeLapse', { untilTime: p.startHour })
    g.add('You review your notes from previous sessions, refreshing the key concepts in your mind.')
    g.add('The lecturer arrives and begins setting up.')
    g.addOption('lessonStart', p, 'Start Lesson')
  },

  /** Early arrival: socialise with classmates until the lesson starts. */
  lessonEarlySocialise: (g: Game, p: Record<string, unknown>) => {
    g.run('timeLapse', { untilTime: p.startHour })
    g.add('You chat with nearby students, swapping impressions of the course and comparing notes.')
    g.add('The lecturer arrives and begins setting up.')
    g.addOption('lessonStart', p, 'Start Lesson')
  },

  /** Begin the lesson proper — phase 1 of 4. */
  lessonStart: (g: Game, p: Record<string, unknown>) => {
    const lessonId = p.lessonId as string
    const lessonName = p.lessonName as string
    const flavour = LESSON_FLAVOUR[lessonId]

    // Mark lesson in progress to suppress reminders
    const quest = g.player.cards.find(c => c.id === lessonId)
    if (quest) quest.inLesson = true

    // Phase 1: Introduction
    g.timeLapse(PHASE_DURATION)
    if (flavour) {
      g.add(pick(flavour.intro))
    } else {
      g.add(`The ${lessonName} lecture begins.`)
    }

    g.addOption('lessonPhase2', p, 'Continue')
  },

  /** Lesson phase 2. */
  lessonPhase2: (g: Game, p: Record<string, unknown>) => {
    const lessonId = p.lessonId as string
    const lessonName = p.lessonName as string
    const flavour = LESSON_FLAVOUR[lessonId]

    g.timeLapse(PHASE_DURATION)
    if (flavour) {
      g.add(pick(flavour.middle[0]))
    } else {
      g.add(`The ${lessonName} lecture continues.`)
    }

    g.addOption('lessonPhase3', p, 'Continue')
  },

  /** Lesson phase 3. */
  lessonPhase3: (g: Game, p: Record<string, unknown>) => {
    const lessonId = p.lessonId as string
    const lessonName = p.lessonName as string
    const flavour = LESSON_FLAVOUR[lessonId]

    g.timeLapse(PHASE_DURATION)
    if (flavour) {
      g.add(pick(flavour.middle[1]))
    } else {
      g.add(`The ${lessonName} lecture continues.`)
    }

    g.addOption('lessonPhase4', p, 'Continue')
  },

  /** Lesson phase 4: conclusion and attendance increment. */
  lessonPhase4: (g: Game, p: Record<string, unknown>) => {
    const lessonId = p.lessonId as string
    const lessonName = p.lessonName as string
    const flavour = LESSON_FLAVOUR[lessonId]
    const quest = g.player.cards.find(c => c.id === lessonId)
    if (!quest) return

    g.timeLapse(PHASE_DURATION)
    if (flavour) {
      g.add(pick(flavour.conclusion))
    } else {
      g.add(`The ${lessonName} lecture concludes.`)
    }

    // Clear in-progress flag and increment attendance
    quest.inLesson = false
    quest.attended = ((quest.attended as number) ?? 0) + 1
    const attended = quest.attended as number

    g.add({ type: 'text', text: `(${attended}/${LESSONS_REQUIRED} sessions attended)`, color: '#d0b691' })
  },
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerCardDefinition('lesson-basic-aetherics', basicAethericsLesson)
registerCardDefinition('lesson-basic-mechanics', basicMechanicsLesson)
makeScripts(lessonScripts)
