import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import type { CardDefinition } from '../model/Card'
import type { Card } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { makeScripts } from '../model/Scripts'
import { script, text, when, npcStat, seq, cond, hasItem, removeItem, timeLapse, eatFood, addStat, random, run } from '../model/ScriptDSL'
import { freshenUp, takeWash, consumeAlcohol, applyRelaxation } from './Effects'
import { bedActivity } from './Sleep'

// ============================================================================
// HOTEL BOOKING CARD
// ============================================================================

const ROOM_PRICE = 800
const SUITE_PRICE = 5000

const hotelBookingCard: CardDefinition = {
  name: 'Hotel Booking',
  description: 'You have a room booked at the Imperial Hotel until 11am tomorrow.',
  type: 'Access',
  color: '#d4af37', // Gold
  onTime: (game: Game, card: Card) => {
    const expiresAt = card.expiresAt as number
    if (expiresAt && game.time >= expiresAt) {
      game.removeCard(card.id)
    }
  },
  onRemoved: (game: Game) => {
    game.add({ type: 'text', text: 'Your hotel booking has expired.', color: '#d4af37' })
    // If the player is in the room or bathroom when booking expires, move them to the lobby
    if (game.currentLocation === 'dorm-suite' || game.currentLocation === 'nice-bathroom') {
      game.add('A bellhop knocks firmly on the door. "Checkout time, I\'m afraid. Please make your way to the lobby."')
      game.run('move', { location: 'hotel' })
    }
  },
}

registerCardDefinition('hotel-booking', hotelBookingCard)

const suiteBookingCard: CardDefinition = {
  name: 'Suite Booking',
  description: 'You have the Imperial Suite booked until 11am tomorrow.',
  type: 'Access',
  color: '#c9a227', // Rich gold
  onTime: (game: Game, card: Card) => {
    const expiresAt = card.expiresAt as number
    if (expiresAt && game.time >= expiresAt) {
      game.removeCard(card.id)
    }
  },
  onRemoved: (game: Game) => {
    game.add({ type: 'text', text: 'Your suite booking has expired.', color: '#c9a227' })
    if (game.currentLocation === 'hotel-suite' || game.currentLocation === 'suite-bathroom') {
      game.add('A bellhop knocks firmly on the door. "Checkout time, I\'m afraid. Please make your way to the lobby."')
      game.run('move', { location: 'hotel' })
    }
  },
}

registerCardDefinition('suite-booking', suiteBookingCard)

// ============================================================================
// RECEPTION SCRIPTS
// ============================================================================

const addReceptionOptions = (g: Game) => {
  if (!g.player.hasCard('hotel-booking')) {
    g.addOption('receptionBookRoom', {}, `Book a Room (${ROOM_PRICE} Kr)`)
  }
  if (!g.player.hasCard('suite-booking')) {
    g.addOption('receptionBookSuite', {}, `Book the Suite (${SUITE_PRICE} Kr)`)
  }
  g.addOption('receptionAskWork', {}, 'Ask About Work')
  g.addOption('receptionLeave', {}, 'Leave')
}

