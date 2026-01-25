/**
 * torso.ts - Blouses, shirts, and vests.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

registerItemDefinition(
  'blouse-silk',
  extendItem('base-top', {
    name: 'silk blouse',
    description:
      'A luxurious silk blouse in deep burgundy with mother-of-pearl buttons.',
    calcStats: (player) => {
      player.modifyStat('Charm', 3)
    },
  })
)

registerItemDefinition(
  'vest-brocade',
  extendItem('base-vest', {
    name: 'brocade vest',
    description: 'A fitted vest of gold and green brocade with brass buttons.',
    calcStats: (player) => {
      player.modifyStat('Charm', 2)
    },
  })
)

registerItemDefinition(
  'shirt-work',
  extendItem('base-top', {
    name: 'work shirt',
    description: 'A sturdy cotton shirt with rolled sleeves. Practical for labor.',
  })
)

registerItemDefinition(
  'blouse-white',
  extendItem('base-top', {
    name: 'white blouse',
    description:
      'A crisp white cotton blouse with a high collar and delicate pin-tucks.',
    calcStats: (player) => {
      player.modifyStat('Charm', 2)
    },
  })
)
