/**
 * Market.ts - Shops and merchants in the marketplace.
 */

import type { Game } from '../model/Game'
import type { ShopItemEntry } from '../model/Game'
import { registerNPC } from '../model/NPC'
import { makeScripts } from '../model/Scripts'

// ============================================================================
// Clothing shop inventory
// ============================================================================

const CLOTHING_SHOP_ITEMS: ShopItemEntry[] = [
  // Tops
  { itemId: 'blouse-white', price: 20 },
  { itemId: 'blouse-silk', price: 40 },
  { itemId: 'shirt-work', price: 12 },
  { itemId: 'vest-brocade', price: 30 },

  // Skirts & trousers
  { itemId: 'skirt-practical', price: 15 },
  { itemId: 'skirt-pleated', price: 20 },
  { itemId: 'skirt-bustle', price: 45 },
  { itemId: 'trousers-riding', price: 35 },

  // Dresses
  { itemId: 'dress-simple', price: 25 },
  { itemId: 'dress-day', price: 40 },
  { itemId: 'dress-evening', price: 80 },

  // Outerwear
  { itemId: 'corset-suede', price: 35 },
  { itemId: 'corset-leather', price: 50 },
  { itemId: 'jacket-aviator', price: 55 },
  { itemId: 'coat-velvet', price: 65 },

  // Accessories
  { itemId: 'gloves-leather', price: 15 },
  { itemId: 'scarf-silk', price: 20 },
  { itemId: 'choker-velvet', price: 25 },
]

// ============================================================================
// Components shop inventory
// ============================================================================

const COMPONENTS_SHOP_ITEMS: ShopItemEntry[] = [
  { itemId: 'brass-cog', price: 3 },
  { itemId: 'copper-wire', price: 5 },
  { itemId: 'spring-coil', price: 8 },
  { itemId: 'brass-trinket', price: 10 },
  { itemId: 'steam-whistle', price: 12 },
  { itemId: 'lens-ground', price: 15 },
  { itemId: 'pressure-gauge', price: 20 },
  { itemId: 'mysterious-gear', price: 25 },
  { itemId: 'aether-valve', price: 30 },
  { itemId: 'glowing-crystal', price: 40 },
]

// ============================================================================
// Shopkeeper NPCs
// ============================================================================

registerNPC('madame-voss', {
  name: 'Madame Voss',
  uname: 'boutique owner',
  description: 'The proprietress of a fine clothing boutique. She has an impeccable eye for fashion and a shrewd head for business.',
  speechColor: '#c49bd4',
  onMove: (game: Game) => {
    const npc = game.getNPC('madame-voss')
    npc.followSchedule(game, [[8, 18, 'market']])
  },
})

registerNPC('tinker-grosz', {
  name: 'Tinker Grosz',
  uname: 'components dealer',
  description: 'A wiry old man with magnifying lenses strapped over one eye and grease permanently worked into the lines of his hands. He knows every gear and valve in Aetheria.',
  speechColor: '#d4a43e',
  onMove: (game: Game) => {
    const npc = game.getNPC('tinker-grosz')
    npc.followSchedule(game, [[7, 19, 'market']])
  },
})

// ============================================================================
// Shop scripts
// ============================================================================

makeScripts({
  enterMarketShopping: (game: Game) => {
    game.add('The market buzzes with commerce. Several shops catch your eye.')
    game.addOption('enterClothingShop', {}, "Madame Voss's Boutique")
    game.addOption('enterComponentsShop', {}, "Grosz's Components")
  },

  enterClothingShop: (game: Game) => {
    game.scene.shop = {
      name: "Madame Voss's Boutique",
      npcId: 'madame-voss',
      items: CLOTHING_SHOP_ITEMS,
    }
  },

  enterComponentsShop: (game: Game) => {
    game.scene.shop = {
      name: "Grosz's Components",
      npcId: 'tinker-grosz',
      items: COMPONENTS_SHOP_ITEMS,
    }
  },
})
