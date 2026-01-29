/**
 * headwear.ts - Hats and head accessories.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

registerItemDefinition(
  'goggles-brass',
  extendItem('base-hat', {
    name: 'brass goggles',
    description:
      'Polished brass goggles with tinted lenses and adjustable straps. Essential for any aspiring engineer.',
    calcStats: (player) => {
      player.modifyStat('Perception', 5)
    },
  })
)

registerItemDefinition(
  'hat-bowler',
  extendItem('base-hat', {
    name: 'bowler hat',
    description: 'A classic black bowler hat with a silk ribbon. Respectable and refined.',
    image: '/images/steamgirl/Hat.PNG',
    calcStats: (player) => {
      player.modifyStat('Charm', 3)
    },
  })
)

registerItemDefinition(
  'hat-top',
  extendItem('base-hat', {
    name: 'top hat',
    description:
      'A tall silk top hat with brass clockwork decorations. The height of fashion.',
    calcStats: (player) => {
      player.modifyStat('Charm', 5)
      player.modifyStat('Etiquette', 3)
    },
  })
)

registerItemDefinition(
  'cap-newsboy',
  extendItem('base-hat', {
    name: 'newsboy cap',
    description: 'A worn tweed newsboy cap. Practical for the working class.',
  })
)
