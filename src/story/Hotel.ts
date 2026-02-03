import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import type { CardDefinition } from '../model/Card'
import type { Card } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { makeScripts } from '../model/Scripts'
import type { Instruction } from '../model/ScriptDSL'
import { script, text, paragraph, when, npcStat, seq, cond, hasItem, removeItem, time, eatFood, addStat, random, run, scenes, scene, addItem, say, option, npcInteract, npcLeaveOption, addNpcStat, learnNpcName, hideNpcImage, showNpcImage, wait, discoverLocation, hasCard, npcLocation, move, lt, sub, gameTime, not, inScene, hourBetween, chance, wantsIntimacy } from '../model/ScriptDSL'
import { NPC, registerNPC, PRONOUNS } from '../model/NPC'
import { freshenUp, applyMakeup, consumeAlcohol, applyRelaxation, riskDirty } from './Effects'
import { bedActivity } from './systems/Sleep'
import { staffDecencyGate } from './Public'

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

// ----- RECEPTION: Book a Room (imperative — needs runtime crown/date checks) -----
makeScripts({
  receptionBookRoom: (g: Game) => {
    g.add('"Certainly. We have the following available:"')
    const crowns = g.player.inventory.find(i => i.id === 'crown')?.number ?? 0
    if (!g.player.hasCard('hotel-booking')) {
      g.scene.options.push({ type: 'button', action: 'receptionDoBookRoom', label: `Room 101 (${ROOM_PRICE} Kr)`, disabled: crowns < ROOM_PRICE })
    }
    if (!g.player.hasCard('suite-booking')) {
      g.scene.options.push({ type: 'button', action: 'receptionDoBookSuite', label: `Imperial Suite (${SUITE_PRICE} Kr)`, disabled: crowns < SUITE_PRICE })
    }
    if (g.player.hasCard('hotel-booking') && g.player.hasCard('suite-booking')) {
      g.add('"You already have rooms booked with us, madam."')
    }
    g.addOption('receptionScene', 'Back')
  },
  receptionDoBookRoom: (g: Game) => {
    g.player.removeItem('crown', ROOM_PRICE)
    const tomorrow = new Date(g.date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    const expiresAt = Math.floor(tomorrow.getTime() / 1000)
    g.addCard('hotel-booking', 'Access', { expiresAt }, true)
    g.getLocation('dorm-suite').discovered = true
    g.add('The concierge produces a polished brass key from a hook behind the counter.')
    g.add('"Room 101, up the stairs and first on the left. Checkout is at eleven tomorrow morning. Enjoy your stay."')
    g.add({ type: 'text', text: `Paid ${ROOM_PRICE} Krona.`, color: '#d4af37' })
    g.addOption('receptionScene', 'Back')
  },
  receptionDoBookSuite: (g: Game) => {
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
    g.addOption('receptionScene', 'Back')
  },
})

// ----- RECEPTION: DSL scripts -----

const VISIT_COOLDOWN = 6 * 60 * 60 // 6 hours in seconds

const receptionAshworthBusy: Instruction = seq(
  '"I\'m sorry, Lord Ashworth is busy at the moment. Perhaps try again later."',
  option('Back', run('receptionScene')),
)

const receptionAskAshworthScene: Instruction = cond(
  npcLocation('bar-patron', 'hotel-bar'),
  seq(
    '"Lord Ashworth? I believe he\'s in the bar, madam."',
    'The concierge gestures towards the bar entrance.',
    option('Go there',
      move('hotel-bar'),
      run('approach', { npc: 'bar-patron' }),
    ),
    option('Maybe later', run('receptionScene')),
  ),
  npcLocation('bar-patron', 'room-533'),
  cond(
    lt(sub(gameTime(), npcStat('lastVisited', { npc: 'bar-patron' })), VISIT_COOLDOWN),
    receptionAshworthBusy,
    seq(
      '"Lord Ashworth is in his room, madam. Room 533."',
      'The concierge lowers his voice. "Shall I send you up?"',
      option('Go there',
        discoverLocation('room-533'),
        move('room-533', 2),
        run('interact', { npc: 'bar-patron', script: 'room533Welcome' }),
      ),
      option('Maybe later', run('receptionScene')),
    ),
  ),
  seq(
    '"I\'m sorry, Lord Ashworth is not available at the moment. Perhaps try again later this evening — he\'s usually at the bar from eight."',
    option('Back', run('receptionScene')),
  ),
)

const receptionAskFor: Instruction = seq(
  '"Of course. What can I help you with?"',
  option('Work',
    'The concierge raises an eyebrow. "We do take on staff from time to time — chambermaids, kitchen hands, that sort of thing. Speak to the head cook if you\'re interested. The kitchens are through the back."',
    discoverLocation('hotel-kitchens', 'You note the way to the kitchens.'),
  ),
  when(npcStat('madeLove', { npc: 'bar-patron' }),
    option('Lord Ashworth', receptionAskAshworthScene),
  ),
  option('Back', run('receptionScene')),
)

const receptionScene: Instruction = seq(
  cond(
    hasCard('hotel-booking'),
    text('The concierge looks up and smiles. "Welcome back. Your room is ready, of course — Room 101, just through there."'),
    seq(
      'You approach the polished brass counter. The concierge straightens his waistcoat and offers a practised smile.',
      '"Good day. Welcome to the Imperial. How may I be of service?"',
    ),
  ),
  option('Book a Room', run('receptionBookRoom')),
  option('Ask for...', receptionAskFor),
  option('Leave', run('endScene', { text: 'You step away from the reception desk.' })),
)

makeScripts({
  receptionScene: script(receptionScene),
})

// Additional scripts for hotel activities
makeScripts({
  showPayment: (g: Game, params: { amount?: number }) => {
    const amount = params.amount ?? 0
    g.add({ type: 'text', text: `Paid ${amount} Krona.`, color: '#d4af37' })
  },
  consumeAlcohol: (g: Game, params: { amount?: number }) => {
    consumeAlcohol(g, params.amount ?? 0)
  },
  restorePoolOutfit: (g: Game) => {
    if (g.player.outfits['_before-pool']) {
      g.add('You duck into the changing room and get dressed.')
      g.player.wearOutfit('_before-pool')
      g.player.deleteOutfit('_before-pool')
      g.player.calcStats()
    }
  },
})

// Room 533 location is defined below — all Ashworth scripts live in hotel/Patrons.ts

// ============================================================================
// ACTIVITY SCRIPTS (DSL)
// ============================================================================

const lightLunchScript = script(
  cond(
    hasItem('crown', 25),
    seq(
      removeItem('crown', 25),
      run('showPayment', { amount: 25 }),
      time(30),
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
      time(90),
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
      time(30),
      text('A waiter brings you a pot of perfectly brewed tea and a tiered stand of finger sandwiches, scones with clotted cream, and tiny pastries. It\'s delightfully civilised.'),
      eatFood(40),
      addStat('Mood', 5, { max: 90 }),
    ),
    text('You eye the tiered cake stands at nearby tables with longing. Ten krona for afternoon tea is beyond your means right now.'),
  ),
)

const swimScript = script(
  time(30),
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
      { dest: 'default', time: 5, travel: true, label: 'Exit to City Centre' },
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
      staffDecencyGate(50, 'default', [
        seq('The doorman takes one look at you and steps firmly into your path.', say('I\'m sorry, madam, but I cannot allow you into the Imperial dressed like that. Standards must be maintained.')),
        seq('A uniformed bellhop intercepts you before you reach the front desk.', say('I\'m afraid we have a strict dress code, madam. You\'ll need to come back properly attired.')),
        seq('The concierge looks up, and his professional smile freezes. He rises from behind the counter.', say('Madam, I must ask you to leave. The Imperial has a reputation to uphold.')),
      ])(g)
      if (g.currentLocation !== 'hotel') return
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
    isBedroom: true,
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
    private: true,
    links: [
      { dest: 'dorm-suite', time: 1, label: 'Back to Room' },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
      {
        name: 'Apply Makeup',
        script: (g: Game) => applyMakeup(g),
      },
      {
        name: 'Take Shower',
        script: ['shower', { text: 'You undress and step into the spotless shower cubicle. Hot water flows instantly — the hotel\'s boilers are clearly well maintained.' }],
      },
      {
        name: 'Relaxing Bath',
        script: ['bath', { text: 'You undress and fill the claw-footed tub with steaming water. The brass taps gleam as fragrant steam curls around you. This is considerably nicer than the lodgings.', quality: 1.5 }],
      },
    ],
  },
  'hotel-kitchens': {
    name: 'Hotel Kitchens',
    description: 'A clattering labyrinth of copper pans, steam ovens, and harried cooks. The air is thick with the smell of roasting meat and fresh bread. Mechanical spit-turners rotate joints of beef over glowing coals, and a brass dumbwaiter rattles between floors.',
    image: '/images/hotel/kitchens.webp',
    secret: true,
    links: [
      { dest: 'hotel', time: 2, label: 'Back to Lobby' },
    ],
    onArrive: (g: Game) => {
      g.getNPC('hotel-chef')
    },
  },
  'hotel-bar': {
    name: 'Hotel Bar',
    description: 'A sophisticated drinking establishment with a long mahogany bar, leather armchairs, and brass light fittings that cast a warm amber glow. The shelves behind the bar gleam with bottles of spirits from across the Empire, and a mechanical cocktail mixer whirs softly.',
    image: '/images/hotel/bar.jpg',
    links: [
      { dest: 'hotel', time: 1, label: 'Back to Lobby' },
    ],
    onArrive: (g: Game) => {
      staffDecencyGate(50, 'hotel', [
        seq('The barman looks up from polishing a glass and frowns.', say('I\'m going to have to ask you to leave, madam. We have standards here.')),
        seq('A waiter hurries over before you can sit down.', say('I\'m sorry, but you can\'t be in here like that. Back to the lobby, please.')),
        seq('The barman sets down his cocktail shaker with a pointed look.', say('Not dressed like that, you\'re not. Out.')),
      ])(g)
      if (g.currentLocation !== 'hotel-bar') return
    },
    onWait: (g: Game) => {
      // Only appears 8pm–10pm, 20% chance per chunk while sitting at the bar
      const hour = g.hourOfDay
      if (hour < 20 || hour >= 22) return
      const patron = g.getNPC('bar-patron')
      if (patron.location === 'hotel-bar' && Math.random() < 0.2) {
        g.run('approach', { npc: 'bar-patron' })
      }
    },
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
            ]
            // Only compare to the Copper Pot if the player has actually been there
            if (g.getLocation('copper-pot-tavern').numVisits > 0) {
              texts.push('You listen to the low murmur of conversation and the clink of glasses. The bar has a hushed, genteel atmosphere quite unlike the Copper Pot.')
            } else {
              texts.push('You listen to the low murmur of conversation and the clink of glasses. The bar has a hushed, genteel atmosphere.')
            }
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
    onArrive: staffDecencyGate(60, 'hotel', [
      seq('The maître d\' steps smoothly into your path.', say('I\'m terribly sorry, madam, but I cannot seat you. The restaurant has a dress code.'), 'He gestures firmly toward the lobby.'),
      seq('A waiter intercepts you at the entrance.', say('I\'m afraid we can\'t allow — that is to say, the restaurant requires appropriate attire, madam.')),
      seq('The maître d\' takes one look at you and shakes his head with practised diplomacy.', say('Perhaps when you are more suitably dressed, madam. Good day.')),
    ]),
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
      { dest: 'pool-changing', time: 1, label: 'Changing Room' },
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
  'pool-changing': {
    name: 'Pool Changing Room',
    description: 'A clean, tiled changing room with wooden cubicles, brass hooks, and a long mirror. Folded towels are stacked on a marble shelf, and the air carries the warmth and mineral scent of the pool beyond.',
    image: '/images/lowtown/ladies.jpg',
    private: true,
    links: [
      { dest: 'hotel-pool', time: 1, label: 'Back to Pool' },
    ],
    activities: [
      {
        name: 'Change into Swimwear',
        symbol: '👙',
        condition: (g: Game) => {
          // Only show if player has swimwear and isn't already wearing it
          const hasBikini = g.player.inventory.some(i => i.id === 'bikini-top')
          const wearingBikini = g.player.getWornItems().some(i => i.id === 'bikini-top')
          return hasBikini && !wearingBikini
        },
        script: (g: Game) => {
          g.player.saveOutfit('_before-pool')
          g.player.stripAll()
          g.player.wearItem('bikini-top')
          g.player.wearItem('bikini-bottom')
          g.player.calcStats()
          g.add('You change into your bikini and hang your clothes in the cubicle.')
        },
      },
      {
        name: 'Get Dressed',
        symbol: '👗',
        condition: (g: Game) => !!g.player.outfits['_before-pool'],
        script: (g: Game) => {
          g.player.wearOutfit('_before-pool')
          g.player.deleteOutfit('_before-pool')
          g.player.calcStats()
          g.add('You towel off and change back into your clothes.')
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
    onArrive: staffDecencyGate(40, 'hotel', [
      seq('A garden attendant hurries over, looking flustered.', say('I\'m sorry, madam, but you can\'t be up here like that. I\'ll have to ask you to go back to the lobby.')),
      seq('The lift attendant gives you a scandalised look as the doors open onto the garden.', say('I think you\'d better go back down, madam. Dressed like that, you\'ll frighten the orchids.')),
    ]),
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
  'room-533': {
    name: 'Room 533',
    description: 'A compact but well-appointed hotel room with a single bed, a writing desk, and a window overlooking the city rooftops. The bedsheets are crisp, the fixtures polished, and a small steam radiator keeps the chill at bay. A crystal decanter of whisky sits on the dresser.',
    image: '/images/dorm-suite.jpg',
    secret: true,
    isBedroom: true,
    afterUpdate: (g: Game) => { g.getNPC('bar-patron').stats.set('lastVisited', g.time) },
    links: [
      { dest: 'room-533-bathroom', time: 1, label: 'Bathroom' },
    ],
    activities: [
      {
        name: 'Bed',
        symbol: '🛏',
        script: (g: Game) => {
          g.run('interact', { npc: 'bar-patron', script: 'ashworthBed' })
        },
      },
    ],
  },
  'room-533-bathroom': {
    name: 'En-Suite Bathroom',
    description: 'A small but spotless bathroom with white tiles and polished brass fixtures. A claw-footed tub sits beneath a frosted window, and monogrammed towels hang from a heated rail.',
    image: '/images/nice-bathroom.jpg',
    private: true,
    afterUpdate: cond(
      not(inScene()),
      cond(
        npcLocation('bar-patron', 'room-533'),
        cond(
          wantsIntimacy('bar-patron'),
          cond(chance(0.15), run('interact', { npc: 'bar-patron', script: 'bathroomIntimacy' })),
          hourBetween(23, 6),
          run('interact', { npc: 'bar-patron', script: 'bathroomIntrusion' }),
        ),
      ),
    ),
    links: [
      { dest: 'room-533', time: 1, label: 'Back to Room' },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
      {
        name: 'Apply Makeup',
        script: (g: Game) => applyMakeup(g),
      },
      {
        name: 'Take Shower',
        script: ['shower', { text: 'You undress and step into the tiled shower. The water is hot and the pressure surprisingly good for a hotel.' }],
      },
      {
        name: 'Take a Bath',
        script: ['bath', { text: 'You undress and run the brass taps until the claw-footed tub is full of steaming water. You sink in and let out a long breath.' }],
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
    private: true,
    links: [
      { dest: 'hotel-suite', time: 1, label: 'Back to Suite' },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
      {
        name: 'Apply Makeup',
        script: (g: Game) => applyMakeup(g),
      },
      {
        name: 'Take Shower',
        script: ['shower', { text: 'You undress and step into the marble-clad shower. Multiple brass heads rain hot water from every angle.' }],
      },
      {
        name: 'Luxurious Bath',
        script: ['bath', { text: 'You undress and fill the enormous marble tub with steaming water, adding fragrant oils from cut-glass bottles. Sinking in, you feel like royalty.', quality: 2.0, mood: 10 }],
      },
    ],
  },
}

// Register all hotel location definitions when module loads
Object.entries(HOTEL_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})

// ============================================================================
// CHEF NPC
// ============================================================================

/** Kitchen work scene — 4 hours of labour with random events. */
function kitchenWorkShift(): Instruction {
  return scenes(
    // Page 1 — assigned tasks
    scene(
      hideNpcImage(),
      say('Right then. Apron on, sleeves up. You can start on the vegetables.'),
      random(
        'You tie on a heavy canvas apron and set to work peeling a mountain of potatoes. The kitchen clatters around you — pans banging, orders shouted, steam hissing from every valve.',
        'You are handed a chopping board and a heap of carrots. The blade is sharp and the work is relentless. Around you the kitchen roars like a living thing.',
        'You are set to scrubbing pans in a deep copper sink. The water is scalding, the grease stubborn, and the pile never seems to shrink.',
      ),
      wait(60),
    ),
    // Page 2 — mid-shift random event
    scene(
      random(
        seq(
          'A pot boils over on the range, sending a gout of steam across the kitchen. You leap back just in time.',
          say('Mind yourself! Burns don\'t heal quick in this heat.'),
          'You mop up the spillage and get back to it.',
        ),
        seq(
          'The dumbwaiter bell rings frantically — a rush order from the dining room. The kitchen erupts into organised chaos.',
          say('Move it, move it! Table twelve wants their pheasant yesterday!'),
          'You find yourself ferrying hot plates to the dumbwaiter at a sprint.',
        ),
        seq(
          'One of the kitchen hands drops a tray of copper moulds with an almighty crash. Everyone freezes.',
          say('Pick those up and get back to work, the lot of you!'),
          'You help gather the scattered moulds. The hand gives you a grateful nod.',
        ),
        seq(
          'During a lull, another kitchen hand — a girl about your age — slides you a cup of tea.',
          '"First shift? You\'re doing well. He doesn\'t shout at the ones he likes."',
          'You sip the tea gratefully before the next wave of orders arrives.',
        ),
      ),
      wait(60),
    ),
    // Page 3 — late shift
    scene(
      random(
        'The pace finally slows as the evening service winds down. Your arms ache and your apron is splattered with grease.',
        'The last orders trickle in and the frantic energy of the kitchen subsides into a weary rhythm of cleaning and putting away.',
        'You scrub down the counters as the other hands begin to drift away. Your back is sore and your hands are red from the hot water.',
      ),
      wait(60),
    ),
    // Page 4 — shift end and payment
    scene(
      showNpcImage(),
      wait(60),
      say('That\'ll do. Not bad for a new pair of hands.'),
      random(
        'He counts out coins from a brass tin and drops them into your palm.',
        'He pulls a small pouch from his apron and counts out your wages.',
      ),
      addItem('crown', 20),
      paragraph({ text: 'You earned 20 Krona.', color: '#d4af37' }),
      addNpcStat('affection', 4, { max: 20, hidden: true }),
      addStat('Fitness', 1, { max: 20, chance: 0.5, hidden: true }),
      random(
        say('Same time tomorrow if you want it. Now get out of my kitchen.'),
        say('You\'ll do. Come back when you need the work.'),
      ),
    ),
  )
}

const chefChatOptions = seq(
  option('Chat', npcInteract('chat')),
  option('Ask for work', npcInteract('work')),
  npcLeaveOption('You leave the chef to his kitchen.'),
)

registerNPC('hotel-chef', {
  name: 'Chef Morel',
  uname: 'head chef',
  description:
    'A barrel-chested man with a bristling moustache and forearms like hams. His whites are ' +
    'immaculate despite the chaos around him, and he commands the kitchen with a voice that ' +
    'cuts through the clatter of pans and hiss of steam. A row of brass-handled knives hangs ' +
    'from his belt like medals.',
  image: '/images/hotel/chefs_1.webp',
  speechColor: '#e07020',
  pronouns: PRONOUNS.he,

  generate: (_game: Game, npc: NPC) => {
    npc.location = 'hotel-kitchens'
    npc.stats.set('affection', 0)
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('hotel-chef')
    npc.followSchedule(game, [
      [6, 22, 'hotel-kitchens'],
    ])
  },

  onFirstApproach: seq(
    'A broad man in chef\'s whites looks up from a simmering stockpot and fixes you with a sharp eye.',
    say('Who let you in here? This isn\'t the dining room.'),
    'You explain that the concierge mentioned there might be work.',
    say('Did he now. Well, I\'m Morel. Head chef. And this is my kitchen.'),
    'He looks you up and down, assessing.',
    say('I can always use an extra pair of hands. It\'s hard graft, mind — four hours on your feet. Twenty Krona. Interested?'),
    learnNpcName(),
    chefChatOptions,
  ),

  onApproach: seq(
    cond(
      npcStat('affection', { min: 15 }),
      random(
        say('Ah, there she is. My best kitchen hand. What can I do for you?'),
        say('Back again? Good. I like the ones who keep showing up.'),
      ),
      npcStat('affection', { min: 5 }),
      random(
        say('You again. Good — I remember you. What is it?'),
        say('Back for more, are you? At least you\'re keen.'),
      ),
      random(
        say('Yes? Make it quick — I have a sauce that won\'t reduce itself.'),
        say('What do you want? I\'m busy.'),
      ),
    ),
    chefChatOptions,
  ),

  scripts: {
    chat: seq(
      random(
        seq(
          say('This kitchen has been here since the hotel opened in eighteen sixty-two. Every pan has a story.'),
          'He taps a battered copper pot with obvious affection.',
        ),
        seq(
          say('The secret to a good stock? Patience. Low heat, twelve hours, and no peeking.'),
          'He stirs the stockpot with a long brass ladle.',
        ),
        seq(
          say('I trained in Montpellier before I came to Aetheria. French kitchens are brutal — this is a holiday by comparison.'),
          'He chuckles, which is slightly terrifying.',
        ),
        seq(
          say('The mechanical spit-turners are new. I didn\'t trust them at first, but they keep a better rhythm than any boy I\'ve hired.'),
          'He watches the gleaming brass mechanism rotate a joint of beef with hypnotic precision.',
        ),
      ),
      addNpcStat('affection', 1, { max: 20, hidden: true }),
      chefChatOptions,
    ),

    work: (game: Game) => {
      if (game.hourOfDay >= 18) {
        game.getNPC('hotel-chef').say('Too late for a shift today. Come back in the morning — I need you fresh, not half-asleep.')
        game.run(chefChatOptions)
        return
      }
      game.run(kitchenWorkShift())
      // After the scenes complete, apply dirtiness
      riskDirty(game, 0.8)
    },
  },
})
