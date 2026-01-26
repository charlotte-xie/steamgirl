import { Game } from '../../model/Game'
import { registerNPC } from '../../model/NPC'
import type { ScheduleEntry } from '../../model/NPC'
import { TIMETABLE } from './Lessons'

// ============================================================================
// SCHEDULE UTILITIES
// ============================================================================

/** Weekday numbers for schedule entries (Mon–Fri). */
const WEEKDAYS = [1, 2, 3, 4, 5]

/**
 * Build the full schedule for a professor. Merges timetable classroom slots
 * (with per-day filters) ahead of the base schedule entries (tagged as
 * weekday-only). Classroom entries are prepended so they take priority in
 * followSchedule (which returns on the first match).
 *
 * The resulting schedule is static and can be built once at registration time.
 */
function buildProfessorSchedule(
  npcId: string,
  baseSchedule: ScheduleEntry[],
): ScheduleEntry[] {
  const classroomSlots: ScheduleEntry[] = []

  for (const timing of Object.values(TIMETABLE)) {
    if (timing.npc !== npcId) continue
    for (const slot of timing.slots) {
      classroomSlots.push([slot.startHour, Math.ceil(slot.endHour), 'classroom', [slot.day]])
    }
  }

  // Tag base entries as weekday-only (if not already tagged)
  const weekdayBase: ScheduleEntry[] = baseSchedule.map(
    ([start, end, loc, days]) => [start, end, loc, days ?? WEEKDAYS],
  )

  // Classroom slots first so they override the base schedule
  return [...classroomSlots, ...weekdayBase]
}

/**
 * Build an onMove hook for a professor. The full schedule (including
 * timetable classroom slots) is built once at registration time.
 * On weekends, no entries match so followSchedule sets location to null.
 */
function professorOnMove(
  npcId: string,
  baseSchedule: ScheduleEntry[],
): (game: Game) => void {
  const schedule = buildProfessorSchedule(npcId, baseSchedule)
  return (game: Game) => {
    game.getNPC(npcId).followSchedule(game, schedule)
  }
}

// ============================================================================
// PROFESSOR: LUCIENNE VAEL (Basic Aetherics)
// ============================================================================

registerNPC('prof-lucienne-vael', {
  name: 'Professor Vael',
  uname: 'a tall woman in a copper-trimmed coat',
  description: 'Professor Lucienne Vael teaches Basic Aetherics. Tall and sharp-featured, she wears brass spectacles and a copper-trimmed coat over a high-collared blouse. Her hands are perpetually stained with aetheric residue — a faint luminous blue that no amount of scrubbing removes. She speaks precisely, expects focus, and has little patience for daydreaming.',
  image: '/images/npcs/prof-vael.jpg',
  speechColor: '#a8c4e0',
  generate: (_game: Game, npc) => {
    npc.nameKnown = 1 // professors are known by default
  },
  onMove: professorOnMove('prof-lucienne-vael', [
    [14, 17, 'lake', [2]],      // Tuesday afternoon: walks by the lake
    [8, 17, 'courtyard'],
  ]),
  onApproach: (game: Game) => {
    const npc = game.npc
    game.add('Professor Vael looks up from a sheaf of notes covered in luminous diagrams.')
    npc.say('"Yes? Do you have a question about the coursework?"')
    npc.leaveOption('"Never mind, Professor."', '"Hmm. Well, come back if you think of something."')
  },
})

// ============================================================================
// PROFESSOR: HARLAND GREAVES (Basic Mechanics)
// ============================================================================

