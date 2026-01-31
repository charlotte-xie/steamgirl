import { Game } from '../model/Game'
import type { Instruction } from '../model/Scripts'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import {
  text,
  say,
  option,
  move,
  discoverLocation,
  timeUntil,
  completeQuest,
  time,
  addStat,
  eatFood,
  random,
  run,
  registerDslScript,
  seq,
} from '../model/ScriptDSL'
import { freshenUp } from './Effects'
import { publicChecks, staffDecencyGate, decencyCheck } from './Public'
import { getNextLesson, getLessonInProgress, TIMETABLE } from './school/Lessons'

/** Collect unique professor NPC IDs from the timetable. */
const PROFESSOR_NPCS = [...new Set(Object.values(TIMETABLE).map(t => t.npc))]

/** Professors without timetable classes who appear on campus. */
const CAMPUS_NPCS = ['prof-nicholas-denver', 'prof-eleanor-hurst']

// ============================================================================
// INDECENCY GATES
// ============================================================================

const hallwayGate = staffDecencyGate(40, 'school', [
  seq('A university administrator blocks your path in the corridor.', say('I beg your pardon — you cannot walk around the university dressed like that. Leave the premises at once.')),
  seq('A porter steps out of his lodge and holds up a hand.', say('Not a chance. You\'re not coming through here like that. Out. Now.')),
  seq('A stern-faced professor stops dead in the corridor and stares.', say('This is an institution of learning, not a — get out. Immediately.')),
])

const greatHallGate = staffDecencyGate(40, 'hallway', [
  seq('Every head in the Great Hall turns as you enter. A porter hurries over, red-faced.', say('You can\'t be in here like that! Back to the corridors — and for heaven\'s sake, sort yourself out.')),
  seq('The hum of conversation dies as students stare. A dining hall attendant rushes to intercept you.', say('Out. Please. You\'re causing a scene.')),
])

const libraryGate = staffDecencyGate(40, 'courtyard', [
  seq('The librarian looks up from her desk and her eyes go wide. She removes her spectacles with deliberate calm.', say('Get. Out. Of my library.')),
  seq('A sharp "Shh!" cuts through the silence — but it\'s not about the noise. The librarian points firmly at the door.', say('Not in here. Not dressed like that.')),
])

const lessonDecencyCheck = decencyCheck(40, 'You can\'t attend a lesson dressed like that. The professor would send you straight out.')

// ============================================================================
// LOCATION DEFINITIONS
// ============================================================================

