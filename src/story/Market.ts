/**
 * Market.ts - Shops and merchants in the marketplace.
 */

import type { Game } from '../model/Game'
import type { LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { Item } from '../model/Item'
import { registerItemDefinition, shopItems } from '../model/Item'
import { registerNPC } from '../model/NPC'
import { makeScripts } from '../model/Scripts'
import { publicChecks } from './Public'
import { text, option, seq, random, time, cond, not, and, hourBetween, locationDiscovered, skillCheck, discoverLocation, script, run } from '../model/ScriptDSL'
import { eatFood, consumeAlcohol } from './Effects'

// ============================================================================
// Clothing shop inventory
// ============================================================================

const CLOTHING_SHOP_ITEMS = shopItems([
  // Tops
  'blouse-white', 'blouse-silk', 'shirt-work', 'vest-brocade',
  // Skirts & trousers
  'skirt-practical', 'skirt-pleated', 'skirt-bustle', 'trousers-riding',
  // Dresses
  'dress-simple', 'dress-day', 'dress-evening',
  // Outerwear
  'corset-suede', 'corset-leather', 'jacket-aviator', 'coat-velvet',
  // Accessories
  'gloves-leather', 'scarf-silk', 'choker-velvet',
], 1.5)

// ============================================================================
// Components shop inventory
// ============================================================================

const COMPONENTS_SHOP_ITEMS = shopItems([
  'brass-cog', 'copper-wire', 'spring-coil', 'brass-trinket',
  'steam-whistle', 'lens-ground', 'pressure-gauge',
  'mysterious-gear', 'aether-valve', 'glowing-crystal',
], 1.5)

// ============================================================================
// Snack items
// ============================================================================

registerItemDefinition('toffee-apple', {
  name: 'toffee apple',
  description: 'A rosy apple coated in a hard shell of dark treacle toffee, skewered on a brass stick.',
  category: 'Consumables',
  value: 1,
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
  value: 3,
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
  value: 2,
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
  value: 2,
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
  value: 3,
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
  value: 3,
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
  value: 1,
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

const SNACK_SHOP_ITEMS = shopItems([
  'toffee-apple', 'roasted-chestnuts', 'sugared-almonds',
  'ginger-beer', 'meat-pie', 'treacle-tart', 'mulled-cider',
], 1.5)

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
  option("Madame Voss's Boutique", run('enterClothingShop')),
  option("Grosz's Components", run('enterComponentsShop')),
  option("Maeve's Delicacies", run('enterSnackShop')),
  option('Lucky Dip', run('enterLuckyDip')),
  option('Leave', run('endScene')),
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
      game.addOption('luckyDipPay', 'Pay 5 Krona')
      game.addOption('luckyDipQuit', 'Walk Away')
    } else {
      game.add('Sadly, you don\'t have the coins to play this game. The vendor looks disappointed but smiles understandingly.')
      game.addOption('luckyDipQuit', 'Walk Away')
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
  secret: true,
  links: [
    { dest: 'lake', time: 8 },
    { dest: 'backstreets', time: 8 },
    { dest: 'default', time: 5 },
  ],
  activities: [
    {
      name: 'Explore',
      script: script(
        time(10),
        cond(
          // Discover the Lake
          and(not(locationDiscovered('lake')), skillCheck('Perception', 0)),
          discoverLocation('lake', 'While exploring the market, you overhear a conversation about a peaceful lake nearby. Someone mentions the path that leads to it, and you commit the directions to memory.'),
          // Morning (6am–12pm)
          hourBetween(6, 12),
          random(
            text('The morning market is alive with vendors setting up their stalls, polishing brass trinkets and winding clockwork displays. The scent of fresh bread mingles with machine oil.'),
            text('A vendor demonstrates a steam-powered music box, its delicate gears producing a beautiful melody. The intricate mechanism catches your eye.'),
            text('You notice a stall selling exotic mechanical components from distant lands. The vendor explains the unique properties of each piece with enthusiasm.'),
            text('A food vendor serves hot meals from a steam-powered cart. The aroma of spiced dishes mingles with the scent of oil and brass.'),
          ),
          // Afternoon (12pm–6pm)
          hourBetween(12, 18),
          random(
            text('You browse through stalls filled with brass trinkets and mechanical curiosities. Vendors call out their wares, their voices competing with the whir of clockwork displays.'),
            text('You explore the textile section, where mechanical looms create intricate patterns. The rhythmic clicking of the machines is almost hypnotic.'),
            text('You watch as a craftsman repairs a broken automaton. His skilled hands work with precision, adjusting gears and tightening springs.'),
            text('A stall selling maps and navigational devices catches your attention. The mechanical compasses and brass astrolabes are beautifully crafted.'),
          ),
          // Evening (6pm–10pm)
          hourBetween(18, 23),
          random(
            text('A fortune teller with a mechanical crystal ball offers readings. The device glows with an inner light, its gears spinning mysteriously.'),
            text('You discover a hidden corner where rare mechanical books are sold. The vendor speaks in hushed tones about the knowledge contained within.'),
            text('A group of performers entertains the crowd with mechanical puppets. The intricate movements and synchronised actions are captivating.'),
            text('The market takes on a different character as evening falls. Lanterns flicker to life along the stalls, casting warm pools of light over the remaining wares.'),
          ),
          // Night (10pm–6am)
          seq(
            random(
              text('The market is shuttered and still. Tarpaulins cover the stalls like shrouds, and the only movement is the occasional wisp of steam from an unattended pipe.'),
              text('Your footsteps echo off the cobblestones of the empty market square. A stray clockwork toy twitches in the gutter, its spring nearly spent.'),
              text('Without the bustle of trade, the market feels like a ghost of itself. The brass fixtures gleam coldly in the moonlight, and somewhere a loose shutter bangs in the wind.'),
            ),
          ),
        ),
        run('wait', { minutes: 10 }), /* Possibly get an encounter */
      ),
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
  onTick: publicChecks(7, 18),
}

registerLocation('market', marketLocation)