registerNPC('prof-harland-greaves', {
  name: 'Professor Greaves',
  uname: 'a stocky man with oil-stained hands',
  description: 'Professor Harland Greaves teaches Basic Mechanics. A stocky, barrel-chested man with permanently oil-stained hands and a leather apron worn over his waistcoat. He speaks in a gruff Lowtown accent, demonstrating with tools rather than words whenever possible. Demanding but fair, he believes that the only way to learn engineering is to get your hands dirty.',
  image: '/images/npcs/prof-greaves.jpg',
  speechColor: '#d4a86a',
  generate: (_game: Game, npc) => {
    npc.nameKnown = 1 // professors are known by default
  },
  onMove: professorOnMove('prof-harland-greaves', [
    [9, 13, 'market', [3]],     // Wednesday morning: browsing tools at the market
    [8, 17, 'courtyard'],
  ]),
  onApproach: (game: Game) => {
    const npc = game.npc
    game.add('Professor Greaves wipes his hands on a rag and gives you a direct look.')
    npc.say('"Need something? If it\'s about the coursework, speak up."')
    npc.leaveOption('"Nothing, sir. Sorry to bother you."', '"No bother. Just don\'t stand around idle — there\'s always something to fix."')
  },
})

// ============================================================================
// PROFESSOR: NICHOLAS DENVER (no classes yet)
// ============================================================================

registerNPC('prof-nicholas-denver', {
  name: 'Professor Denver',
  uname: 'a lean man reading a heavy tome',
  description: 'Professor Nicholas Denver is a gaunt, thoughtful man with deep-set eyes and ink-stained fingers. He favours a threadbare tweed jacket over a rumpled waistcoat, and always seems to have a book open somewhere about his person. His field is theoretical aetherics — the mathematics behind the magic — and he can often be found in the library, lost in some obscure monograph. He speaks softly and at length, assuming everyone shares his fascination with the finer points.',
  image: '/images/npcs/prof-denver.jpg',
  speechColor: '#b8a9c9',
  generate: (_game: Game, npc) => {
    npc.nameKnown = 1
  },
  onMove: professorOnMove('prof-nicholas-denver', [
    [17, 20, 'copper-pot-tavern', [4]], // Thursday evening: a quiet pint
    [8, 12, 'library'],
    [12, 14, 'courtyard'],
    [14, 17, 'library'],
  ]),
  onApproach: (game: Game) => {
    const npc = game.npc
    game.add('Professor Denver looks up from a dense page of equations, blinking as though remembering where he is.')
    npc.say('"Ah — yes? Forgive me, I was rather deep in Aldenmere\'s proof of resonance decay. Fascinating, if you have the patience for it."')
    npc.leaveOption('"I\'ll let you get back to it, Professor."', '"Quite right. Where was I..." He is already reading again before you turn away.')
  },
})

// ============================================================================
// PROFESSOR: ELEANOR HURST (no classes yet)
// ============================================================================

registerNPC('prof-eleanor-hurst', {
  name: 'Professor Hurst',
  uname: 'a composed woman with silver-streaked hair',
  description: 'Professor Eleanor Hurst carries herself with quiet authority. Silver-streaked auburn hair is pinned beneath a velvet cap, and she wears a fitted charcoal coat with polished brass buttons. Her field is applied ethics and the philosophy of mechanisation — questions of what should be built, not merely what can be. She is known for sharp questions that leave students reconsidering assumptions they did not know they held.',
  image: '/images/npcs/prof-hurst.jpg',
  speechColor: '#c9a88b',
  generate: (_game: Game, npc) => {
    npc.nameKnown = 1
  },
  onMove: professorOnMove('prof-eleanor-hurst', [
    [14, 17, 'lake', [2]],     // Tuesday afternoon: reflective walk by the lake
    [12, 14, 'market', [4]],   // Thursday lunchtime: browsing the bookstalls
    [9, 12, 'courtyard'],
    [12, 14, 'library'],
    [14, 17, 'courtyard'],
  ]),
  onApproach: (game: Game) => {
    const npc = game.npc
    game.add('Professor Hurst regards you with calm, appraising eyes, her teacup held perfectly still.')
    npc.say('"Good day. Is there something on your mind, or are you simply passing through?"')
    npc.leaveOption('"Just passing through, Professor."', '"Very well. But do consider — why are you passing through? One ought to know." A faint smile crosses her lips.')
  },
})
