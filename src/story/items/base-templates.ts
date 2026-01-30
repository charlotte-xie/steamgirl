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
  colour: '#7a6a5a',
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
  colour: '#8a7a6a',
  positions: ['face'],
  layer: 'outer',
})

registerItemDefinition('base-eyewear', {
  name: 'eyewear',
  category: 'Clothes',
  icon: 'eyewear',
  colour: '#90806a',
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
  colour: '#b0903a',
  positions: ['neck'],
  layer: 'accessory',
})

registerItemDefinition('base-collar', {
  name: 'collar',
  category: 'Clothes',
  icon: 'necklace',
  colour: '#6a5a50',
  positions: ['neck'],
  layer: 'under',
})

registerItemDefinition('base-necktie', {
  name: 'necktie',
  category: 'Clothes',
  icon: 'necktie',
  colour: '#6a5060',
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
  colour: '#b0903a',
  positions: ['wrists'],
  layer: 'accessory',
})

registerItemDefinition('base-armwear', {
  name: 'armwear',
  category: 'Clothes',
  icon: 'bracelet',
  colour: '#7a6a5a',
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
  colour: '#c0a8a0',
  positions: ['chest'],
  layer: 'under',
  image: '/images/steamgirl/BraTop.PNG',
})

registerItemDefinition('base-top', {
  name: 'top',
  category: 'Clothes',
  icon: 'top',
  colour: '#8090a0',
  positions: ['chest', 'belly', 'arms'], // Shirt/blouse covers torso and arms
  layer: 'inner',
  image: '/images/steamgirl/TiedShirt.PNG',
})

registerItemDefinition('base-vest', {
  name: 'vest',
  category: 'Clothes',
  icon: 'top',
  colour: '#8090a0',
  positions: ['chest', 'belly'], // Vest covers torso but not arms
  layer: 'inner',
  image: '/images/steamgirl/CropTop.PNG',
})

registerItemDefinition('base-outerwear', {
  name: 'outerwear',
  category: 'Clothes',
  icon: 'outerwear',
  colour: '#6a5a50',
  positions: ['chest', 'belly', 'arms'], // Jacket/coat covers torso and arms
  layer: 'outer',
})

registerItemDefinition('base-corset', {
  name: 'corset',
  category: 'Clothes',
  icon: 'corset',
  colour: '#7a5a4a',
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
  colour: '#c0a8a0',
  positions: ['hips'],
  layer: 'under',
  image: '/images/steamgirl/Panties.PNG',
})

registerItemDefinition('base-bottom', {
  name: 'bottom',
  category: 'Clothes',
  icon: 'bottom',
  colour: '#6a6a78',
  positions: ['hips', 'legs'], // Long skirts/trousers cover hips and legs
  layer: 'inner',
  image: '/images/steamgirl/SchoolSkirt.PNG',
})

registerItemDefinition('base-shorts', {
  name: 'shorts',
  category: 'Clothes',
  icon: 'trousers',
  colour: '#6a6a78',
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
  colour: '#7a6880',
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
  colour: '#a09888',
  positions: ['legs', 'feet'],
  layer: 'under',
  image: '/images/steamgirl/Socks.PNG',
})

registerItemDefinition('base-socks', {
  name: 'socks',
  category: 'Clothes',
  icon: 'socks',
  colour: '#a09888',
  positions: ['feet'],
  layer: 'under',
  image: '/images/steamgirl/Socks.PNG',
})

registerItemDefinition('base-footwear', {
  name: 'footwear',
  category: 'Clothes',
  icon: 'footwear',
  colour: '#6a5a4a',
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
  colour: '#7a6a5a',
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
  colour: '#6a5a4a',
  positions: ['waist'],
  layer: 'accessory',
})
