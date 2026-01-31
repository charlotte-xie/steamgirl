/**
 * Gerald Moss — Landlord
 *
 * A weathered property manager in the backstreets. Gruff but not unkind.
 * He's seen countless tenants come and go, and he knows the building
 * and the neighbourhood better than anyone. His office is a cramped
 * room off the stairwell, piled with ledgers and rent receipts.
 *
 * Schedule: weekdays 9-12 and 16-18 in his office. Otherwise absent.
 */

import { Game } from '../../model/Game'
import { registerNPC } from '../../model/NPC'
import {
  say, npcLeaveOption,
  seq, random, when,
  text, time, move,
  scene, scenes,
  hideNpcImage,
  learnNpcName, discoverLocation,
  addItem, addQuest,
  npcStat,
} from '../../model/ScriptDSL'

const WEEKDAYS = [1, 2, 3, 4, 5]

registerNPC('landlord', {
  name: 'Gerald Moss',
  uname: 'landlord',
  description: 'A weathered man with the tired eyes of someone who\'s managed properties in the backstreets for too long. His clothes are serviceable but worn, and he moves with the deliberate pace of someone conserving energy. Despite his gruff exterior, there\'s a hint of kindness in his manner — he\'s seen countless tenants come and go, and he knows how to spot the ones who\'ll cause trouble versus those who just need a place to rest their head.',
  image: '/images/npcs/Landlord.jpg',
  speechColor: '#b895ae',

  generate: (_game: Game, npc) => {
    npc.location = null
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('landlord')
    npc.followSchedule(game, [
      [9, 12, 'landlord-office', WEEKDAYS],
      [16, 18, 'landlord-office', WEEKDAYS],
    ])
  },

  onApproach: seq(
    // First meeting handled by showAround, so this is for repeat encounters
    random(
      seq(
        text('Gerald is at his desk, half-buried behind a stack of ledgers. He glances up.'),
        say('Afternoon. Something I can help you with?'),
      ),
      seq(
        text('Gerald is sorting through a pile of receipts, muttering numbers under his breath. He notices you in the doorway.'),
        say('Come in, come in. Don\'t stand on ceremony.'),
      ),
      seq(
        text('Gerald is leaning back in his chair with a cup of tea, staring at the ceiling as though it owes him money.'),
        say('Ah. Hello. Take a seat if you can find one.'),
      ),
    ),
    when(npcStat('affection', { min: 10 }),
      random(
        seq(
          say('You\'re settling in all right, I hope? No trouble with the other tenants?'),
        ),
        seq(
          say('You know, you\'re one of the quieter ones. I appreciate that.'),
        ),
      ),
    ),
    npcLeaveOption('You leave Gerald to his paperwork.', 'Right then. You know where I am.', 'Leave'),
  ),

  onWait: random(
    text('Gerald turns a page in his ledger and sighs.'),
    text('Gerald sips his tea and stares at a damp patch on the wall with evident resignation.'),
    text('Gerald scratches something out in his ledger and rewrites it, shaking his head.'),
  ),

  scripts: {
    showAround: scenes(
      // Scene 1: Landlord greets on backstreet and introduces himself
      scene(
        text('A weathered figure steps out from a doorway.'),
        say("{pc}, I presume? Gerald Moss\u2014I'm your landlord. Pleasure to meet you. You're all paid up for two weeks. Let me show you around."),
        learnNpcName(),
        time(5),
      ),
      // Scene 2: Landlord leads you into the building
      scene(
        hideNpcImage(),
        time(1),
        move('stairwell'),
        discoverLocation('stairwell'),
        text('He leads you through a narrow doorway and into the building. The stairwell is dimly lit by gas lamps, the walls lined with faded wallpaper. The smell of coal smoke and old wood fills the air.'),
        say('Mind your step on these stairs. The third one creaks something awful.'),
      ),
      // Scene 3: Landlord shows bathroom
      scene(
        time(2),
        text('He leads you down the hallway on the first floor.'),
        say("This is the bathroom - it's shared with the other tenants. Keep it clean, won't you?"),
        move('bathroom'),
      ),
      // Scene 4: Landlord shows bedroom and hands over key
      scene(
        time(3),
        move('bedroom'),
        text("You follow your landlord to your room. It's a small room, but nice enough and all you need right now. He produces a brass key from his pocket and hands it to you."),
        say("Here's your key. Enjoy your stay."),
        addItem('room-key'),
        addQuest('attend-university', { silent: true }),
      ),
    ),
  },
})
