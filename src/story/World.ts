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

// Register utility scripts (used by other modules)
import './Utility'

// Register start scripts (depends on Effects and Lodgings)
import './Start'

// Register test NPC (for testing)
import './TestNPC'

// Register location definitions and related content
import './City' // Register city locations
import './Lodgings' // Register lodgings locations and scripts
import './Lowtown' // Register lowtown location and NPCs
import './School' // Register university interior locations

/**
 * This module serves as a central import point for all story content.
 * Importing this file will register all locations, NPCs, cards, and scripts.
 * 
 * Example usage:
 *   import './story/World' // Registers everything
 */