const receptionScripts = {
  receptionScene: (g: Game) => {
    if (g.player.hasCard('hotel-booking')) {
      g.add('The concierge looks up and smiles. "Welcome back. Your room is ready, of course — Room 101, just through there."')
    } else {
      g.add('You approach the polished brass counter. The concierge straightens his waistcoat and offers a practised smile.')
      g.add('"Good day. Welcome to the Imperial. How may I be of service?"')
    }
    addReceptionOptions(g)
  },
  receptionBookRoom: (g: Game) => {
    const crowns = g.player.inventory.find(i => i.id === 'crown')?.number ?? 0
    if (crowns < ROOM_PRICE) {
      g.add(`The concierge glances at a brass ledger. "A single room is ${ROOM_PRICE} Krona per night, checkout at eleven." He pauses, reading your expression. "Perhaps another time."`)
      addReceptionOptions(g)
      return
    }
    g.player.removeItem('crown', ROOM_PRICE)
    // Expires at 11am the next day
    const tomorrow = new Date(g.date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    const expiresAt = Math.floor(tomorrow.getTime() / 1000)
    g.addCard('hotel-booking', 'Access', { expiresAt }, true)
    g.getLocation('dorm-suite').discovered = true
    g.add('The concierge produces a polished brass key from a hook behind the counter.')
    g.add('"Room 101, up the stairs and first on the left. Checkout is at eleven tomorrow morning. Enjoy your stay."')
    g.add({ type: 'text', text: `Paid ${ROOM_PRICE} Krona.`, color: '#d4af37' })
    addReceptionOptions(g)
  },
  receptionBookSuite: (g: Game) => {
    const crowns = g.player.inventory.find(i => i.id === 'crown')?.number ?? 0
    if (crowns < SUITE_PRICE) {
      g.add(`The concierge glances at a brass ledger. "The Imperial Suite is ${SUITE_PRICE} Krona per night, checkout at eleven. Our finest accommodation." He pauses. "Perhaps another time."`)
      addReceptionOptions(g)
      return
    }
    g.player.removeItem('crown', SUITE_PRICE)
    const tomorrow = new Date(g.date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    const expiresAt = Math.floor(tomorrow.getTime() / 1000)
    g.addCard('suite-booking', 'Access', { expiresAt }, true)
    g.getLocation('hotel-suite').discovered = true
    g.add('The concierge\'s eyes widen slightly as you produce the payment. He retrieves an ornate brass key from a velvet-lined case.')
    g.add('"The Imperial Suite, madam. Top floor, take the lift. You\'ll find every luxury at your disposal. Checkout is at eleven tomorrow."')
    g.add({ type: 'text', text: `Paid ${SUITE_PRICE} Krona.`, color: '#c9a227' })
    addReceptionOptions(g)
  },
  receptionAskWork: (g: Game) => {
    g.add('The concierge raises an eyebrow. "We do take on staff from time to time — chambermaids, kitchen hands, that sort of thing. Speak to the head cook if you\'re interested. The kitchens are through the back."')
    addReceptionOptions(g)
  },
  receptionLeave: (g: Game) => {
    g.run('endScene', { text: 'You step away from the reception desk.' })
  },
}

makeScripts(receptionScripts)

// Additional scripts for hotel activities
makeScripts({
  showPayment: (g: Game, params: { amount?: number }) => {
    const amount = params.amount ?? 0
    g.add({ type: 'text', text: `Paid ${amount} Krona.`, color: '#d4af37' })
  },
  consumeAlcohol: (g: Game, params: { amount?: number }) => {
    consumeAlcohol(g, params.amount ?? 0)
  },
})

// ============================================================================
// ACTIVITY SCRIPTS (DSL)
// ============================================================================

const lightLunchScript = script(
  cond(
    hasItem('crown', 25),
    seq(
      removeItem('crown', 25),
      run('showPayment', { amount: 25 }),
      timeLapse(30),
      text('A waiter brings you a light but exquisite lunch — a salad of fresh greens, a delicate soup, and bread still warm from the oven. Every bite is perfect.'),
      eatFood(80),
      addStat('Mood', 3, { max: 90 }),
    ),
    text('A waiter approaches with a leather-bound menu. The prices make you wince. You don\'t have enough for lunch here.'),
  ),
)

const fineDinnerScript = script(
  cond(
    hasItem('crown', 50),
    seq(
      removeItem('crown', 50),
      run('showPayment', { amount: 50 }),
      timeLapse(90),
      text('You are treated to a multi-course dinner that borders on the transcendent. Roast pheasant, seasonal vegetables, a cheese course, and a dessert so rich it ought to be illegal. The wine is excellent.'),
      eatFood(150),
      addStat('Mood', 10, { max: 100 }),
      run('consumeAlcohol', { amount: 20 }),
    ),
    text('A waiter presents the evening menu with a flourish. The prices are eye-watering. You quietly excuse yourself.'),
  ),
)

const takeTeaScript = script(
  cond(
    hasItem('crown', 10),
    seq(
      removeItem('crown', 10),
      run('showPayment', { amount: 10 }),
      timeLapse(30),
      text('A waiter brings you a pot of perfectly brewed tea and a tiered stand of finger sandwiches, scones with clotted cream, and tiny pastries. It\'s delightfully civilised.'),
      eatFood(40),
      addStat('Mood', 5, { max: 90 }),
    ),
    text('You eye the tiered cake stands at nearby tables with longing. Ten krona for afternoon tea is beyond your means right now.'),
  ),
)

const swimScript = script(
  timeLapse(30),
  random(
    text('You swim steady lengths in the warm water, feeling the tension leave your muscles.'),
    text('You float on your back, gazing up through the glass ceiling at the clouds drifting past.'),
    text('You swim with powerful strokes, enjoying the exercise. The heated water is invigorating.'),
  ),
  addStat('Fitness', 1, { max: 50, chance: 0.3 }),
  addStat('Mood', 3, { max: 85 }),
  run('recordTime', { timer: 'lastWash' }),
  text('You emerge refreshed, your skin tingling pleasantly.'),
)

// ============================================================================
// LOCATION DEFINITIONS
// ============================================================================

const HOTEL_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  hotel: {
    name: 'Imperial Hotel',
    description: 'An imposing brass-and-marble edifice on the city\'s main boulevard, bearing the name "Imperial" in gilt lettering above its revolving doors. Crystal chandeliers hang from vaulted ceilings, and uniformed bellhops with mechanical enhancements glide between guests. The air smells of polished wood and expensive cologne.',
    image: '/images/hotel.jpg',
    secret: true,
    links: [
      { dest: 'default', time: 5, label: 'Exit to City Centre' },
      {
        dest: 'dorm-suite',
        time: 1,
        label: 'Room 101',
        checkAccess: (game: Game) => {
          if (!game.player.hasCard('hotel-booking')) {
            return 'You need to book a room at the reception desk first.'
          }
          return null
        },
      },
      {
        dest: 'hotel-suite',
        time: 2,
        label: 'Imperial Suite (Lift)',
        checkAccess: (game: Game) => {
          if (!game.player.hasCard('suite-booking')) {
            return 'You need to book the suite at the reception desk first.'
          }
          return null
        },
      },
      { dest: 'hotel-bar', time: 1, label: 'Bar' },
      { dest: 'hotel-restaurant', time: 1, label: 'Restaurant' },
      {
        dest: 'hotel-pool',
        time: 2,
        label: 'Pool',
        checkAccess: (game: Game) => {
          if (!game.player.hasCard('hotel-booking') && !game.player.hasCard('suite-booking')) {
            return 'The pool is for hotel residents only. You\'ll need to book a room first.'
          }
          return null
        },
      },
      { dest: 'hotel-garden', time: 2, label: 'Rooftop Garden (Lift)' },
      { dest: 'hotel-kitchens', time: 2 },
    ],
    onArrive: (g: Game) => {
      g.add('The lobby is warm and softly lit. A concierge in a tailored waistcoat nods from behind a polished brass counter.')
    },
    activities: [
      {
        name: 'Reception',
        script: (g: Game) => {
          g.run('receptionScene', {})
        },
      },
    ],
  },
  'dorm-suite': {
    name: 'Room 101',
    description: 'A compact but well-appointed hotel room with a single bed, a writing desk, and a window overlooking the city rooftops. The bedsheets are crisp, the fixtures polished, and a small steam radiator keeps the chill at bay.',
    image: '/images/dorm-suite.jpg',
    secret: true,
    links: [
      { dest: 'nice-bathroom', time: 1, label: 'En-Suite Bathroom' },
      { dest: 'hotel', time: 1, label: 'Exit to Lobby' },
    ],
    onFirstArrive: script(
      text('You unlock the door and step inside. The room is small but immaculate — polished brass fixtures, crisp sheets, a writing desk by the window. You could get used to this.'),
      when(npcStat('affection', { npc: 'tour-guide' }),
        text('You wonder if Rob the tour guide would like to see it.'),
      ),
    ),
    activities: [
      bedActivity({ quality: 1.3 }),
    ],
  },
  'nice-bathroom': {
    name: 'En-Suite Bathroom',
    description: 'A small but immaculate bathroom with gleaming brass taps, a claw-footed tub, and fluffy towels monogrammed with the Imperial crest. The mirror is framed in ornate copper scrollwork.',
    image: '/images/nice-bathroom.jpg',
    links: [
      { dest: 'dorm-suite', time: 1, label: 'Back to Room' },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
      {
        name: 'Take Shower',
        script: (g: Game) => {
          g.add('You step into the spotless shower cubicle. Hot water flows instantly — the hotel\'s boilers are clearly well maintained.')
          g.timeLapse(10)
          takeWash(g)
        },
      },
      {
        name: 'Relaxing Bath',
        script: (g: Game) => {
          g.add('You fill the claw-footed tub with steaming water and lower yourself in. The brass taps gleam as fragrant steam curls around you. This is considerably nicer than the lodgings.')
          g.timeLapse(60)
          takeWash(g)
          applyRelaxation(g, 60, 1.5)
        },
      },
    ],
  },
  'hotel-kitchens': {
    name: 'Hotel Kitchens',
    description: 'A clattering labyrinth of copper pans, steam ovens, and harried cooks. The air is thick with the smell of roasting meat and fresh bread. Mechanical spit-turners rotate joints of beef over glowing coals, and a brass dumbwaiter rattles between floors.',
    image: '/images/kitchens.jpg',
    secret: true,
    links: [
      { dest: 'hotel', time: 2, label: 'Back to Lobby' },
    ],
  },
  'hotel-bar': {
    name: 'Hotel Bar',
    description: 'A sophisticated drinking establishment with a long mahogany bar, leather armchairs, and brass light fittings that cast a warm amber glow. The shelves behind the bar gleam with bottles of spirits from across the Empire, and a mechanical cocktail mixer whirs softly.',
    image: '/images/hotel/bar.jpg',
    links: [
      { dest: 'hotel', time: 1, label: 'Back to Lobby' },
    ],
    activities: [
      {
        name: 'Order a Drink (15 Kr)',
        symbol: '🍸',
        script: (g: Game) => {
          const crowns = g.player.inventory.find(i => i.id === 'crown')?.number ?? 0
          if (crowns < 15) {
            g.add('The barman polishes a glass and glances at you. "Fifteen krona for a cocktail, madam." You don\'t have enough.')
            return
          }
          g.player.removeItem('crown', 15)
          consumeAlcohol(g, 30)
          g.add('The barman mixes you a cocktail with practiced flair — gin, bitters, and something that fizzes when he adds it. You take a sip. It\'s excellent.')
          g.add({ type: 'text', text: 'Paid 15 Krona.', color: '#d4af37' })
        },
      },
      {
        name: 'Sit at the Bar',
        symbol: '🪑',
        script: (g: Game) => {
          g.run('wait', { minutes: 30 })
          if (!g.inScene) {
            const texts = [
              'You sit at the bar, watching the well-dressed clientele come and go. A businessman argues quietly with his companion. A woman in furs laughs at something her escort says.',
              'You observe the barman\'s mechanical precision as he mixes drinks. The brass fixtures gleam in the lamplight.',
              'You listen to the low murmur of conversation and the clink of glasses. The bar has a hushed, genteel atmosphere quite unlike the Copper Pot.',
            ]
            g.add(texts[Math.floor(Math.random() * texts.length)])
          }
        },
      },
    ],
  },
  'hotel-restaurant': {
    name: 'Hotel Restaurant',
    description: 'An elegant dining room with white tablecloths, silver cutlery, and chandeliers that tinkle softly with the vibration of the steam pipes. Waiters in crisp uniforms glide between tables, and the air carries the scent of fine cuisine.',
    image: '/images/hotel/restaurant.jpg',
    links: [
      { dest: 'hotel', time: 1, label: 'Back to Lobby' },
    ],
    activities: [
      {
        name: 'Light Lunch (25 Kr)',
        symbol: '🥗',
        script: lightLunchScript,
        condition: (g: Game) => g.hourOfDay >= 11 && g.hourOfDay < 15,
      },
      {
        name: 'Fine Dinner (50 Kr)',
        symbol: '🍽',
        script: fineDinnerScript,
        condition: (g: Game) => g.hourOfDay >= 18 && g.hourOfDay < 22,
      },
      {
        name: 'Take Tea (10 Kr)',
        symbol: '☕',
        script: takeTeaScript,
        condition: (g: Game) => g.hourOfDay >= 14 && g.hourOfDay < 18,
      },
    ],
  },
  'hotel-pool': {
    name: 'Hotel Pool',
    description: 'A grand indoor swimming pool beneath a vaulted glass ceiling. Brass pipes feed heated water from the hotel\'s boilers, keeping it pleasantly warm. Marble columns line the edges, and loungers draped with white towels await guests. The air is humid and smells faintly of minerals.',
    image: '/images/hotel/pool.jpg',
    links: [
      { dest: 'hotel', time: 2, label: 'Back to Lobby' },
    ],
    activities: [
      {
        name: 'Swim',
        symbol: '🏊',
        script: swimScript,
      },
      {
        name: 'Relax by the Pool',
        symbol: '☀',
        script: (g: Game) => {
          g.run('wait', { minutes: 30 })
          if (!g.inScene) {
            const texts = [
              'You recline on a lounger and let the warm, humid air relax you. The gentle splash of water is soothing.',
              'You watch other guests swimming lazy lengths. A mechanical attendant offers you a towel.',
              'You close your eyes and listen to the echo of water against marble. This is the life.',
            ]
            g.add(texts[Math.floor(Math.random() * texts.length)])
            applyRelaxation(g, 30, 2.0)
          }
        },
      },
    ],
  },
  'hotel-garden': {
    name: 'Rooftop Garden',
    description: 'A verdant oasis atop the Imperial Hotel, enclosed by brass railings and glass panels that shelter delicate plants from the city\'s soot. Exotic flowers bloom in copper planters, and a small fountain burbles beside wrought-iron benches. The view across Aetheria\'s rooftops is spectacular.',
    image: '/images/hotel/garden.jpg',
    nightImage: '/images/hotel/garden-night.jpg',
    links: [
      { dest: 'hotel', time: 2, label: 'Back to Lobby (Lift)' },
    ],
    onFirstArrive: script(
      text('The lift doors open onto an unexpected paradise. Green leaves and bright flowers surround you, impossibly lush against the industrial skyline. You can see the whole city from here — the university spires, the factory smokestacks, the distant gleam of the river.'),
    ),
    activities: [
      {
        name: 'Enjoy the View',
        symbol: '🌆',
        script: (g: Game) => {
          g.run('wait', { minutes: 20 })
          if (!g.inScene) {
            const hour = g.hourOfDay
            if (hour >= 6 && hour < 10) {
              g.add('You watch the city wake up below. Steam rises from a hundred chimneys as Aetheria begins another day.')
            } else if (hour >= 17 && hour < 21) {
              g.add('The setting sun paints the rooftops in shades of copper and gold. The view is breathtaking.')
            } else if (hour >= 21 || hour < 6) {
              g.add('The city glitters below, gaslights tracing the streets like strings of jewels. Somewhere, a clock tower chimes.')
            } else {
              g.add('You lean against the railing and take in the panoramic view. The whole of Aetheria stretches before you.')
            }
          }
        },
      },
      {
        name: 'Stroll Through Gardens',
        symbol: '🌸',
        script: (g: Game) => {
          g.timeLapse(15)
          g.add('You wander among the flowerbeds, marvelling at orchids and ferns that have no business surviving in this climate. The hotel\'s steam-heated pipes must keep the garden warm even in winter.')
          g.player.modifyStat('Mood', 5)
        },
      },
    ],
  },
  'hotel-suite': {
    name: 'Imperial Suite',
    description: 'The hotel\'s finest accommodation — a spacious suite with a four-poster bed draped in velvet, a sitting area with plush armchairs, and floor-to-ceiling windows overlooking the city. Every surface gleams with brass and polished wood. A mechanical valet stands ready in the corner.',
    image: '/images/hotel/suite.jpg',
    secret: true,
    links: [
      { dest: 'suite-bathroom', time: 1, label: 'En-Suite Bathroom' },
      { dest: 'hotel', time: 2, label: 'Back to Lobby (Lift)' },
    ],
    onFirstArrive: script(
      text('The lift opens directly into the suite. You step out onto thick carpet and take in your surroundings — the four-poster bed, the sitting area, the view that seems to encompass half the city. This is how the other half lives.'),
    ),
    activities: [
      bedActivity({ quality: 1.4 }),
    ],
  },
  'suite-bathroom': {
    name: 'Suite Bathroom',
    description: 'A palatial bathroom with a marble tub large enough to swim in, brass taps shaped like swan necks, and mirrors that seem to go on forever. Fresh flowers sit in crystal vases, and monogrammed towels are stacked on heated rails.',
    image: '/images/nice-bathroom.jpg',
    links: [
      { dest: 'hotel-suite', time: 1, label: 'Back to Suite' },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
      {
        name: 'Take Shower',
        script: (g: Game) => {
          g.add('You step into the marble-clad shower. Multiple brass heads rain hot water from every angle.')
          g.timeLapse(10)
          takeWash(g)
        },
      },
      {
        name: 'Luxurious Bath',
        script: (g: Game) => {
          g.add('You fill the enormous marble tub with steaming water and add fragrant oils from cut-glass bottles. Sinking in, you feel like royalty. The heated towel rail keeps your robe warm for when you emerge.')
          g.timeLapse(60)
          takeWash(g)
          g.player.modifyStat('Mood', 10)
          applyRelaxation(g, 60, 2.0)
        },
      },
    ],
  },
}

// Register all hotel location definitions when module loads
Object.entries(HOTEL_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
