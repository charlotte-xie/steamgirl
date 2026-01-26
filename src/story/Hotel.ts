import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import type { CardDefinition } from '../model/Card'
import type { Card } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { makeScripts } from '../model/Scripts'
import { script, text, when, npcStat } from '../model/ScriptDSL'
import { freshenUp, takeWash } from './Effects'

// ============================================================================
// HOTEL BOOKING CARD
// ============================================================================

const ROOM_PRICE = 400

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

// ============================================================================
// RECEPTION SCRIPTS
// ============================================================================

const addReceptionOptions = (g: Game) => {
  if (!g.player.hasCard('hotel-booking')) {
    g.addOption('receptionBookRoom', {}, `Book a Room (${ROOM_PRICE} Kr)`)
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
  receptionAskWork: (g: Game) => {
    g.add('The concierge raises an eyebrow. "We do take on staff from time to time — chambermaids, kitchen hands, that sort of thing. Speak to the head cook if you\'re interested. The kitchens are through the back."')
    addReceptionOptions(g)
  },
  receptionLeave: (g: Game) => {
    g.run('endScene', { text: 'You step away from the reception desk.' })
  },
}

makeScripts(receptionScripts)

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
      when(npcStat('tour-guide', 'affection', 1),
        text('You wonder if Rob the tour guide would like to see it.'),
      ),
    ),
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
}

// Register all hotel location definitions when module loads
Object.entries(HOTEL_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
