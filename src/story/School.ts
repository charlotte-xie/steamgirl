import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import { option } from '../model/Format'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'

// Location definitions for University interior locations
const SCHOOL_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  hallway: {
    name: 'University Hallways',
    description: 'The central corridors of the university, connecting all the main areas.',
    image: '/images/institute.jpg',
    secret: true, // Starts as undiscovered - must be unlocked through induction
    links: [
      { dest: 'school', time: 2 }, // Exit to University grounds (1 minute)
      { dest: 'great-hall', time: 2 }, // 2 minutes to great hall
      { dest: 'classroom', time: 2 }, // 1 minute to classroom
      { dest: 'courtyard', time: 2 }, // 2 minutes to courtyard
    ],
  },
  'great-hall': {
    name: 'Great Hall',
    description: 'The grand dining hall of the university, where students gather for meals.',
    image: '/images/great-hall.jpg',
    links: [
      { dest: 'hallway', time: 2 }, // 2 minutes back to hallway
    ],
  },
  classroom: {
    name: 'Classroom',
    description: 'A lecture hall where students learn the mechanical arts and steam engineering.',
    image: '/images/classroom.jpg',
    links: [
      { dest: 'hallway', time: 2 }, // 1 minute back to hallway
    ],
  },
  courtyard: {
    name: 'University Courtyard',
    description: 'An open courtyard within the university, where professors take their tea breaks.',
    image: '/images/courtyard.jpg',
    links: [
      { dest: 'hallway', time: 2 }, // 2 minutes back to hallway
    ],
  },
}

// University scripts
export const universityScripts = {
  // Scene 1: Start induction at university grounds
  universityInduction: (game: Game, _params: {}) => {
    game.clearScene()
    
    game.add('You approach the university administration office, where a stern-looking administrator with mechanical spectacles reviews your acceptance letter.')
    game.add('"Ah, you\'re the new student," she says, her voice carrying the precision of well-oiled gears. "Welcome to the University of Aetheria. Your induction begins now."')
    game.add('"Follow me, and I\'ll show you the facilities." She leads you through the grand entrance.')
    
    // Discover the hallway location (grants access)
    const hallwayLocation = game.getLocation('hallway')
    hallwayLocation.discovered = true
    
    game.add(option('inductionHallway', {}, 'Follow the Administrator'))
  },
  
  // Scene 2: Move to hallway
  inductionHallway: (game: Game, _params: {}) => {
    game.clearScene()
    
    // Move to hallway
    game.run('move', { location: 'hallway' })
    
    game.add('You step into the university hallways. The corridors stretch before you, lined with brass fixtures and mechanical displays.')
    game.add('"These are the main hallways," the administrator explains. "They connect all the important areas of the university."')
    game.add('As you walk, you notice the intricate clockwork mechanisms embedded in the walls, the gentle hum of steam pipes, and the scholarly atmosphere that permeates every corner.')
    
    game.add(option('inductionGreatHall', {}, 'Continue the Tour'))
  },
  
  // Scene 3: Move to great hall
  inductionGreatHall: (game: Game, _params: {}) => {
    game.clearScene()
    
    // Move to great hall
    game.run('move', { location: 'great-hall' })
    
    game.add('The administrator leads you into the Great Hall. The dining hall stretches before you, with long tables and brass chandeliers overhead.')
    game.add('"This is where students gather for meals," she explains. "Breakfast, lunch, and dinner are served here daily. It\'s also a popular place for students to socialize and discuss their studies."')
    game.add('You can see steam-powered serving mechanisms moving along tracks on the ceiling, ready to deliver meals to the tables below.')
    
    game.add(option('inductionClassroom', {}, 'Continue the Tour'))
  },
  
  // Scene 4: Move to classroom
  inductionClassroom: (game: Game, _params: {}) => {
    game.clearScene()
    
    // Move to classroom
    game.run('move', { location: 'classroom' })
    
    game.add('Next, the administrator shows you a lecture hall. Rows of desks face a brass lectern and mechanical projection devices.')
    game.add('"This is where you\'ll attend lectures on the mechanical arts, steam engineering, and clockwork theory," she says. "Pay attention during your classes—knowledge here is both practical and essential."')
    game.add('The walls are lined with diagrams of complex mechanisms, and you can see various steam-powered teaching aids ready for demonstrations.')
    
    game.add(option('inductionComplete', {}, 'Finish the Tour'))
  },
  
  // Scene 5: Complete induction back in hallway
  inductionComplete: (game: Game, _params: {}) => {
    game.clearScene()
    
    // Move back to hallway
    game.run('move', { location: 'hallway' })
    
    game.add('The administrator brings you back to the main hallways.')
    game.add('"You now have full access to the university facilities," she continues. "Remember, the university is open Monday through Friday, from 7am to 9pm. Make the most of your time here."')
    game.add('"The courtyard is also available for relaxation between classes. Explore at your leisure—these halls are now yours to use."')
    game.add('With that, she hands you a small brass key and departs, leaving you to explore the university on your own.')
    
    // Advance time to 10:15am (10.25 hours)
    game.run('timeLapse', { untilTime: 10.25 })
    
    // Complete the quest
    game.completeQuest('attend-university')
    
  },
}

// Register university scripts when module loads
makeScripts(universityScripts)

// Register all location definitions when module loads
Object.entries(SCHOOL_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
