/**
 * special.ts - School uniform pieces and cursed/unique items.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

// ============================================================================
// SCHOOL UNIFORM
// ============================================================================

registerItemDefinition(
  'school-blazer',
  extendItem('base-outerwear', {
    name: 'school blazer',
    description:
      'A navy blue blazer with the university crest embroidered on the breast pocket. Standard issue for students.',
    calcStats: (player) => {
      player.modifyStat('Etiquette', 2)
    },
  })
)

registerItemDefinition(
  'school-necktie',
  extendItem('base-necktie', {
    name: 'school necktie',
    description: 'A striped necktie in the university colours of navy and gold.',
    calcStats: (player) => {
      player.modifyStat('Etiquette', 1)
    },
  })
)

registerItemDefinition(
  'school-skirt',
  extendItem('base-bottom', {
    name: 'school skirt',
    description:
      'A navy blue pleated skirt that falls just below the knee. Part of the standard uniform.',
    calcStats: (player) => {
      player.modifyStat('Etiquette', 1)
    },
  })
)

registerItemDefinition(
  'school-socks',
  extendItem('base-socks', {
    name: 'school socks',
    description:
      'Knee-high white socks with red and white stripes. Standard issue for students.',
  })
)

// ============================================================================
// CURSED ITEMS
// ============================================================================

registerItemDefinition(
  'gloves-cursed',
  extendItem('base-gloves', {
    name: 'elegant black gloves',
    description:
      'Exquisitely crafted gloves of supple black leather. They seem to shimmer with an unnatural darkness. Once worn, you feel an unsettling compulsion to keep them on...',
    calcStats: (player) => {
      player.modifyStat('Charm', 5)
      player.modifyStat('Willpower', -10)
    },
    onWorn: (_player, item) => {
      // Lock the gloves when worn - they're cursed!
      item.locked = true
    },
  })
)
