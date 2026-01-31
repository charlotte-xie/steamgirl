/**
 * footwear.ts - Boots, shoes, stockings, and socks.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'
import { registerColourVariants } from './colours'

// ============================================================================
// STOCKINGS & SOCKS (under layer)
// ============================================================================

registerItemDefinition(
  'stockings-long',
  extendItem('base-stockings', {
    name: 'long stockings',
    description: 'White cotton stockings that reach above the knee.',
    value: 3,
  })
)

registerItemDefinition(
  'white-socks',
  extendItem('base-socks', {
    name: 'white socks',
    description: 'Plain white cotton socks. Simple and practical.',
    value: 1,
  })
)

registerItemDefinition(
  'stockings-silk',
  extendItem('base-stockings', {
    name: 'silk stockings',
    description: 'Sheer silk stockings with a subtle sheen. Luxurious against the skin.',
    value: 15,
    calcStats: (player) => {
      player.modifyStat('appearance', 2)
    },
  })
)

// ============================================================================
// COLOUR VARIANTS (generated from colour table)
// ============================================================================

registerColourVariants(
  'white-socks', 'socks', 'socks',
  c => `Plain ${c} cotton socks. Simple and practical.`,
  'white-socks',
)

// ============================================================================
// BOOTS & SHOES (inner layer)
// ============================================================================

registerItemDefinition(
  'shoes-plain',
  extendItem('base-footwear', {
    name: 'plain shoes',
    description: 'Simple leather shoes with a low heel. Comfortable and unremarkable.',
    image: '/images/steamgirl/Shoes.PNG',
    value: 8,
  })
)

registerItemDefinition(
  'boots-leather',
  extendItem('base-footwear', {
    name: 'leather boots',
    description: 'Sturdy leather boots with brass buckles. Practical for any occasion.',
    image: '/images/steamgirl/Boots.PNG',
    value: 15,
    calcStats: (player) => {
      player.modifyStat('Dexterity', 2)
    },
  })
)

registerItemDefinition(
  'boots-heeled',
  extendItem('base-footwear', {
    name: 'heeled boots',
    description: 'Elegant boots with a modest heel and delicate button closures.',
    value: 25,
    calcStats: (player) => {
      player.modifyStat('Dexterity', -1)
      player.modifyStat('appearance', 2)
    },
  })
)

registerItemDefinition(
  'shoes-dancing',
  extendItem('base-footwear', {
    name: 'dancing shoes',
    description: 'Lightweight shoes with flexible soles, perfect for dancing.',
    value: 20,
    calcStats: (player) => {
      player.modifyStat('Dancing', 5)
      player.modifyStat('Dexterity', 2)
    },
  })
)

registerItemDefinition(
  'boots-work',
  extendItem('base-footwear', {
    name: 'work boots',
    description: 'Heavy-duty boots with steel toe caps. Essential for factory work.',
    value: 10,
    calcStats: (player) => {
      player.modifyStat('Strength', 2)
    },
  })
)
