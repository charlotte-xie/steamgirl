/**
 * torso.ts - Blouses, shirts, and vests.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'
import { registerColourVariants } from './colours'

registerItemDefinition(
  'blouse-silk',
  extendItem('base-top', {
    name: 'silk blouse',
    description:
      'A luxurious silk blouse in deep burgundy with mother-of-pearl buttons.',
    calcStats: (player) => {
      player.modifyStat('appearance', 3)
    },
  })
)

registerItemDefinition(
  'vest-brocade',
  extendItem('base-vest', {
    name: 'brocade vest',
    description: 'A fitted vest of gold and green brocade with brass buttons.',
    calcStats: (player) => {
      player.modifyStat('appearance', 2)
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
      player.modifyStat('appearance', 1)
    },
  })
)

registerItemDefinition(
  'crop-top',
  extendItem('base-vest', {
    name: 'crop top',
    description: 'A short, fitted top that bares the midriff. Daring by Aetherian standards.',
    image: '/images/steamgirl/CropTop.PNG',
  })
)

registerItemDefinition(
  'tied-shirt',
  extendItem('base-vest', {
    name: 'white tied shirt',
    description: 'A white shirt tied in a knot at the front, leaving the belly exposed.',
    image: '/images/steamgirl/TiedShirt.PNG',
  })
)

// ============================================================================
// COLOUR VARIANTS (generated from colour table)
// ============================================================================

registerColourVariants(
  'tied-shirt', 'tied-shirt', 'tied shirt',
  c => `A ${c} shirt tied in a knot at the front, leaving the belly exposed.`,
  'tied-shirt',
)
