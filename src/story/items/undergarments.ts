/**
 * undergarments.ts - Chemises, bras, drawers, and other underclothing.
 */

import { registerItemDefinition, extendItem, tintedItem } from '../../model/Item'

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
    name: 'white bra',
    description: 'A simple supportive undergarment of white cotton.',
    image: '/images/steamgirl/BraTop.PNG',
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
    name: 'white panties',
    description: 'Simple white cotton undergarments.',
    image: '/images/steamgirl/Panties.PNG',
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

// ============================================================================
// TINTED VARIANTS
// ============================================================================

registerItemDefinition(
  'bra-black',
  tintedItem('bra-cotton', '#222222', {
    name: 'black bra',
    description: 'A sleek black undergarment. Simple and flattering.',
  })
)

registerItemDefinition(
  'bra-pink',
  tintedItem('bra-cotton', '#f2a0b0', {
    name: 'blush bra',
    description: 'A soft pink undergarment with a delicate feminine charm.',
  })
)

registerItemDefinition(
  'panties-black',
  tintedItem('panties-cotton', '#222222', {
    name: 'black panties',
    description: 'Simple black undergarments. Practical and elegant.',
  })
)

registerItemDefinition(
  'panties-pink',
  tintedItem('panties-cotton', '#f2a0b0', {
    name: 'blush panties',
    description: 'Soft pink undergarments with a gentle rosy hue.',
  })
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
    calcStats: (player) => {
      player.modifyStat('Charm', 2)
    },
  })
)

registerItemDefinition(
  'bikini-bottom',
  extendItem('base-panties', {
    name: 'bikini bottom',
    description: 'A simple bikini bottom. Definitely not standard attire in Aetheria.',
    image: '/images/steamgirl/BikiniBottom.PNG',
    calcStats: (player) => {
      player.modifyStat('Charm', 2)
    },
  })
)
