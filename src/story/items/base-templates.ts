/**
 * base-templates.ts - Base item templates for extending.
 *
 * These templates define the fundamental clothing types with their
 * position and layer settings. Specific items extend these templates.
 *
 * Clothing uses a position + layer system:
 * - Position: where on the body (head, chest, legs, feet, hands, neck, hips, waist)
 * - Layer: what order worn (body, under, inner, outer, accessory)
 *
 * Position notes:
 * - hips: panties, skirts, trousers (garments that go around the hips)
 * - waist: belts, sashes (cinching accessories)
 *
 * Multiple items can occupy the same position at different layers.
 * E.g., bra (chest:under) + blouse (chest:inner) + corset (chest:outer)
 *
 * Default images are provided where available as sensible fallbacks.
 * Specific items can override with their own image.
 */

import { registerItemDefinition } from '../../model/Item'

// ============================================================================
// HEAD
// ============================================================================

registerItemDefinition('base-hat', {
  name: 'hat',
  category: 'Clothes',
  icon: 'hat',
  positions: ['head'],
  layer: 'outer',
  image: '/images/steamgirl/Hat.PNG',
})

// ============================================================================
// FACE
// ============================================================================

registerItemDefinition('base-mask', {
  name: 'mask',
  category: 'Clothes',
  icon: 'mask',
  positions: ['face'],
  layer: 'outer',
})

registerItemDefinition('base-eyewear', {
  name: 'eyewear',
  category: 'Clothes',
  icon: 'eyewear',
  positions: ['face'],
  layer: 'accessory',
})

// ============================================================================
// NECK
// ============================================================================

registerItemDefinition('base-necklace', {
  name: 'necklace',
  category: 'Clothes',
  icon: 'necklace',
  positions: ['neck'],
  layer: 'accessory',
})

registerItemDefinition('base-collar', {
  name: 'collar',
  category: 'Clothes',
  icon: 'necklace',
  positions: ['neck'],
  layer: 'under',
})

registerItemDefinition('base-necktie', {
  name: 'necktie',
  category: 'Clothes',
  icon: 'necktie',
  positions: ['neck'],
  layer: 'inner',
})

// ============================================================================
// ARMS & WRISTS
// ============================================================================

registerItemDefinition('base-bracelet', {
  name: 'bracelet',
  category: 'Clothes',
  icon: 'bracelet',
  positions: ['wrists'],
  layer: 'accessory',
})

registerItemDefinition('base-armwear', {
  name: 'armwear',
  category: 'Clothes',
  icon: 'bracelet',
  positions: ['arms'],
  layer: 'accessory',
})

// ============================================================================
// CHEST / TORSO
// ============================================================================

registerItemDefinition('base-bra', {
  name: 'bra',
  category: 'Clothes',
  icon: 'underwear',
  positions: ['chest'],
  layer: 'under',
  image: '/images/steamgirl/BraTop.PNG',
})

registerItemDefinition('base-top', {
  name: 'top',
  category: 'Clothes',
  icon: 'top',
  positions: ['chest', 'belly', 'arms'], // Shirt/blouse covers torso and arms
  layer: 'inner',
  image: '/images/steamgirl/TiedShirt.PNG',
})

registerItemDefinition('base-vest', {
  name: 'vest',
  category: 'Clothes',
  icon: 'top',
  positions: ['chest', 'belly'], // Vest covers torso but not arms
  layer: 'inner',
  image: '/images/steamgirl/CropTop.PNG',
})

registerItemDefinition('base-outerwear', {
  name: 'outerwear',
  category: 'Clothes',
  icon: 'outerwear',
  positions: ['chest', 'belly', 'arms'], // Jacket/coat covers torso and arms
  layer: 'outer',
})

registerItemDefinition('base-corset', {
  name: 'corset',
  category: 'Clothes',
  icon: 'corset',
  positions: ['chest', 'belly'], // Corset covers torso (waist for cinching belts, not corsets)
  layer: 'outer',
  image: '/images/steamgirl/Corset.PNG',
})

// ============================================================================
// HIPS / LEGS
// ============================================================================

registerItemDefinition('base-panties', {
  name: 'panties',
  category: 'Clothes',
  icon: 'knickers',
  positions: ['hips'],
  layer: 'under',
  image: '/images/steamgirl/Panties.PNG',
})

registerItemDefinition('base-bottom', {
  name: 'bottom',
  category: 'Clothes',
  icon: 'bottom',
  positions: ['hips', 'legs'], // Long skirts/trousers cover hips and legs
  layer: 'inner',
  image: '/images/steamgirl/SchoolSkirt.PNG',
})

registerItemDefinition('base-shorts', {
  name: 'shorts',
  category: 'Clothes',
  icon: 'bottom',
  positions: ['hips'], // Shorts/short skirts cover only hips
  layer: 'inner',
  image: '/images/steamgirl/Shorts.PNG',
})

// ============================================================================
// FULL BODY
// ============================================================================

registerItemDefinition('base-dress', {
  name: 'dress',
  category: 'Clothes',
  icon: 'dress',
  positions: ['chest', 'belly', 'hips', 'legs'],
  layer: 'inner',
  image: '/images/steamgirl/BasicDress.PNG',
})

// ============================================================================
// FEET / LEGS (LOWER)
// ============================================================================

registerItemDefinition('base-stockings', {
  name: 'stockings',
  category: 'Clothes',
  icon: 'socks',
  positions: ['legs', 'feet'],
  layer: 'under',
  image: '/images/steamgirl/Socks.PNG',
})

registerItemDefinition('base-socks', {
  name: 'socks',
  category: 'Clothes',
  icon: 'socks',
  positions: ['feet'],
  layer: 'under',
  image: '/images/steamgirl/Socks.PNG',
})

registerItemDefinition('base-footwear', {
  name: 'footwear',
  category: 'Clothes',
  icon: 'footwear',
  positions: ['feet'],
  layer: 'inner',
  image: '/images/steamgirl/Boots.PNG',
})

// ============================================================================
// HANDS
// ============================================================================

registerItemDefinition('base-gloves', {
  name: 'gloves',
  category: 'Clothes',
  icon: 'gloves',
  positions: ['hands'],
  layer: 'accessory',
})

// ============================================================================
// WAIST
// ============================================================================

registerItemDefinition('base-belt', {
  name: 'belt',
  category: 'Clothes',
  icon: 'belt',
  positions: ['waist'],
  layer: 'accessory',
})
