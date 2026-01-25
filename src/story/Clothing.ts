/**
 * Clothing.ts - Wearable item definitions for the game.
 *
 * Defines clothing items that can be worn by the player, providing
 * stat modifiers and affecting appearance.
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

import { registerItemDefinition, extendItem } from '../model/Item'

// ============================================================================
// BASE ITEMS - Templates for extending
// ============================================================================

// Head
registerItemDefinition('base-hat', {
  name: 'hat',
  category: 'Clothes',
  positions: ['head'],
  layer: 'outer',
})

// Face
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

// Neck
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

// Wrists
registerItemDefinition('base-bracelet', {
  name: 'bracelet',
  category: 'Clothes',
  positions: ['wrists'],
  layer: 'accessory',
})

// Arms (sleeves, arm warmers)
registerItemDefinition('base-armwear', {
  name: 'armwear',
  category: 'Clothes',
  positions: ['arms'],
  layer: 'accessory',
})

// Chest layers
registerItemDefinition('base-bra', {
  name: 'bra',
  category: 'Clothes',
  positions: ['chest'],
  layer: 'under',
})

registerItemDefinition('base-top', {
  name: 'top',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms'],  // Shirt/blouse covers torso and arms
  layer: 'inner',
})

registerItemDefinition('base-vest', {
  name: 'vest',
  category: 'Clothes',
  positions: ['chest', 'belly'],  // Vest covers torso but not arms
  layer: 'inner',
})

registerItemDefinition('base-outerwear', {
  name: 'outerwear',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms'],  // Jacket/coat covers torso and arms
  layer: 'outer',
})

registerItemDefinition('base-corset', {
  name: 'corset',
  category: 'Clothes',
  positions: ['chest', 'belly'],  // Corset covers torso (waist for cinching belts, not corsets)
  layer: 'outer',
})

// Hips/legs layers
registerItemDefinition('base-panties', {
  name: 'panties',
  category: 'Clothes',
  positions: ['hips'],
  layer: 'under',
})

registerItemDefinition('base-bottom', {
  name: 'bottom',
  category: 'Clothes',
  positions: ['hips', 'legs'],  // Long skirts/trousers cover hips and legs
  layer: 'inner',
})

registerItemDefinition('base-shorts', {
  name: 'shorts',
  category: 'Clothes',
  positions: ['hips'],  // Shorts/short skirts cover only hips
  layer: 'inner',
})

// Full body (dress covers chest, belly, arms, hips, legs)
registerItemDefinition('base-dress', {
  name: 'dress',
  category: 'Clothes',
  positions: ['chest', 'belly', 'arms', 'hips', 'legs'],
  layer: 'inner',
})

// Stockings (under layer on feet and legs)
registerItemDefinition('base-stockings', {
  name: 'stockings',
  category: 'Clothes',
  positions: ['legs', 'feet'],
  layer: 'under',
})

// Socks (under layer on feet only)
registerItemDefinition('base-socks', {
  name: 'socks',
  category: 'Clothes',
  positions: ['feet'],
  layer: 'under',
})

// Feet
registerItemDefinition('base-footwear', {
  name: 'footwear',
  category: 'Clothes',
  positions: ['feet'],
  layer: 'inner',
})

// Hands
registerItemDefinition('base-gloves', {
  name: 'gloves',
  category: 'Clothes',
  positions: ['hands'],
  layer: 'accessory',
})

// Waist
registerItemDefinition('base-belt', {
  name: 'belt',
  category: 'Clothes',
  positions: ['waist'],
  layer: 'accessory',
})

// ============================================================================
// HEAD (accessory layer)
// ============================================================================

registerItemDefinition('goggles-brass', extendItem('base-hat', {
  name: 'brass goggles',
  description: 'Polished brass goggles with tinted lenses and adjustable straps. Essential for any aspiring engineer.',
  calcStats: (player) => {
    player.addStat('Perception', 5)
  },
}))

registerItemDefinition('hat-bowler', extendItem('base-hat', {
  name: 'bowler hat',
  description: 'A classic black bowler hat with a silk ribbon. Respectable and refined.',
  calcStats: (player) => {
    player.addStat('Charm', 3)
  },
}))

registerItemDefinition('hat-top', extendItem('base-hat', {
  name: 'top hat',
  description: 'A tall silk top hat with brass clockwork decorations. The height of fashion.',
  calcStats: (player) => {
    player.addStat('Charm', 5)
    player.addStat('Etiquette', 3)
  },
}))

registerItemDefinition('cap-newsboy', extendItem('base-hat', {
  name: 'newsboy cap',
  description: 'A worn tweed newsboy cap. Practical for the working class.',
}))

// ============================================================================
// CHEST - UNDER LAYER (bras, chemises)
// ============================================================================

registerItemDefinition('chemise-cotton', extendItem('base-bra', {
  name: 'cotton chemise',
  description: 'A simple white cotton chemise worn beneath outer garments.',
}))

registerItemDefinition('chemise-silk', extendItem('base-bra', {
  name: 'silk chemise',
  description: 'A luxuriously soft silk chemise that feels wonderful against the skin.',
  calcStats: (player) => {
    player.addStat('Mood', 5)
  },
}))

registerItemDefinition('bra-cotton', extendItem('base-bra', {
  name: 'cotton brassiere',
  description: 'A simple supportive undergarment of white cotton.',
}))

registerItemDefinition('bra-silk', extendItem('base-bra', {
  name: 'silk brassiere',
  description: 'A luxurious silk undergarment with delicate lace trim.',
  calcStats: (player) => {
    player.addStat('Mood', 3)
  },
}))

// ============================================================================
// CHEST - INNER LAYER (blouses, shirts)
// ============================================================================

registerItemDefinition('blouse-silk', extendItem('base-top', {
  name: 'silk blouse',
  description: 'A luxurious silk blouse in deep burgundy with mother-of-pearl buttons.',
  calcStats: (player) => {
    player.addStat('Charm', 3)
  },
}))

registerItemDefinition('vest-brocade', extendItem('base-vest', {
  name: 'brocade vest',
  description: 'A fitted vest of gold and green brocade with brass buttons.',
  calcStats: (player) => {
    player.addStat('Charm', 2)
  },
}))

registerItemDefinition('shirt-work', extendItem('base-top', {
  name: 'work shirt',
  description: 'A sturdy cotton shirt with rolled sleeves. Practical for labor.',
}))

registerItemDefinition('blouse-white', extendItem('base-top', {
  name: 'white blouse',
  description: 'A crisp white cotton blouse with a high collar and delicate pin-tucks.',
  calcStats: (player) => {
    player.addStat('Charm', 2)
  },
}))

// ============================================================================
// CHEST - OUTER LAYER (corsets, jackets, coats)
// ============================================================================

registerItemDefinition('corset-leather', extendItem('base-corset', {
  name: 'leather corset',
  description: 'A structured leather corset with brass buckles and intricate stitching. Cinches the waist dramatically.',
  calcStats: (player) => {
    player.addStat('Charm', 5)
    player.addStat('Agility', -3)
  },
}))

registerItemDefinition('corset-suede', extendItem('base-corset', {
  name: 'suede corset',
  description: 'A soft brown suede corset with subtle brass lacing. Flattering but comfortable.',
  calcStats: (player) => {
    player.addStat('Charm', 3)
    player.addStat('Agility', -1)
  },
}))

registerItemDefinition('jacket-aviator', extendItem('base-outerwear', {
  name: 'aviator jacket',
  description: 'A rugged leather jacket lined with fleece. Built for high altitudes and adventure.',
  calcStats: (player) => {
    player.addStat('Agility', 3)
    player.addStat('Willpower', 2)
  },
}))

registerItemDefinition('coat-velvet', extendItem('base-outerwear', {
  name: 'velvet coat',
  description: 'A rich burgundy velvet coat with brass buttons and embroidered cuffs.',
  calcStats: (player) => {
    player.addStat('Charm', 4)
  },
}))

// ============================================================================
// LEGS - UNDER LAYER (panties, drawers)
// ============================================================================

registerItemDefinition('panties-cotton', extendItem('base-panties', {
  name: 'cotton drawers',
  description: 'Simple white cotton undergarments.',
}))

registerItemDefinition('panties-silk', extendItem('base-panties', {
  name: 'silk drawers',
  description: 'Luxuriously soft silk undergarments with delicate lace edges.',
  calcStats: (player) => {
    player.addStat('Mood', 3)
  },
}))

// ============================================================================
// LEGS - INNER LAYER (skirts, trousers)
// ============================================================================

registerItemDefinition('skirt-bustle', extendItem('base-bottom', {
  name: 'bustle skirt',
  description: 'An elaborate skirt with a pronounced bustle and layers of ruffled fabric.',
  calcStats: (player) => {
    player.addStat('Charm', 4)
    player.addStat('Agility', -2)
  },
}))

registerItemDefinition('skirt-practical', extendItem('base-bottom', {
  name: 'practical skirt',
  description: 'A simple A-line skirt of dark wool, hemmed just above the ankle for ease of movement.',
}))

registerItemDefinition('skirt-pleated', extendItem('base-bottom', {
  name: 'pleated skirt',
  description: 'A navy blue skirt with crisp pleats. Modest and practical.',
  calcStats: (player) => {
    player.addStat('Charm', 1)
  },
}))

registerItemDefinition('trousers-riding', extendItem('base-bottom', {
  name: 'riding trousers',
  description: 'Fitted trousers of supple leather, designed for riding or adventuring.',
  calcStats: (player) => {
    player.addStat('Agility', 3)
  },
}))

registerItemDefinition('trousers-work', extendItem('base-bottom', {
  name: 'work trousers',
  description: 'Durable canvas trousers with reinforced knees. Built for hard labor.',
  calcStats: (player) => {
    player.addStat('Strength', 2)
  },
}))

// ============================================================================
// FULL BODY - INNER LAYER (dresses - cover chest + legs)
// ============================================================================

registerItemDefinition('dress-simple', extendItem('base-dress', {
  name: 'simple dress',
  description: 'A modest cotton dress in muted grey. Serviceable but unremarkable.',
}))

registerItemDefinition('dress-evening', extendItem('base-dress', {
  name: 'evening gown',
  description: 'An elegant gown of midnight blue velvet with silver embroidery and a sweeping train.',
  calcStats: (player) => {
    player.addStat('Charm', 8)
    player.addStat('Agility', -4)
  },
}))

registerItemDefinition('dress-day', extendItem('base-dress', {
  name: 'day dress',
  description: 'A tasteful dress of printed cotton with a fitted bodice and modest bustle.',
  calcStats: (player) => {
    player.addStat('Charm', 3)
  },
}))

registerItemDefinition('dress-maid', extendItem('base-dress', {
  name: 'maid uniform',
  description: 'A black dress with white apron and cap. The standard attire for domestic service.',
}))

// ============================================================================
// FEET - UNDER LAYER (stockings, socks)
// ============================================================================

registerItemDefinition('stockings-long', extendItem('base-stockings', {
  name: 'long stockings',
  description: 'White cotton stockings that reach above the knee.',
}))

registerItemDefinition('stockings-silk', extendItem('base-stockings', {
  name: 'silk stockings',
  description: 'Sheer silk stockings with a subtle sheen. Luxurious against the skin.',
  calcStats: (player) => {
    player.addStat('Charm', 2)
  },
}))

// ============================================================================
// FEET - INNER LAYER (boots, shoes)
// ============================================================================

registerItemDefinition('boots-leather', extendItem('base-footwear', {
  name: 'leather boots',
  description: 'Sturdy leather boots with brass buckles. Practical for any occasion.',
  calcStats: (player) => {
    player.addStat('Agility', 2)
  },
}))

registerItemDefinition('boots-heeled', extendItem('base-footwear', {
  name: 'heeled boots',
  description: 'Elegant boots with a modest heel and delicate button closures.',
  calcStats: (player) => {
    player.addStat('Charm', 3)
    player.addStat('Agility', -1)
  },
}))

registerItemDefinition('shoes-dancing', extendItem('base-footwear', {
  name: 'dancing shoes',
  description: 'Lightweight shoes with flexible soles, perfect for dancing.',
  calcStats: (player) => {
    player.addStat('Dancing', 5)
    player.addStat('Agility', 2)
  },
}))

registerItemDefinition('boots-work', extendItem('base-footwear', {
  name: 'work boots',
  description: 'Heavy-duty boots with steel toe caps. Essential for factory work.',
  calcStats: (player) => {
    player.addStat('Strength', 2)
  },
}))

// ============================================================================
// HANDS (gloves)
// ============================================================================

registerItemDefinition('gloves-leather', extendItem('base-gloves', {
  name: 'leather gloves',
  description: 'Fine leather gloves that add a touch of elegance to any outfit.',
  calcStats: (player) => {
    player.addStat('Charm', 2)
  },
}))

registerItemDefinition('gloves-lace', extendItem('base-gloves', {
  name: 'lace gloves',
  description: 'Delicate lace gloves that extend to the elbow. Purely decorative.',
  calcStats: (player) => {
    player.addStat('Charm', 4)
    player.addStat('Etiquette', 2)
  },
}))

registerItemDefinition('gloves-work', extendItem('base-gloves', {
  name: 'work gloves',
  description: 'Heavy canvas gloves for manual labor. Protect the hands from harm.',
  calcStats: (player) => {
    player.addStat('Strength', 1)
  },
}))

// ============================================================================
// FACE (masks, eyewear)
// ============================================================================

registerItemDefinition('mask-masquerade', extendItem('base-mask', {
  name: 'masquerade mask',
  description: 'An ornate mask of black velvet with gold filigree and peacock feathers.',
  calcStats: (player) => {
    player.addStat('Charm', 4)
  },
}))

registerItemDefinition('mask-plague', extendItem('base-mask', {
  name: 'plague doctor mask',
  description: 'A beaked leather mask stuffed with aromatic herbs. Unsettling but practical.',
  calcStats: (player) => {
    player.addStat('Willpower', 3)
  },
}))

registerItemDefinition('spectacles-brass', extendItem('base-eyewear', {
  name: 'brass spectacles',
  description: 'Round spectacles with brass frames and magnifying lenses.',
  calcStats: (player) => {
    player.addStat('Perception', 3)
    player.addStat('Wits', 2)
  },
}))

registerItemDefinition('monocle', extendItem('base-eyewear', {
  name: 'monocle',
  description: 'A brass-rimmed monocle on a fine chain. Gives an air of scholarly distinction.',
  calcStats: (player) => {
    player.addStat('Perception', 3)
    player.addStat('Wits', 2)
  },
}))

// ============================================================================
// NECK (scarves, necklaces, collars)
// ============================================================================

registerItemDefinition('scarf-silk', extendItem('base-necklace', {
  name: 'silk scarf',
  description: 'A flowing silk scarf in rich jewel tones.',
  calcStats: (player) => {
    player.addStat('Charm', 2)
  },
}))

registerItemDefinition('cravat-silk', extendItem('base-necklace', {
  name: 'silk cravat',
  description: 'A formal silk cravat tied in an elegant knot.',
  calcStats: (player) => {
    player.addStat('Charm', 3)
    player.addStat('Etiquette', 2)
  },
}))

registerItemDefinition('necklace-pearl', extendItem('base-necklace', {
  name: 'pearl necklace',
  description: 'A strand of lustrous pearls with a silver clasp.',
  calcStats: (player) => {
    player.addStat('Charm', 4)
  },
}))

registerItemDefinition('choker-velvet', extendItem('base-necklace', {
  name: 'velvet choker',
  description: 'A black velvet choker with a small cameo pendant.',
  calcStats: (player) => {
    player.addStat('Charm', 2)
  },
}))

registerItemDefinition('pocket-watch-gold', extendItem('base-necklace', {
  name: 'gold pocket watch',
  description: 'An exquisite gold pocket watch with intricate engravings. A mark of status.',
  calcStats: (player) => {
    player.addStat('Charm', 3)
  },
}))

// ============================================================================
// WRISTS (bracelets, cuffs)
// ============================================================================

registerItemDefinition('bracelet-silver', extendItem('base-bracelet', {
  name: 'silver bracelet',
  description: 'A delicate silver chain bracelet with tiny gear charms.',
  calcStats: (player) => {
    player.addStat('Charm', 2)
  },
}))

registerItemDefinition('cuff-leather', extendItem('base-bracelet', {
  name: 'leather cuff',
  description: 'A wide leather cuff with brass studs.',
  calcStats: (player) => {
    player.addStat('Strength', 1)
  },
}))

// ============================================================================
// WAIST (belts)
// ============================================================================

registerItemDefinition('belt-leather', extendItem('base-belt', {
  name: 'leather belt',
  description: 'A sturdy leather belt with a brass buckle.',
}))

registerItemDefinition('belt-tool', extendItem('base-belt', {
  name: 'tool belt',
  description: 'A wide leather belt with loops and pouches for tools.',
  calcStats: (player) => {
    player.addStat('Mechanics', 3)
  },
}))

// ============================================================================
// SCHOOL UNIFORM
// ============================================================================

registerItemDefinition('school-blazer', extendItem('base-outerwear', {
  name: 'school blazer',
  description: 'A navy blue blazer with the university crest embroidered on the breast pocket. Standard issue for students.',
  calcStats: (player) => {
    player.addStat('Etiquette', 2)
  },
}))

registerItemDefinition('school-necktie', extendItem('base-necktie', {
  name: 'school necktie',
  description: 'A striped necktie in the university colours of navy and gold.',
  calcStats: (player) => {
    player.addStat('Etiquette', 1)
  },
}))

registerItemDefinition('school-skirt', extendItem('base-bottom', {
  name: 'school skirt',
  description: 'A navy blue pleated skirt that falls just below the knee. Part of the standard uniform.',
  calcStats: (player) => {
    player.addStat('Etiquette', 1)
  },
}))

registerItemDefinition('school-socks', extendItem('base-socks', {
  name: 'school socks',
  description: 'Knee-high white socks with navy trim at the top. Standard issue for students.',
}))

// ============================================================================
// CURSED ITEMS
// ============================================================================

registerItemDefinition('gloves-cursed', extendItem('base-gloves', {
  name: 'elegant black gloves',
  description: 'Exquisitely crafted gloves of supple black leather. They seem to shimmer with an unnatural darkness. Once worn, you feel an unsettling compulsion to keep them on...',
  calcStats: (player) => {
    player.addStat('Charm', 5)
    player.addStat('Willpower', -10)
  },
  onWorn: (_player, item) => {
    // Lock the gloves when worn - they're cursed!
    item.locked = true
  },
}))
