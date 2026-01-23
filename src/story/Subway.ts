import type { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { getLocation, registerLocation } from '../model/Location'
import { makeScripts } from '../model/Scripts'

const SUBWAY_FARE = 3
const SLOT_PLAY_COST = 2

// 50% nothing; 40% 1 kr; 8% 5 kr; 2% 30 kr : Average = 1.5
const slotMachineRoll = (): number => {
  const r = Math.random()
  if (r < 0.5) return 0
  if (r < 0.9) return 1
  if (r < 0.98) return 5
  return 30
}

const checkSubwayFare = (g: Game): string | null => {
  const n = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
  return n < SUBWAY_FARE ? 'You need 3 Krona for the subway.' : null
}

/** Common onFollow for all subway travel links: wait 0–8 min for the train; only if no scene triggered, pay fare and "You travel to X". Go script continues with timeLapse + move. */
const subwayOnFollow = (g: Game, destId: LocationId) => {
  const waitMin = Math.floor(Math.random() * 9) // 0–8 minutes
  g.run('wait', { minutes: waitMin, text: 'You wait for the underground train.' })
  if (!g.inScene) {
    g.player.removeItem('crown', SUBWAY_FARE)
    const destName = getLocation(destId)?.name ?? destId
    g.add('You travel to ' + destName + '.')
  }
}

/** Subway line order (Docks → Lowtown → Terminus → University → Airport). Nav travel links are shown in this order. */
const SUBWAY_LINE_ORDER: [LocationId, string, LocationId][] = [
  ['subway-docks', 'To Docks', 'docks'],
  ['subway-lowtown', 'To Lowtown', 'lowtown'],
  ['subway-terminus', 'To Terminus', 'station'],
  ['subway-university', 'To University', 'school'],
  ['subway-airport', 'To Airport', 'airport'],
]

const SUBWAY_INDEX = new Map(SUBWAY_LINE_ORDER.map(([id], i) => [id, i]))
const SUBWAY_MIN_PER_STOP = 4

/** Stops between two subway stations along the line (absolute positions). */
const stopsBetween = (from: LocationId, to: LocationId): number => {
  const i = SUBWAY_INDEX.get(from)
  const j = SUBWAY_INDEX.get(to)
  if (i == null || j == null) return 1
  return Math.abs(j - i)
}

/** Builds a subway travel link (fare, onFollow, etc.). imageLocation = main area for nav thumbnail. */
export const subwayLink = (dest: LocationId, label: string, time: number, imageLocation?: LocationId) => ({
  dest,
  time,
  label,
  cost: SUBWAY_FARE,
  travel: true as const,
  checkAccess: checkSubwayFare,
  onFollow: (g: Game, _p: {}) => subwayOnFollow(g, dest),
  ...(imageLocation != null && { imageLocation }),
})

/** Subway travel links in line order, excluding the given station. Time = 4 min × stops between. */
const subwayLinksFrom = (fromId: LocationId) =>
  SUBWAY_LINE_ORDER.filter(([id]) => id !== fromId).map(([dest, label, imageLoc]) =>
    subwayLink(dest, label, SUBWAY_MIN_PER_STOP * stopsBetween(fromId, dest), imageLoc)
  )

// Subway platforms: not mainLocation; appear as Places from main areas; travel between them as Travel
const SUBWAY_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  'subway-university': {
    name: 'University Underground',
    description: 'Steam and brass; the underground platform under the university grounds.',
    image: '/images/subway.jpg',
    nightImage: '/images/subway-night.jpg',
    links: [
      ...subwayLinksFrom('subway-university'),
      { dest: 'school', time: 2, label: 'Exit to University' },
    ],
  },
  'subway-lowtown': {
    name: 'Lowtown Underground',
    description: 'A dim platform in the industrial depths. Trains clank and hiss.',
    image: '/images/subway.jpg',
    nightImage: '/images/subway-night.jpg',
    links: [
      ...subwayLinksFrom('subway-lowtown'),
      { dest: 'lowtown', time: 2, label: 'Exit to Lowtown' },
    ],
    onFirstArrive: (g: Game) => {
      g.run('discoverLocation', { location: 'lowtown', text: 'This area is a scary place at night, by all accounts.' })
    },
    activities: [
      {
        name: 'Slot Machine',
        symbol: '◎',
        script: (g: Game) => g.run('slotMachineScene', {}),
      },
    ],
  },
  'subway-terminus': {
    name: 'Terminus Underground',
    description: 'The underground stop beneath Ironspark Terminus. Crowds and steam.',
    image: '/images/subway.jpg',
    links: [
      ...subwayLinksFrom('subway-terminus'),
      { dest: 'station', time: 2, label: 'Exit to Terminus' },
    ],
  },
  'subway-airport': {
    name: 'Airport Underground',
    description: 'The platform beneath the airfield. Dirigibles and steam-ships cast long shadows through the vents.',
    image: '/images/subway.jpg',
    nightImage: '/images/subway-night.jpg',
    links: [
      ...subwayLinksFrom('subway-airport'),
      { dest: 'airport', time: 2, label: 'Exit to Airport' },
    ],
  },
  'subway-docks': {
    name: 'Docks Underground',
    description: 'A dank platform by the waterfront. The tang of salt and coal steam hangs in the air.',
    image: '/images/subway.jpg',
    nightImage: '/images/subway-night.jpg',
    links: [
      ...subwayLinksFrom('subway-docks'),
      { dest: 'docks', time: 2, label: 'Exit to Docks' },
    ],
  },
}

