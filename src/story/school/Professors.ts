import { Game } from '../../model/Game'
import { registerNPC } from '../../model/NPC'
import { TIMETABLE } from './Lessons'

// ============================================================================
// SCHEDULE UTILITIES
// ============================================================================

/** A single followSchedule entry: [startHour, endHour, locationId]. */
type ScheduleEntry = [number, number, string]

/**
 * Merge timetable classroom slots into a professor's base schedule.
 * Classroom entries are prepended so they take priority in followSchedule
 * (which returns on the first match). Professors without timetable entries
 * simply get their base schedule back unchanged.
 *
 * followSchedule uses integer hours, but lesson endHours are fractional
 * (e.g. 12.667 for 12:40). We ceil the endHour so the professor stays in
 * the classroom until the next full hour after the lesson ends.
 */
function buildProfessorSchedule(
  npcId: string,
  day: number,
  baseSchedule: ScheduleEntry[],
): ScheduleEntry[] {
  const classroomSlots: ScheduleEntry[] = []

  for (const timing of Object.values(TIMETABLE)) {
    if (timing.npc !== npcId) continue
    for (const slot of timing.slots) {
      if (slot.day !== day) continue
      classroomSlots.push([slot.startHour, Math.ceil(slot.endHour), 'classroom'])
    }
  }

  // Classroom slots first so they override the base schedule
  return [...classroomSlots, ...baseSchedule]
}

/**
 * Build an onMove hook for a professor. Follows the given base schedule on
 * weekdays (with timetable classroom slots merged in) and goes offscreen
 * at weekends.
 */
function professorOnMove(
  npcId: string,
  baseSchedule: ScheduleEntry[],
): (game: Game) => void {
  return (game: Game) => {
    const npc = game.getNPC(npcId)
    const day = game.date.getDay()
    if (day >= 1 && day <= 5) {
      const schedule = buildProfessorSchedule(npcId, day, baseSchedule)
      npc.followSchedule(game, schedule)
    } else {
      npc.location = null
    }
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
