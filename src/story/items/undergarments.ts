/**
 * undergarments.ts - Chemises, bras, drawers, and other underclothing.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'
import { registerColourVariants } from './colours'

// ============================================================================
// CHEST - UNDER LAYER (bras, chemises)
// ============================================================================

registerItemDefinition(
  'chemise-cotton',
  extendItem('base-bra', {
    name: 'cotton chemise',
    description: 'A simple white cotton chemise worn beneath outer garments.',
    value: 3,
  })
)

registerItemDefinition(
  'chemise-silk',
  extendItem('base-bra', {
    name: 'silk chemise',
    description:
      'A luxuriously soft silk chemise that feels wonderful against the skin.',
    value: 8,
    calcStats: (player) => {
      player.modifyStat('Mood', 5)
    },
  })
)

registerItemDefinition(
  'bra-cotton',
  extendItem('base-bra', {
    name: 'white bra',
    description: 'A simple supportive undergarment of white cotton.',
    image: '/images/steamgirl/BraTop.PNG',
    value: 2,
  })
)

registerItemDefinition(
  'bra-silk',
  extendItem('base-bra', {
    name: 'silk brassiere',
    description: 'A luxurious silk undergarment with delicate lace trim.',
    value: 6,
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
    name: 'white panties',
    description: 'Simple white cotton undergarments.',
    image: '/images/steamgirl/Panties.PNG',
    value: 2,
  })
)

registerItemDefinition(
  'panties-silk',
  extendItem('base-panties', {
    name: 'silk drawers',
    description: 'Luxuriously soft silk undergarments with delicate lace edges.',
    value: 6,
    calcStats: (player) => {
      player.modifyStat('Mood', 3)
    },
  })
)

// ============================================================================
// COLOUR VARIANTS (generated from colour table)
// ============================================================================

registerColourVariants(
  'bra-cotton', 'bra', 'bra',
  c => `A ${c} cotton bra. Simple and supportive.`,
  'bra-cotton',
)

registerColourVariants(
  'panties-cotton', 'panties', 'panties',
  c => `Simple ${c} cotton panties.`,
  'panties-cotton',
)

// ============================================================================
// SWIMWEAR
// ============================================================================

registerItemDefinition(
  'bikini-top',
  extendItem('base-bra', {
    name: 'bikini top',
    description: 'A simple bikini top. Not standard attire in Aetheria.',
    image: '/images/steamgirl/BikiniTop.PNG',
    value: 5,
  })
)

registerItemDefinition(
  'bikini-bottom',
  extendItem('base-panties', {
    name: 'bikini bottom',
    description: 'A simple bikini bottom. Definitely not standard attire in Aetheria.',
    image: '/images/steamgirl/BikiniBottom.PNG',
    value: 5,
  })
)