const SCHOOL_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  hallway: {
    name: 'University Hallways',
    description: 'The central corridors of the university, connecting all the main areas.',
    image: '/images/institute.jpg',
    secret: true, // Starts as undiscovered - must be unlocked through induction
    links: [
      { dest: 'school', time: 2, label: 'Exit University' },
      { dest: 'great-hall', time: 2 },
      { dest: 'classroom', time: 2 },
      { dest: 'courtyard', time: 2 },
      { dest: 'university-toilets', time: 1, label: 'Toilets' },
    ],
    onArrive: hallwayGate,
    activities: [
      {
        name: 'Attend Lesson',
        symbol: '📖',
        label: 'Attend Lesson',
        script: (g: Game) => g.run('attendLesson', {}),
        condition: (g: Game) => !!getNextLesson(g),
        checkAccess: lessonDecencyCheck,
      },
    ],
  },
  'great-hall': {
    name: 'Great Hall',
    description: 'The grand dining hall of the university, where students gather for meals.',
    image: '/images/great-hall.jpg',
    links: [
      { dest: 'hallway', time: 2 },
    ],
    onArrive: greatHallGate,
    activities: [
      {
        name: 'Socialise in Great Hall',
        symbol: '♣',
        script: (g: Game) => g.run(seq(...socialiseGreatHall)),
        condition: (g: Game) => g.hourOfDay >= 7 && g.hourOfDay < 20,
      },
      {
        name: 'Breakfast in Great Hall',
        symbol: '☕',
        script: (g: Game) => g.run(seq(...breakfastGreatHall)),
        condition: (g: Game) => g.hourOfDay >= 7 && g.hourOfDay < 9,
      },
      {
        name: 'Lunch in Great Hall',
        symbol: '🍽',
        script: (g: Game) => g.run(seq(...lunchGreatHall)),
        condition: (g: Game) => g.hourOfDay >= 12 && g.hourOfDay < 14,
      },
    ],
  },
  classroom: {
    name: 'Classroom',
    description: 'A lecture hall where students learn the mechanical arts and steam engineering.',
    image: '/images/classroom.jpg',
    links: [
      { dest: 'hallway', time: 2 },
    ],
    onArrive: (g: Game) => {
      for (const id of PROFESSOR_NPCS) g.getNPC(id)
      // If the player walks into the classroom during a lesson, force late start
      const inProgress = getLessonInProgress(g)
      if (inProgress) {
        const timing = TIMETABLE[inProgress.id]
        g.run('lessonLateStart', {
          lessonId: inProgress.id,
          lessonName: inProgress.name,
          startHour: inProgress.slot.startHour,
          npcId: timing?.npc,
        })
      }
    },
    onWait: (g: Game) => {
      // If a lesson starts while the player is waiting in the classroom, auto-start
      const inProgress = getLessonInProgress(g)
      if (inProgress) {
        const timing = TIMETABLE[inProgress.id]
        g.run('lessonAutoStart', {
          lessonId: inProgress.id,
          lessonName: inProgress.name,
          startHour: inProgress.slot.startHour,
          npcId: timing?.npc,
        })
      }
    },
    activities: [
      {
        name: 'Attend Lesson',
        symbol: '📖',
        label: 'Attend Lesson',
        script: (g: Game) => g.run('attendLesson', {}),
        condition: (g: Game) => !!getNextLesson(g),
        checkAccess: lessonDecencyCheck,
      },
    ],
  },
  courtyard: {
    name: 'Courtyard',
    description: 'An open courtyard within the university, where professors take their tea breaks.',
    image: '/images/courtyard.jpg',
    links: [
      { dest: 'hallway', time: 2 },
      { dest: 'library', time: 2 },
    ],
    onArrive: (g: Game) => {
      for (const id of PROFESSOR_NPCS) g.getNPC(id)
      for (const id of CAMPUS_NPCS) g.getNPC(id)
    },
    activities: [
      {
        name: 'Socialise in Courtyard',
        symbol: '♣',
        script: (g: Game) => g.run(seq(...socialiseCourtyard)),
      },
    ],
    onTick: publicChecks(8, 18),
  },
  library: {
    name: 'Library',
    description: 'A quiet, high-ceilinged room lined with shelves of leather-bound volumes and brass reading lamps.',
    image: '/images/classroom.jpg',
    links: [
      { dest: 'courtyard', time: 2 },
    ],
    onArrive: (g: Game) => {
      libraryGate(g)
      if (g.currentLocation !== 'library') return
      for (const id of CAMPUS_NPCS) g.getNPC(id)
    },
    activities: [
      {
        name: 'Study in the Library',
        symbol: '📖',
        script: (g: Game) => g.run(seq(...studyLibrary)),
      },
    ],
  },
  'university-toilets': {
    name: 'Toilets',
    description: 'A clean, tiled washroom with brass taps and a row of porcelain basins.',
    image: '/images/lowtown/ladies.jpg',
    links: [
      { dest: 'hallway', time: 1 },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
    ],
  },
}

// ============================================================================
// ACTIVITY SCRIPTS (DSL)
// ============================================================================

const socialiseGreatHall: Instruction[] = [
  time(30),
  text('You mingle with other students in the Great Hall.'),
  addStat('Mood', 1, { max: 80, chance: 0.5 }),
]

