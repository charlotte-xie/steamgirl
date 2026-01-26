/**
 * World.ts - Central registration point for all story content.
 * 
 * This file imports all story modules to ensure all content (locations, NPCs, cards, scripts)
 * is registered. Import this file instead of individual story files.
 * 
 * Order matters: dependencies should be imported before dependents.
 */

// Register effect definitions first (used by other modules)
import './Effects'

// Register item definitions (used by other modules)
import './items'

// Register utility scripts (used by other modules)
import './Utility'

// Register start scripts (depends on Effects and Lodgings)
import './Start'

// Register test NPC (for testing)
import './TestNPC'

// Register location definitions and related content
import './Subway' // Subway stations (before City/Lowtown so links to them exist)
import './Airport' // Airport and subway-airport (uses subwayLink from Subway)
import './Docks' // Docks and subway-docks (uses subwayLink from Subway)
import './City' // Register city locations
import './Market' // Register market shops and NPCs
import './Lodgings' // Register lodgings locations and scripts
import './Hotel' // Register hotel locations
import './Lowtown' // Register lowtown location and NPCs
import './Tavern' // Register tavern locations and NPCs
import './School' // Register university interior locations
import './school/Lessons' // Register lesson quest cards
import './school/Professors' // Register professor NPCs (depends on Lessons for TIMETABLE)
import './Pier' // Register pier location
import './Industrial' // Register industrial district locations

/**
 * This module serves as a central import point for all story content.
 * Importing this file will register all locations, NPCs, cards, and scripts.
 * 
 * Example usage:
 *   import './story/World' // Registers everything
 */
