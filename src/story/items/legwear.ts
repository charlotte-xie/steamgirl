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
    value: 30,
    calcStats: (player) => {
      player.modifyStat('Agility', -2)
      player.modifyStat('appearance', 3)
    },
  })
)

registerItemDefinition(
  'skirt-practical',
  extendItem('base-bottom', {
    name: 'practical skirt',
    description:
      'A simple A-line skirt of dark wool, hemmed just above the ankle for ease of movement.',
    value: 10,
  })
)

registerItemDefinition(
  'skirt-pleated',
  extendItem('base-bottom', {
    name: 'pleated skirt',
    description: 'A navy blue skirt with crisp pleats. Modest and practical.',
    image: '/images/steamgirl/SchoolSkirt.PNG',
    value: 12,
  })
)

registerItemDefinition(
  'shorts-basic',
  extendItem('base-shorts', {
    name: 'shorts',
    description: 'Simple canvas shorts, cut above the knee. Practical for warm weather or workshop work.',
    image: '/images/steamgirl/Shorts.PNG',
    value: 5,
  })
)

registerItemDefinition(
  'trousers-riding',
  extendItem('base-bottom', {
    name: 'riding trousers',
    description:
      'Fitted trousers of supple leather, designed for riding or adventuring.',
    icon: 'trousers',
    value: 22,
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
    icon: 'trousers',
    value: 8,
    calcStats: (player) => {
      player.modifyStat('Strength', 2)
    },
  })
)
