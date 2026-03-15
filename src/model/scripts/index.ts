/**
 * Core script registration — import this module for side effects to ensure
 * all core scripts are registered before the game runs.
 *
 * This must NOT be imported from Scripts.ts (circular dependency).
 * Instead, it is imported from Game.ts or story/World.ts.
 */

import './gameActions'
import './controlFlow'
import './predicates'
import './content'
import './cards'
import './playerActions'
import './npcAI'
