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
  timeLapseUntil,
  completeQuest,
  timeLapse,
  addStat,
  recordTime,
  random,
  registerDslScript,
  execAll,
} from '../model/ScriptDSL'

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
    ],
  },
  'great-hall': {
    name: 'Great Hall',
    description: 'The grand dining hall of the university, where students gather for meals.',
    image: '/images/great-hall.jpg',
    links: [
      { dest: 'hallway', time: 2 },
    ],
    activities: [
      {
        name: 'Socialise in Great Hall',
        symbol: '♣',
        script: (g: Game) => execAll(g, socialiseGreatHall),
        condition: (g: Game) => g.hourOfDay >= 7 && g.hourOfDay < 20,
      },
      {
        name: 'Breakfast in Great Hall',
        symbol: '☕',
        script: (g: Game) => execAll(g, breakfastGreatHall),
        condition: (g: Game) => g.hourOfDay >= 7 && g.hourOfDay < 9,
      },
      {
        name: 'Lunch in Great Hall',
        symbol: '🍽',
        script: (g: Game) => execAll(g, lunchGreatHall),
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
    activities: [
      {
        name: 'Study in classroom',
        symbol: '📖',
        script: (g: Game) => execAll(g, studyClassroom),
      },
    ],
  },
  courtyard: {
    name: 'Courtyard',
    description: 'An open courtyard within the university, where professors take their tea breaks.',
    image: '/images/courtyard.jpg',
    links: [
      { dest: 'hallway', time: 2 },
    ],
    activities: [
      {
        name: 'Socialise in Courtyard',
        symbol: '♣',
        script: (g: Game) => execAll(g, socialiseCourtyard),
      },
    ],
  },
}

// ============================================================================
// ACTIVITY SCRIPTS (DSL)
// ============================================================================

const socialiseGreatHall: Instruction[] = [
  timeLapse(30),
  text('You mingle with other students in the Great Hall.'),
  addStat('Mood', 1, { max: 80, chance: 0.5 }),
]

const breakfastGreatHall: Instruction[] = [
  timeLapse(15),
  text('You have breakfast in the Great Hall.'),
  recordTime('lastEat'),
]

const lunchGreatHall: Instruction[] = [
  timeLapse(30),
  text('You have lunch in the Great Hall.'),
  recordTime('lastEat'),
]

const studyClassroom: Instruction[] = [
  timeLapse(60),
  text('You spend an hour studying in the classroom.'),
  random(
    addStat('Aetherics', 1),
    addStat('Mechanics', 1),
  ),
]

const socialiseCourtyard: Instruction[] = [
  timeLapse(30),
  text('You chat with others in the courtyard.'),
  addStat('Mood', 1, { max: 80, chance: 0.5 }),
]

// ============================================================================
// UNIVERSITY INDUCTION SCRIPTS (DSL)
// ============================================================================

// Scene 1: Start induction at university grounds
const universityInduction: Instruction[] = [
  text('You approach the university administration office, where a stern-looking administrator with mechanical spectacles reviews your acceptance letter.'),
  say('"Ah, you\'re the new student," she says, her voice carrying the precision of well-oiled gears. "Welcome to the University of Aetheria. Your induction begins now."'),
  say('"Follow me, and I\'ll show you the facilities." She leads you through the grand entrance.'),
  discoverLocation('hallway'),
  option('inductionHallway', {}, 'Follow the Administrator'),
]

// Scene 2: Move to hallway
const inductionHallway: Instruction[] = [
  move('hallway'),
  text('You step into the university hallways. The corridors stretch before you, lined with brass fixtures and mechanical displays.'),
  say('"These are the main hallways," the administrator explains. "They connect all the important areas of the university."'),
  text('As you walk, you notice the intricate clockwork mechanisms embedded in the walls, the gentle hum of steam pipes, and the scholarly atmosphere that permeates every corner.'),
  option('inductionGreatHall', {}, 'Continue the Tour'),
]

// Scene 3: Move to great hall
const inductionGreatHall: Instruction[] = [
  move('great-hall'),
  text('The administrator leads you into the Great Hall. The dining hall stretches before you, with long tables and brass chandeliers overhead.'),
  say('"This is where students gather for meals," she explains. "Breakfast, lunch, and dinner are served here daily. It\'s also a popular place for students to socialize and discuss their studies."'),
  text('You can see steam-powered serving mechanisms moving along tracks on the ceiling, ready to deliver meals to the tables below.'),
  option('inductionClassroom', {}, 'Continue the Tour'),
]

// Scene 4: Move to classroom
const inductionClassroom: Instruction[] = [
  move('classroom'),
  text('Next, the administrator shows you a lecture hall. Rows of desks face a brass lectern and mechanical projection devices.'),
  say('"This is where you\'ll attend lectures on the mechanical arts, steam engineering, and clockwork theory," she says. "Pay attention during your classes—knowledge here is both practical and essential."'),
  text('The walls are lined with diagrams of complex mechanisms, and you can see various steam-powered teaching aids ready for demonstrations.'),
  option('inductionComplete', {}, 'Finish the Tour'),
]

// Scene 5: Complete induction back in hallway
const inductionComplete: Instruction[] = [
  move('hallway'),
  text('The administrator brings you back to the main hallways.'),
  say('"You now have full access to the university facilities," she continues. "Remember, the university is open Monday through Friday, from 7am to 9pm. Make the most of your time here."'),
  say('"The courtyard is also available for relaxation between classes. Explore at your leisure—these halls are now yours to use."'),
  text('With that, she hands you a small brass key and departs, leaving you to explore the university on your own.'),
  timeLapseUntil(10.25),
  completeQuest('attend-university'),
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
