/**
 * legwear.ts - Skirts and trousers.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

registerItemDefinition(
  'skirt-bustle',
  extendItem('base-bottom', {
    name: 'bustle skirt',
    description:
      'An elaborate skirt with a pronounced bustle and layers of ruffled fabric.',
    calcStats: (player) => {
      player.modifyStat('Charm', 4)
      player.modifyStat('Agility', -2)
    },
  })
)

registerItemDefinition(
  'skirt-practical',
  extendItem('base-bottom', {
    name: 'practical skirt',
    description:
      'A simple A-line skirt of dark wool, hemmed just above the ankle for ease of movement.',
  })
)

registerItemDefinition(
  'skirt-pleated',
  extendItem('base-bottom', {
    name: 'pleated skirt',
    description: 'A navy blue skirt with crisp pleats. Modest and practical.',
    image: '/images/steamgirl/SchoolSkirt.PNG',
    calcStats: (player) => {
      player.modifyStat('Charm', 1)
    },
  })
)

registerItemDefinition(
  'trousers-riding',
  extendItem('base-bottom', {
    name: 'riding trousers',
    description:
      'Fitted trousers of supple leather, designed for riding or adventuring.',
    calcStats: (player) => {
      player.modifyStat('Agility', 3)
    },
  })
)

registerItemDefinition(
  'trousers-work',
  extendItem('base-bottom', {
    name: 'work trousers',
    description: 'Durable canvas trousers with reinforced knees. Built for hard labor.',
    calcStats: (player) => {
      player.modifyStat('Strength', 2)
    },
  })
)
