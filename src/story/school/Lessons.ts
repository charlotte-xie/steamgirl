import { Game } from '../../model/Game'
import type { Instruction } from '../../model/Scripts'
import type { Card, CardDefinition, Reminder } from '../../model/Card'
import { registerCardDefinition } from '../../model/Card'
import { makeScripts } from '../../model/Scripts'
import { random, timeUntil, run, seq, scenes, choice, branch, lessonTime, say } from '../../model/ScriptDSL'

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
  npc: string         // NPC ID of the professor who teaches this lesson
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

export const TIMETABLE: Record<string, LessonTiming> = {
  'lesson-basic-aetherics': {
    name: 'Basic Aetherics',
    npc: 'prof-lucienne-vael',
    slots: [
      { day: 1, startHour: 11, endHour: 11 + LESSON_DURATION / 60 }, // Monday 11:00–12:40
      { day: 3, startHour: 9, endHour: 9 + LESSON_DURATION / 60 },   // Wednesday 9:00–10:40
      { day: 5, startHour: 14, endHour: 14 + LESSON_DURATION / 60 }, // Friday 14:00–15:40
    ],
  },
  'lesson-basic-mechanics': {
    name: 'Basic Mechanics',
    npc: 'prof-harland-greaves',
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

/** Compute the unix timestamp for a given hour on the current game day. */
function slotStartTime(game: Game, hour: number): number {
  const d = game.date
  d.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

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
  const lastAttended = card.lastAttended as number | undefined
  const reminders: Reminder[] = []
  for (const slot of timing.slots) {
    if (slot.day !== dayOfWeek) continue
    // Already attended this slot
    if (lastAttended && lastAttended >= slotStartTime(game, slot.startHour)) continue
    if (hour <= slot.startHour) {
      reminders.push({ text: `${timing.name} at ${formatHour(slot.startHour)}`, urgency: 'info', cardId: card.id, detail: `Head to the classroom for ${timing.name}.` })
    } else if (hour < slot.endHour) {
      reminders.push({ text: `Late for ${timing.name}!`, urgency: 'urgent', cardId: card.id, detail: `${timing.name} has already started in the classroom!` })
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

    const lastAttended = quest.lastAttended as number | undefined
    for (const slot of timing.slots) {
      if (slot.day !== dayOfWeek) continue
      // Already attended this slot
      if (lastAttended && lastAttended >= slotStartTime(game, slot.startHour)) continue
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

/**
 * Find a lesson that is currently in progress (past startHour, before endHour)
 * and not already being attended. Used by classroom hooks to catch the player
 * if they're present when a lesson begins or arrive during one.
 */
export function getLessonInProgress(game: Game): NextLesson | null {
  const dayOfWeek = game.date.getDay()
  const hour = game.hourOfDay

  for (const [id, timing] of Object.entries(TIMETABLE)) {
    const quest = game.player.cards.find(c => c.id === id)
    if (!quest || quest.completed || quest.failed) continue
    if (quest.inLesson) continue // already attending

    if (timing.startDate && game.time < timing.startDate) continue
    if (timing.endDate && game.time > timing.endDate) continue

    const lastAttended = quest.lastAttended as number | undefined
    for (const slot of timing.slots) {
      if (slot.day !== dayOfWeek) continue
      // Already attended this slot
      if (lastAttended && lastAttended >= slotStartTime(game, slot.startHour)) continue
      if (hour >= slot.startHour && hour < slot.endHour) {
        return { id, name: timing.name, slot }
      }
    }
  }
  return null
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
// LESSON DEFINITIONS
// ============================================================================

interface LessonDefinition {
  lateArrival?: Instruction
  body: Instruction
}

const LATE_ARRIVAL_GENERIC = [
  'You slip into the classroom late. The lecturer pauses and gives you a pointed look before continuing.',
  'The door creaks as you enter mid-lecture. Every head turns. The professor is not amused.',
]

const EARLY_ARRIVAL_FLAVOUR = [
  'You arrive at the classroom ahead of time. The room is mostly empty, with only a few other early students settling into their seats.',
  'The classroom is quiet when you arrive. A few students are already here, leafing through their notes or chatting softly.',
  'You\'re early. The lecturer hasn\'t arrived yet and the room has a calm, expectant atmosphere.',
]

const LESSONS: Record<string, LessonDefinition> = {
  'lesson-basic-aetherics': {
    lateArrival: random(
      seq('Professor Vael pauses mid-sentence and fixes you with a sharp look over her brass spectacles.', say('How good of you to join us. Do try to be punctual.')),
      seq('The class turns to watch as you slip through the door. Professor Vael\'s expression is icy.', say('Late again? Take your seat. Quietly.')),
      seq('Professor Vael doesn\'t break stride, but her voice gains a pointed edge.', say('I trust you have a compelling reason for your tardiness. No? Then sit down.')),
    ),
    body: scenes(
      lessonTime(0, random(
        'The professor adjusts her brass spectacles and begins chalking luminous formulae onto the board. The air hums with residual aetheric charge.',
        'A tall woman in a copper-trimmed coat strides to the lectern and taps a tuning fork against a crystal sphere. It rings with a faint, unearthly resonance.',
        seq('The professor ignites a small aetheric lamp without touching it, drawing impressed murmurs from the students.', say('Pay attention. That was the easy part.')),
      )),
      lessonTime(25, random(
        'The professor demonstrates how aetheric resonance differs from simple galvanic current, her hands tracing patterns in the charged air.',
        'You take careful notes as the professor explains the three Laws of Aetheric Conduction, scratching diagrams into your notebook.',
        'A complex diagram of aetheric flow channels fills the blackboard. You copy it down, trying to follow the cascading logic.',
      )),
      lessonTime(50, random(
        'Students take turns attempting to channel a small aetheric current through a crystal matrix. Yours flickers uncertainly before stabilising.',
        'The professor passes around samples of charged aetherstone. You feel a faint tingling warmth as you hold your piece up to the light.',
        'You work through a set of practice calculations, converting between aetheric potentials and resonance frequencies.',
      )),
      lessonTime(75, random(
        'The professor dismisses the class with a reminder to review chapter four before the next session. You gather your notes, your mind buzzing with new concepts.',
        seq('As the lesson ends, the professor extinguishes the demonstration apparatus with a wave of her hand.', say('Practice your focusing exercises.'), 'Students begin to leave.'),
        'The crystal spheres are carefully packed away as the lecture concludes. You feel you understand the fundamentals a little better now.',
      ), run('endLesson')),
    ),
  },
  'lesson-basic-mechanics': {
    lateArrival: random(
      seq('Professor Greaves looks up from the workbench and grunts.', say('You\'re late. Grab your tools and catch up. I won\'t be repeating myself.')),
      seq('The instructor gives you a hard look as you enter.', say('In a real workshop, late means someone else gets your job. Sit down.')),
      seq('Greaves shakes his head as you take your seat.', say('Punctuality is a form of precision. Remember that.')),
    ),
    body: scenes(
      lessonTime(0, random(
        seq('The workshop master, a stocky man with oil-stained hands, gestures at the partially disassembled engine on the central bench.', say('Right then. Let\'s see what makes her tick.')),
        seq('Gears and springs are laid out in precise rows on the workbench. The instructor picks up a brass cog and holds it to the light.', say('Every tooth matters.')),
        seq('The instructor wheels in a complex clockwork assembly on a trolley, its exposed mechanisms gleaming.', say('Today we get practical.')),
      )),
      lessonTime(25, random(
        'You learn to identify the key components of a differential steam regulator, tracing the flow of pressure through its chambers.',
        'The instructor walks you through the principles of gear ratios, demonstrating with a set of interlocking brass wheels.',
        'A detailed cross-section diagram is projected onto the wall. You follow along as the instructor explains each valve and piston.',
      )),
      lessonTime(50, random(
        'You carefully disassemble a small clockwork mechanism, laying out each piece in order. Putting it back together is the real test.',
        'Working in pairs, you attempt to calibrate a pressure gauge. It takes several tries before the needle settles in the correct range.',
        'You oil and adjust a set of miniature gears, learning to feel when the tolerances are right by the smoothness of the rotation.',
      )),
      lessonTime(75, random(
        'The instructor calls time and you wipe the oil from your hands with a rag. Your fingers ache pleasantly from the precise work.',
        seq('Tools are returned to their racks as the session ends. The instructor nods approvingly at your workbench.', say('Not bad for a beginner.')),
        'You pack away your tools, satisfied with the small mechanism now ticking steadily on your bench. The fundamentals are starting to click.',
      ), run('endLesson')),
    ),
  },
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

  /** Attend the next available lesson. Moves to classroom and routes to early/on-time/late. */
  attendLesson: (g: Game) => {
    const next = getNextLesson(g)
    if (!next) {
      g.add('There are no lessons to attend right now.')
      return
    }

    const quest = g.player.cards.find(c => c.id === next.id)
    if (!quest) return

    const timing = TIMETABLE[next.id]
    const lesson = LESSONS[next.id]
    const beginParams = { lessonId: next.id, startHour: next.slot.startHour, npcId: timing?.npc }
    const body = lesson?.body

    if (g.hourOfDay < next.slot.startHour) {
      // Early — show arrival text and offer choices that all lead into the lesson
      g.run('move', { location: 'classroom' })
      g.add(EARLY_ARRIVAL_FLAVOUR[Math.floor(Math.random() * EARLY_ARRIVAL_FLAVOUR.length)])
      g.add({ type: 'text', text: `${next.name} begins at ${formatHour(next.slot.startHour)}.`, color: '#d0b691' })
      g.run(seq(
        choice(
          branch('Wait quietly',
            timeUntil(next.slot.startHour),
            'You sit quietly and wait, watching students file in as the start time approaches.',
            'The lecturer arrives and begins setting up.',
          ),
          branch('Study your notes',
            timeUntil(next.slot.startHour),
            'You review your notes from previous sessions, refreshing the key concepts in your mind.',
            'The lecturer arrives and begins setting up.',
          ),
          branch('Chat with classmates',
            timeUntil(next.slot.startHour),
            'You chat with nearby students, swapping impressions of the course and comparing notes.',
            'The lecturer arrives and begins setting up.',
          ),
        ),
        run('lessonBegin', beginParams),
        ...(body ? [body] : []),
      ))
    } else if (g.hourOfDay <= next.slot.startHour + 0.25) {
      // On time
      g.run('move', { location: 'classroom' })
      g.run('lessonBegin', beginParams)
      if (body) g.run(body)
    } else {
      // Late
      g.run('move', { location: 'classroom' })
      g.run('lessonLateStart', beginParams)
    }
  },

  /**
   * Auto-start a lesson when the player is already in the classroom at start time.
   * Sets game time to the exact start hour so the lesson begins cleanly.
   */
  lessonAutoStart: (g: Game, p: Record<string, unknown>) => {
    const startHour = p.startHour as number
    const lessonName = p.lessonName as string

    if (g.hourOfDay > startHour) {
      const d = g.date
      d.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0)
      g.time = Math.floor(d.getTime() / 1000)
    }

    g.add(`The ${lessonName} lecture is about to begin.`)
    g.addOption(['lessonBeginAndRun', p], 'Start Lesson')
  },

  /** Conditional lesson segment. Runs body if fewer than `minutes` have elapsed since lesson start.
   *  When skipped (time already past), produces no content — advanceScene auto-skips. */
  lessonTime: (g: Game, p: Record<string, unknown>) => {
    const minutes = (p.minutes as number) ?? 0
    const body = p.body as Instruction[] | undefined
    const quest = g.player.cards.find(c => c.inLesson)
    const lessonStart = quest?.lessonStart as number | undefined
    if (!lessonStart || !body) return

    const elapsedMinutes = (g.time - lessonStart) / 60
    if (elapsedMinutes >= minutes) return // skip — already past this segment

    // Timelapse to this segment's start point
    const gap = minutes - Math.floor(elapsedMinutes)
    if (gap > 0) g.timeLapse(gap)

    // Execute segment content
    for (const instr of body) {
      g.run(instr)
    }
  },

  /** Set up lesson state: store context on quest card, mark in-progress, move professor. */
  lessonBegin: (g: Game, p: Record<string, unknown>) => {
    const lessonId = p.lessonId as string
    const npcId = p.npcId as string | undefined
    const startHour = p.startHour as number

    const quest = g.player.cards.find(c => c.id === lessonId)
    if (!quest) return

    quest.inLesson = true
    quest.npcId = npcId
    quest.startHour = startHour

    // Store scheduled start as unix timestamp for lessonTime
    const startTime = slotStartTime(g, startHour)
    quest.lessonStart = startTime
    quest.lastAttended = startTime

    if (npcId) {
      const prof = g.getNPC(npcId)
      prof.location = 'classroom'
      g.scene.npc = npcId
    }
  },

  /** Combined begin + run body for auto-start (single option target). */
  lessonBeginAndRun: (g: Game, p: Record<string, unknown>) => {
    const lessonId = p.lessonId as string
    g.run('lessonBegin', p)
    const lesson = LESSONS[lessonId]
    if (lesson?.body) g.run(lesson.body)
  },

  /**
   * Late start — the player arrives after the lesson has begun.
   * Shows scolding, then runs the same lesson body (elapsed segments auto-skip).
   */
  lessonLateStart: (g: Game, p: Record<string, unknown>) => {
    const lessonId = p.lessonId as string
    const lesson = LESSONS[lessonId]

    // Set up lesson state (stores lessonStart for lessonTime)
    g.run('lessonBegin', p)

    // Scolding — use lesson-specific or generic fallback
    const lateScript = lesson?.lateArrival ?? random(...LATE_ARRIVAL_GENERIC)
    g.run(lateScript)

    g.add({ type: 'text', text: 'You take your seat and try to follow along.', color: '#d0b691' })

    // Run the full lesson body — elapsed lessonTime segments auto-skip
    if (lesson?.body) g.run(lesson.body)
  },

  /** Lesson cleanup: timeLapse to end, clear flags, increment attendance. */
  endLesson: (g: Game) => {
    const quest = g.player.cards.find(c => c.inLesson)
    if (!quest) return

    const startHour = quest.startHour as number
    const npcId = quest.npcId as string | undefined

    // Catch up to the scheduled end time in case phases drifted
    const endHour = startHour + LESSON_DURATION / 60
    g.run('timeLapse', { untilTime: endHour })

    // Clear in-progress flag and increment attendance
    quest.inLesson = false
    quest.attended = ((quest.attended as number) ?? 0) + 1

    // Release the professor back to their normal schedule
    if (npcId) {
      const prof = g.getNPC(npcId)
      const profDef = prof.template
      if (profDef.onMove) g.run(profDef.onMove)
      g.scene.npc = undefined
    }
  },
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerCardDefinition('lesson-basic-aetherics', basicAethericsLesson)
registerCardDefinition('lesson-basic-mechanics', basicMechanicsLesson)
makeScripts(lessonScripts)
