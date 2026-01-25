/**
 * items/index.ts - Central import point for all item definitions.
 *
 * Import order matters: base templates must be registered before
 * items that extend them.
 */

// Base templates first (other items extend these)
import './base-templates'

// Specific item categories (alphabetical)
import './accessories'
import './components'
import './dresses'
import './footwear'
import './headwear'
import './legwear'
import './outerwear'
import './special'
import './torso'
import './undergarments'
