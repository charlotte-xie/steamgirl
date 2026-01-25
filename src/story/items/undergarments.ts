/**
 * undergarments.ts - Chemises, bras, drawers, and other underclothing.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

// ============================================================================
// CHEST - UNDER LAYER (bras, chemises)
// ============================================================================

registerItemDefinition(
  'chemise-cotton',
  extendItem('base-bra', {
    name: 'cotton chemise',
    description: 'A simple white cotton chemise worn beneath outer garments.',
  })
)

registerItemDefinition(
  'chemise-silk',
  extendItem('base-bra', {
    name: 'silk chemise',
    description:
      'A luxuriously soft silk chemise that feels wonderful against the skin.',
    calcStats: (player) => {
      player.modifyStat('Mood', 5)
    },
  })
)

registerItemDefinition(
  'bra-cotton',
  extendItem('base-bra', {
    name: 'cotton brassiere',
    description: 'A simple supportive undergarment of white cotton.',
  })
)

registerItemDefinition(
  'bra-silk',
  extendItem('base-bra', {
    name: 'silk brassiere',
    description: 'A luxurious silk undergarment with delicate lace trim.',
    calcStats: (player) => {
      player.modifyStat('Mood', 3)
    },
  })
)

// ============================================================================
// HIPS - UNDER LAYER (panties, drawers)
// ============================================================================

registerItemDefinition(
  'panties-cotton',
  extendItem('base-panties', {
    name: 'cotton drawers',
    description: 'Simple white cotton undergarments.',
  })
)

registerItemDefinition(
  'panties-silk',
  extendItem('base-panties', {
    name: 'silk drawers',
    description: 'Luxuriously soft silk undergarments with delicate lace edges.',
    calcStats: (player) => {
      player.modifyStat('Mood', 3)
    },
  })
)
