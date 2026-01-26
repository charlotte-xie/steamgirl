/**
 * Market.ts - Shops and merchants in the marketplace.
 */

import type { Game } from '../model/Game'
import type { ShopItemEntry } from '../model/Game'
import type { LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { Item } from '../model/Item'
import { registerItemDefinition } from '../model/Item'
import { registerNPC } from '../model/NPC'
import { makeScripts } from '../model/Scripts'
import { text, option, seq } from '../model/ScriptDSL'
import { eatFood, consumeAlcohol } from './Effects'
import { maybeDiscoverLocation } from './Utility'

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
// Snack items
// ============================================================================

registerItemDefinition('toffee-apple', {
  name: 'toffee apple',
  description: 'A rosy apple coated in a hard shell of dark treacle toffee, skewered on a brass stick.',
  category: 'Consumables',
  stackable: true,
  onConsume: (game: Game) => {
    game.add('You crunch through the sticky toffee shell into the sweet apple beneath. Delicious.')
    eatFood(game, 30)
    game.run('addStat', { stat: 'Mood', change: 2, max: 70 })
  },
})

registerItemDefinition('meat-pie', {
  name: 'meat pie',
  description: 'A hand-sized pie with a golden pastry crust, filled with spiced mutton and gravy. Kept warm on a little steam-heated rack.',
  category: 'Consumables',
  stackable: true,
  onConsume: (game: Game) => {
    game.add('The pie is piping hot, the pastry flaky and the filling rich with pepper and gravy. Very satisfying.')
    eatFood(game, 80)
    game.run('addStat', { stat: 'Mood', change: 1, max: 60 })
  },
})

registerItemDefinition('sugared-almonds', {
  name: 'sugared almonds',
  description: 'A little paper cone of almonds coated in crystallised sugar and rose water. A fashionable indulgence.',
  category: 'Consumables',
  stackable: true,
  onConsume: (game: Game) => {
    game.add('The almonds are crunchy and fragrant, the sugar coating dissolving sweetly on your tongue.')
    eatFood(game, 20)
    game.run('addStat', { stat: 'Mood', change: 3, max: 80 })
  },
})

registerItemDefinition('ginger-beer', {
  name: 'ginger beer',
  description: 'A bottle of fiery home-brewed ginger beer, sealed with a mechanical stopper that pops with a satisfying hiss.',
  category: 'Consumables',
  stackable: true,
  onConsume: (game: Game) => {
    game.add('The ginger beer fizzes and burns pleasantly. It warms you from the inside out.')
    eatFood(game, 5)
    game.run('addStat', { stat: 'Mood', change: 2, max: 70 })
  },
})

registerItemDefinition('treacle-tart', {
  name: 'treacle tart',
  description: 'A sticky, gloriously sweet slice of golden syrup tart with a crumbly shortcrust base.',
  category: 'Consumables',
  stackable: true,
  onConsume: (game: Game) => {
    game.add('The treacle tart is sinfully sweet and utterly wonderful. You lick the syrup from your fingers.')
    eatFood(game, 40)
    game.run('addStat', { stat: 'Mood', change: 4, max: 80 })
  },
})

registerItemDefinition('mulled-cider', {
  name: 'mulled cider',
  description: 'A tin cup of warm cider infused with cinnamon, cloves, and a generous measure of brandy. Steam curls from the surface.',
  category: 'Consumables',
  stackable: true,
  onConsume: (game: Game) => {
    game.add('The cider is warming and spiced, with a kick of brandy that goes straight to your head.')
    eatFood(game, 5)
    consumeAlcohol(game, 40)
    game.run('addStat', { stat: 'Mood', change: 3, max: 80 })
  },
})

registerItemDefinition('roasted-chestnuts', {
  name: 'roasted chestnuts',
  description: 'A paper bag of chestnuts roasted over a small coal-fired brazier. They smell heavenly.',
  category: 'Consumables',
  stackable: true,
  onConsume: (game: Game) => {
    game.add('You peel the hot shells and eat the soft, earthy chestnuts one by one. Simple but comforting.')
    eatFood(game, 35)
    game.run('addStat', { stat: 'Mood', change: 1, max: 60 })
  },
})

// ============================================================================
// Snack shop inventory
// ============================================================================

const SNACK_SHOP_ITEMS: ShopItemEntry[] = [
  { itemId: 'toffee-apple', price: 2 },
  { itemId: 'roasted-chestnuts', price: 2 },
  { itemId: 'sugared-almonds', price: 3 },
  { itemId: 'ginger-beer', price: 3 },
  { itemId: 'meat-pie', price: 4 },
  { itemId: 'treacle-tart', price: 4 },
  { itemId: 'mulled-cider', price: 5 },
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

registerNPC('maeve-kelly', {
  name: 'Maeve Kelly',
  uname: 'snack vendor',
  description: 'A stout, rosy-cheeked woman with a booming laugh and flour permanently dusted across her apron. Her stall smells of toffee and spices.',
  speechColor: '#e8915a',
  onMove: (game: Game) => {
    const npc = game.getNPC('maeve-kelly')
    npc.followSchedule(game, [[7, 20, 'market']])
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

const enterMarketShopping = seq(
  text('The market buzzes with commerce. Several shops catch your eye.'),
  option("Madame Voss's Boutique", 'enterClothingShop'),
  option("Grosz's Components", 'enterComponentsShop'),
  option("Maeve's Delicacies", 'enterSnackShop'),
  option('Lucky Dip', 'enterLuckyDip'),
  option('Leave', 'endScene'),
)
makeScripts({
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

  enterSnackShop: (game: Game) => {
    game.scene.shop = {
      name: "Maeve's Delicacies",
      npcId: 'maeve-kelly',
      items: SNACK_SHOP_ITEMS,
    }
  },

  enterLuckyDip: (game: Game) => {
    const crownCount = game.player.inventory.find(item => item.id === 'crown')?.number ?? 0

    game.add('A vendor at a colourful stall beckons you over.')
    game.add('"Try your luck at the Lucky Dip!" she calls, gesturing to a large brass barrel filled with mysterious items. "Just 5 Krona for a chance at something special!"')

    if (crownCount >= 5) {
      game.addOption('luckyDipPay', {}, 'Pay 5 Krona')
      game.addOption('luckyDipQuit', {}, 'Walk Away')
    } else {
      game.add('Sadly, you don\'t have the coins to play this game. The vendor looks disappointed but smiles understandingly.')
      game.addOption('luckyDipQuit', {}, 'Walk Away')
    }
  },

  luckyDipPay: (game: Game) => {
    if (!game.player.removeItem('crown', 5)) {
      game.add('You check your pockets, but you don\'t have enough Krona. The vendor looks disappointed.')
      return
    }

    const luckyDipItems = [
      'brass-trinket',
      'clockwork-toy',
      'steam-whistle',
      'sweet-wine',
      'lucky-charm',
      'mysterious-gear',
      'glowing-crystal',
    ]

    const selectedId = luckyDipItems[Math.floor(Math.random() * luckyDipItems.length)]
    const displayName = new Item(selectedId, 1).getAName()

    game.add('You hand over 5 Krona to the vendor, who smiles and reaches into the brass barrel.')
    game.add('After a moment of rummaging, she pulls out a wrapped item and hands it to you.')
    game.run('gainItem', { text: `You received: ${displayName}!`, item: selectedId, number: 1 })
    game.run('addStat', { stat: 'Mood', change: 1, max: 60 })
  },

  luckyDipQuit: (game: Game) => {
    game.add('You politely decline and walk away from the stall. The vendor waves cheerfully as you leave.')
  },
})

// ============================================================================
// Market location
// ============================================================================

const marketLocation: LocationDefinition = {
  name: 'Market',
  image: '/images/market.jpg',
  description: 'A bustling marketplace filled with exotic goods and mechanical wonders.',
  mainLocation: true,
  links: [
    { dest: 'lake', time: 8 },
    { dest: 'backstreets', time: 8 },
    { dest: 'default', time: 5 },
  ],
  activities: [
    {
      name: 'Explore',
      script: (g: Game) => {
        g.timeLapse(10)

        if (maybeDiscoverLocation(
          g,
          'lake',
          0,
          'While exploring the market, you overhear a conversation about a peaceful lake nearby. Someone mentions the path that leads to it, and you commit the directions to memory.'
        )) {
          return
        }

        const encounters = [
          'You browse through stalls filled with brass trinkets and mechanical curiosities. Vendors call out their wares, their voices competing with the whir of clockwork displays.',
          'A vendor demonstrates a steam-powered music box, its delicate gears producing a beautiful melody. The intricate mechanism catches your eye.',
          'You notice a stall selling exotic mechanical components from distant lands. The vendor explains the unique properties of each piece with enthusiasm.',
          'A food vendor serves hot meals from a steam-powered cart. The aroma of spiced dishes mingles with the scent of oil and brass.',
          'You explore the textile section, where mechanical looms create intricate patterns. The rhythmic clicking of the machines is almost hypnotic.',
          'A fortune teller with a mechanical crystal ball offers readings. The device glows with an inner light, its gears spinning mysteriously.',
          'You watch as a craftsman repairs a broken automaton. His skilled hands work with precision, adjusting gears and tightening springs.',
          'A stall selling maps and navigational devices catches your attention. The mechanical compasses and brass astrolabes are beautifully crafted.',
          'You discover a hidden corner where rare mechanical books are sold. The vendor speaks in hushed tones about the knowledge contained within.',
          'A group of performers entertains the crowd with mechanical puppets. The intricate movements and synchronized actions are captivating.',
        ]

        g.add(encounters[Math.floor(Math.random() * encounters.length)])
      },
    },
    {
      name: 'Shopping',
      symbol: 'S',
      checkAccess: (g: Game) => {
        const h = g.hourOfDay
        return (h < 6 || h >= 23) ? 'The stalls are closed.' : null
      },
      script: enterMarketShopping,
    },
  ],
}

registerLocation('market', marketLocation)
