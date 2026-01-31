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
    value: 30,
    calcStats: (player) => {
      player.modifyStat('Dexterity', -3)
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
    value: 22,
    calcStats: (player) => {
      player.modifyStat('Dexterity', -1)
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
    value: 35,
    calcStats: (player) => {
      player.modifyStat('Dexterity', 3)
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
    value: 40,
    calcStats: (player) => {
      player.modifyStat('appearance', 3)
    },
  })
)
