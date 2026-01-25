/**
 * footwear.ts - Boots, shoes, stockings, and socks.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

// ============================================================================
// STOCKINGS & SOCKS (under layer)
// ============================================================================

registerItemDefinition(
  'stockings-long',
  extendItem('base-stockings', {
    name: 'long stockings',
    description: 'White cotton stockings that reach above the knee.',
  })
)

registerItemDefinition(
  'stockings-silk',
  extendItem('base-stockings', {
    name: 'silk stockings',
    description: 'Sheer silk stockings with a subtle sheen. Luxurious against the skin.',
    calcStats: (player) => {
      player.modifyStat('Charm', 2)
    },
  })
)

// ============================================================================
// BOOTS & SHOES (inner layer)
// ============================================================================

registerItemDefinition(
  'boots-leather',
  extendItem('base-footwear', {
    name: 'leather boots',
    description: 'Sturdy leather boots with brass buckles. Practical for any occasion.',
    calcStats: (player) => {
      player.modifyStat('Agility', 2)
    },
  })
)

registerItemDefinition(
  'boots-heeled',
  extendItem('base-footwear', {
    name: 'heeled boots',
    description: 'Elegant boots with a modest heel and delicate button closures.',
    calcStats: (player) => {
      player.modifyStat('Charm', 3)
      player.modifyStat('Agility', -1)
    },
  })
)

registerItemDefinition(
  'shoes-dancing',
  extendItem('base-footwear', {
    name: 'dancing shoes',
    description: 'Lightweight shoes with flexible soles, perfect for dancing.',
    calcStats: (player) => {
      player.modifyStat('Dancing', 5)
      player.modifyStat('Agility', 2)
    },
  })
)

registerItemDefinition(
  'boots-work',
  extendItem('base-footwear', {
    name: 'work boots',
    description: 'Heavy-duty boots with steel toe caps. Essential for factory work.',
    calcStats: (player) => {
      player.modifyStat('Strength', 2)
    },
  })
)
