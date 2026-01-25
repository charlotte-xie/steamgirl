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
 */

import { registerItemDefinition } from '../../model/Item'

// ============================================================================
// HEAD
// ============================================================================

registerItemDefinition('base-hat', {
  name: 'hat',
  category: 'Clothes',
  positions: ['head'],
  layer: 'accessory',
})

// ============================================================================
// FACE
// ============================================================================

registerItemDefinition('base-mask', {
  name: 'mask',
  category: 'Clothes',
  positions: ['face'],
  layer: 'outer',
})

registerItemDefinition('base-eyewear', {
  name: 'eyewear',
  category: 'Clothes',
  positions: ['face'],
  layer: 'accessory',
})

// ============================================================================
// NECK
// ============================================================================

registerItemDefinition('base-necklace', {
  name: 'necklace',
  category: 'Clothes',
  positions: ['neck'],
  layer: 'accessory',
})

registerItemDefinition('base-collar', {
  name: 'collar',
  category: 'Clothes',
  positions: ['neck'],
  layer: 'under',
})

registerItemDefinition('base-necktie', {
  name: 'necktie',
  category: 'Clothes',
  positions: ['neck'],
  layer: 'inner',
})

// ============================================================================
// ARMS & WRISTS
// ============================================================================

registerItemDefinition('base-bracelet', {
  name: 'bracelet',
  category: 'Clothes',
  positions: ['wrists'],
  layer: 'accessory',
})

registerItemDefinition('base-armwear', {
  name: 'armwear',
  category: 'Clothes',
  positions: ['arms'],
  layer: 'accessory',
})

// ============================================================================
// CHEST / TORSO
// ============================================================================

registerItemDefinition('base-bra', {
  name: 'bra',
  category: 'Clothes',
  positions: ['chest'],
  layer: 'under',
})

registerItemDefinition('base-top', {
  name: 'top',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms'], // Shirt/blouse covers torso and arms
  layer: 'inner',
})

registerItemDefinition('base-vest', {
  name: 'vest',
  category: 'Clothes',
  positions: ['chest', 'belly'], // Vest covers torso but not arms
  layer: 'inner',
})

registerItemDefinition('base-outerwear', {
  name: 'outerwear',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms'], // Jacket/coat covers torso and arms
  layer: 'outer',
})

registerItemDefinition('base-corset', {
  name: 'corset',
  category: 'Clothes',
  positions: ['chest', 'belly'], // Corset covers torso (waist for cinching belts, not corsets)
  layer: 'outer',
})

// ============================================================================
// HIPS / LEGS
// ============================================================================

registerItemDefinition('base-panties', {
  name: 'panties',
  category: 'Clothes',
  positions: ['hips'],
  layer: 'under',
})

registerItemDefinition('base-bottom', {
  name: 'bottom',
  category: 'Clothes',
  positions: ['hips', 'legs'], // Long skirts/trousers cover hips and legs
  layer: 'inner',
})

registerItemDefinition('base-shorts', {
  name: 'shorts',
  category: 'Clothes',
  positions: ['hips'], // Shorts/short skirts cover only hips
  layer: 'inner',
})

// ============================================================================
// FULL BODY
// ============================================================================

registerItemDefinition('base-dress', {
  name: 'dress',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms', 'hips', 'legs'],
  layer: 'inner',
})

// ============================================================================
// FEET / LEGS (LOWER)
// ============================================================================

registerItemDefinition('base-stockings', {
  name: 'stockings',
  category: 'Clothes',
  positions: ['legs', 'feet'],
  layer: 'under',
})

registerItemDefinition('base-socks', {
  name: 'socks',
  category: 'Clothes',
  positions: ['feet'],
  layer: 'under',
})

registerItemDefinition('base-footwear', {
  name: 'footwear',
  category: 'Clothes',
  positions: ['feet'],
  layer: 'inner',
})

// ============================================================================
// HANDS
// ============================================================================

registerItemDefinition('base-gloves', {
  name: 'gloves',
  category: 'Clothes',
  positions: ['hands'],
  layer: 'accessory',
})

// ============================================================================
// WAIST
// ============================================================================

registerItemDefinition('base-belt', {
  name: 'belt',
  category: 'Clothes',
  positions: ['waist'],
  layer: 'accessory',
})
