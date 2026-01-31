/**
 * outerwear.ts - Corsets, jackets, and coats.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

registerItemDefinition(
  'corset-leather',
  extendItem('base-corset', {
    name: 'leather corset',
    description:
      'A structured leather corset with brass buckles and intricate stitching. Cinches the waist dramatically.',
    calcStats: (player) => {
      player.modifyStat('Agility', -3)
      player.modifyStat('appearance', 5)
    },
  })
)

registerItemDefinition(
  'corset-suede',
  extendItem('base-corset', {
    name: 'suede corset',
    description:
      'A soft brown suede corset with subtle brass lacing. Flattering but comfortable.',
    image: '/images/steamgirl/Corset.PNG',
    calcStats: (player) => {
      player.modifyStat('Agility', -1)
      player.modifyStat('appearance', 2)
    },
  })
)

registerItemDefinition(
  'jacket-aviator',
  extendItem('base-outerwear', {
    name: 'aviator jacket',
    description:
      'A rugged leather jacket lined with fleece. Built for high altitudes and adventure.',
    calcStats: (player) => {
      player.modifyStat('Agility', 3)
      player.modifyStat('Willpower', 2)
    },
  })
)

registerItemDefinition(
  'coat-velvet',
  extendItem('base-outerwear', {
    name: 'velvet coat',
    description:
      'A rich burgundy velvet coat with brass buttons and embroidered cuffs.',
    calcStats: (player) => {
      player.modifyStat('appearance', 3)
    },
  })
)
