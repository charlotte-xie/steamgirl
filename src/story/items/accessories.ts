/**
 * accessories.ts - Gloves, jewellery, belts, scarves, and eyewear.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

// ============================================================================
// HANDS (gloves)
// ============================================================================

registerItemDefinition(
  'gloves-leather',
  extendItem('base-gloves', {
    name: 'leather gloves',
    description: 'Fine leather gloves that add a touch of elegance to any outfit.',
    value: 10,
    calcStats: (player) => {
      player.modifyStat('appearance', 2)
    },
  })
)

registerItemDefinition(
  'gloves-lace',
  extendItem('base-gloves', {
    name: 'lace gloves',
    description: 'Delicate lace gloves that extend to the elbow. Purely decorative.',
    value: 25,
    calcStats: (player) => {
      player.modifyStat('Etiquette', 2)
      player.modifyStat('appearance', 3)
    },
  })
)

registerItemDefinition(
  'gloves-work',
  extendItem('base-gloves', {
    name: 'work gloves',
    description: 'Heavy canvas gloves for manual labor. Protect the hands from harm.',
    value: 5,
    calcStats: (player) => {
      player.modifyStat('Strength', 1)
    },
  })
)

// ============================================================================
// FACE (masks, eyewear)
// ============================================================================

registerItemDefinition(
  'mask-masquerade',
  extendItem('base-mask', {
    name: 'masquerade mask',
    description:
      'An ornate mask of black velvet with gold filigree and peacock feathers.',
    value: 30,
    calcStats: (player) => {
      player.modifyStat('appearance', 3)
    },
  })
)

registerItemDefinition(
  'mask-plague',
  extendItem('base-mask', {
    name: 'plague doctor mask',
    description:
      'A beaked leather mask stuffed with aromatic herbs. Unsettling but practical.',
    value: 15,
    calcStats: (player) => {
      player.modifyStat('Willpower', 3)
    },
  })
)

registerItemDefinition(
  'spectacles-brass',
  extendItem('base-eyewear', {
    name: 'brass spectacles',
    description: 'Round spectacles with brass frames and magnifying lenses.',
    value: 20,
    calcStats: (player) => {
      player.modifyStat('Perception', 3)
      player.modifyStat('Wits', 2)
    },
  })
)

registerItemDefinition(
  'monocle',
  extendItem('base-eyewear', {
    name: 'monocle',
    description:
      'A brass-rimmed monocle on a fine chain. Gives an air of scholarly distinction.',
    value: 25,
    calcStats: (player) => {
      player.modifyStat('Perception', 3)
      player.modifyStat('Wits', 2)
    },
  })
)

// ============================================================================
// NECK (scarves, necklaces)
// ============================================================================

registerItemDefinition(
  'scarf-silk',
  extendItem('base-necklace', {
    name: 'silk scarf',
    description: 'A flowing silk scarf in rich jewel tones.',
    value: 12,
    calcStats: (player) => {
      player.modifyStat('appearance', 2)
    },
  })
)

registerItemDefinition(
  'cravat-silk',
  extendItem('base-necklace', {
    name: 'silk cravat',
    description: 'A formal silk cravat tied in an elegant knot.',
    value: 20,
    calcStats: (player) => {
      player.modifyStat('Etiquette', 2)
      player.modifyStat('appearance', 2)
    },
  })
)

registerItemDefinition(
  'necklace-pearl',
  extendItem('base-necklace', {
    name: 'pearl necklace',
    description: 'A strand of lustrous pearls with a silver clasp.',
    value: 60,
    calcStats: (player) => {
      player.modifyStat('appearance', 4)
    },
  })
)

registerItemDefinition(
  'choker-velvet',
  extendItem('base-necklace', {
    name: 'velvet choker',
    description: 'A black velvet choker with a small cameo pendant.',
    value: 15,
    calcStats: (player) => {
      player.modifyStat('appearance', 2)
    },
  })
)

registerItemDefinition(
  'pocket-watch-gold',
  extendItem('base-necklace', {
    name: 'gold pocket watch',
    description:
      'An exquisite gold pocket watch with intricate engravings. A mark of status.',
    value: 50,
    calcStats: (player) => {
      player.modifyStat('appearance', 3)
    },
  })
)

// ============================================================================
// WRISTS (bracelets, cuffs)
// ============================================================================

registerItemDefinition(
  'bracelet-silver',
  extendItem('base-bracelet', {
    name: 'silver bracelet',
    description: 'A delicate silver chain bracelet with tiny gear charms.',
    value: 20,
    calcStats: (player) => {
      player.modifyStat('appearance', 2)
    },
  })
)

registerItemDefinition(
  'cuff-leather',
  extendItem('base-bracelet', {
    name: 'leather cuff',
    description: 'A wide leather cuff with brass studs.',
    value: 5,
    calcStats: (player) => {
      player.modifyStat('Strength', 1)
    },
  })
)

// ============================================================================
// WAIST (belts)
// ============================================================================

registerItemDefinition(
  'belt-leather',
  extendItem('base-belt', {
    name: 'leather belt',
    description: 'A sturdy leather belt with a brass buckle.',
    value: 5,
  })
)

registerItemDefinition(
  'belt-tool',
  extendItem('base-belt', {
    name: 'tool belt',
    description: 'A wide leather belt with loops and pouches for tools.',
    value: 10,
    calcStats: (player) => {
      player.modifyStat('Mechanics', 3)
    },
  })
)