const breakfastGreatHall: Instruction[] = [
  time(15),
  text('You have breakfast in the Great Hall.'),
  eatFood(100),
]

const lunchGreatHall: Instruction[] = [
  time(30),
  text('You have lunch in the Great Hall.'),
  eatFood(100),
]

const studyLibrary: Instruction[] = [
  time(60),
  text('You spend an hour studying in the library.'),
  random(
    addStat('Aetherics', 1),
    addStat('Mechanics', 1),
  ),
]

const socialiseCourtyard: Instruction[] = [
  time(30),
  text('You chat with others in the courtyard.'),
  addStat('Mood', 1, { max: 80, chance: 0.5 }),
]

// ============================================================================
// UNIVERSITY INDUCTION SCRIPTS (DSL)
// ============================================================================

// Scene 1: Start induction at university grounds
const universityInduction: Instruction[] = [
  text('You approach the university administration office, where a stern-looking administrator with mechanical spectacles reviews your acceptance letter.'),
  say('Ah, you\'re the new student. Welcome to the University of Aetheria. Your induction begins now.'),
  text('She leads you through the grand entrance.'),
  discoverLocation('hallway'),
  option('Follow the Administrator', 'inductionHallway'),
]

// Scene 2: Move to hallway
const inductionHallway: Instruction[] = [
  move('hallway'),
  text('You step into the university hallways. The corridors stretch before you, lined with brass fixtures and mechanical displays.'),
  say('These are the main hallways. They connect all the important areas of the university.'),
  text('As you walk, you notice the intricate clockwork mechanisms embedded in the walls, the gentle hum of steam pipes, and the scholarly atmosphere that permeates every corner.'),
  option('Continue the Tour', 'inductionGreatHall'),
]

// Scene 3: Move to great hall
const inductionGreatHall: Instruction[] = [
  move('great-hall'),
  text('The administrator leads you into the Great Hall. The dining hall stretches before you, with long tables and brass chandeliers overhead.'),
  say('This is where students gather for meals. Breakfast, lunch, and dinner are served here daily. It\'s also a popular place for students to socialise and discuss their studies.'),
  text('You can see steam-powered serving mechanisms moving along tracks on the ceiling, ready to deliver meals to the tables below.'),
  option('Continue the Tour', 'inductionClassroom'),
]

// Scene 4: Move to classroom
const inductionClassroom: Instruction[] = [
  move('classroom'),
  text('Next, the administrator shows you a lecture hall. Rows of desks face a brass lectern and mechanical projection devices.'),
  say('This is where you\'ll attend lectures on the mechanical arts, steam engineering, and clockwork theory. Pay attention during your classes — knowledge here is both practical and essential.'),
  text('The walls are lined with diagrams of complex mechanisms, and you can see various steam-powered teaching aids ready for demonstrations.'),
  option('Finish the Tour', 'inductionComplete'),
]

// Scene 5: Complete induction back in hallway
const inductionComplete: Instruction[] = [
  move('hallway'),
  text('The administrator brings you back to the main hallways.'),
  say('You now have full access to the university facilities. Remember, the university is open Monday through Friday, from 7am to 9pm. Make the most of your time here.'),
  say('The courtyard is also available for relaxation between classes. Explore at your leisure — these halls are now yours to use.'),
  text('With that, she hands you a small brass key and departs, leaving you to explore the university on your own.'),
  timeUntil(10.25),
  completeQuest('attend-university'),
  run('enrollLessons'),
]

// ============================================================================
// REGISTRATION
// ============================================================================

// Register all DSL scripts
registerDslScript('universityInduction', universityInduction)
registerDslScript('inductionHallway', inductionHallway)
registerDslScript('inductionGreatHall', inductionGreatHall)
registerDslScript('inductionClassroom', inductionClassroom)
registerDslScript('inductionComplete', inductionComplete)

// Register all location definitions
Object.entries(SCHOOL_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