const addSlotMachineOptions = (g: Game) => {
  g.addOption('slotMachinePlay', {}, 'Play (2 Kr)')
  if (g.player.hasSkill('Aetherics', 1)) g.addOption('slotMachineHack', {}, 'Hack')
  g.addOption('slotMachineLeave', {}, 'Leave')
}

const slotMachineScripts = {
  slotMachineScene: (g: Game) => {
    g.add('A brass slot machine hums in the corner. Gears and cogs spin behind the glass.')
    addSlotMachineOptions(g)
  },
  slotMachinePlay: (g: Game) => {
    const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
    if (crown < SLOT_PLAY_COST) {
      g.add('You need 2 Krona to play.')
      addSlotMachineOptions(g)
      return
    }
    g.player.removeItem('crown', SLOT_PLAY_COST)
    g.timeLapse(2)
    const win = slotMachineRoll()
    g.add('The reels clatter to a stop.')
    if (win === 0) {
      g.add('You win nothing. So sad.')
    } else {
      g.run('gainItem', { item: 'crown', number: win, text: `You win ${win} Krona!` })
      if (win >= 25) g.run('addStat', { stat: 'Mood', change: 3, max: 60 })
      else if (win >= 5) g.run('addStat', { stat: 'Mood', change: 1, max: 50 })
    }
    addSlotMachineOptions(g)
  },
  slotMachineHack: (g: Game) => {
    g.timeLapse(15)
    const ok = g.player.skillTest('Aetherics', 0)
    g.add('You focus on the machine’s aetheric signature and reach for the payout relay.')
    if (ok) {
      g.add('The mechanism yields. Coins clink into the tray.')
      g.run('gainItem', { item: 'crown', number: 25, text: 'You win 25 Krona!' })
      g.run('addStat', { stat: 'Mood', change: 3, max: 60 })
    } else {
      g.add("The hack fails. The machine's safeguards hold.")
    }
    addSlotMachineOptions(g)
  },
  slotMachineLeave: (g: Game) => {
    g.run('endScene', { text: 'You step away from the slot machine.' })
  },
}
makeScripts(slotMachineScripts)

Object.entries(SUBWAY_DEFINITIONS).forEach(([id, def]) => registerLocation(id, def))
