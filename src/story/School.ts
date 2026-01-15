import type { LocationId, LocationDefinition } from '../model/Location'

// Location definitions for University interior locations
export const SCHOOL_DEFINITIONS: Record<LocationId, LocationDefinition> = {
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
