/**
 * Rob Hayes — Tour Guide
 *
 * Rob is one of the first NPCs the player meets. He's a genial, eager
 * puppy-dog type: warm, enthusiastic, and easily impressed. He genuinely
 * likes people and the city, and takes real pleasure in showing newcomers
 * around.
 *
 * Romance path:
 * - Affection starts at 0. Taking the city tour gives a hidden +1.
 * - Inviting him to see the hotel room gives +10 (he's very impressed).
 * - Flirting gives +3 each time, capped at 50 (requires Flirtation > 0).
 * - At higher affection levels (future): he starts bringing the player
 *   small gifts, suggests outings, and becomes a possible romance option.
 *
 * Schedule: Station 9am–6pm daily. Can be moved to dorm-suite via the
 * invite-to-room interaction; returns to schedule when the player leaves.
 */

import { Game } from '../../model/Game'
import { NPC, registerNPC } from '../../model/NPC'
import {
  text, say, npcLeaveOption, npcInteract,
  seq, when, random, cond,
  addNpcStat, moveNpc,
  discoverLocation, option, scenes,
  move, timeLapse,
  hideNpcImage, showNpcImage,
  hasCard, hasStat, inLocation,
  run,
} from '../../model/ScriptDSL'

registerNPC('tour-guide', {
  name: 'Rob Hayes',
  uname: 'tour guide',
  description:
    'A genial man with a warm smile and a well-worn guidebook tucked under his arm. ' +
    'His clothes are practical but neat, and he moves with the easy confidence of ' +
    'someone who knows every street and alley of Aetheria. He takes genuine pleasure ' +
    'in showing newcomers around, and his enthusiasm for the city is infectious. The ' +
    'brass badge pinned to his coat marks him as an official tour guide.',
  image: '/images/npcs/TourGuide.jpg',
  speechColor: '#94a3b8',

  generate: (_game: Game, npc: NPC) => {
    npc.location = 'station'
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('tour-guide')
    // If Rob is visiting the hotel room, keep him there until the player leaves
    if (npc.location === 'dorm-suite') {
      if (game.currentLocation === 'dorm-suite') {
        return // Don't override with schedule while visiting
      }
      // Player left the room — Rob heads home
    }
    npc.followSchedule(game, [
      [9, 18, 'station'],
    ])
  },

  // If you wait at the station and haven't met Rob yet, he approaches you
  onWait: (game: Game) => {
    const npc = game.getNPC('tour-guide')
    if (npc.nameKnown === 0) {
      game.run('approach', { npc: 'tour-guide' })
    }
  },

  onFirstApproach: (game: Game) => {
    const npc = game.npc
    game.add('A man with a well-worn guidebook catches your eye and steps over with a warm smile.')
    npc.say("The name's Rob Hayes. I lead tours of the city for new arrivals. It takes about an hour and ends in the backstreets—handy if that's where you're headed. Fancy it?")
    npc.nameKnown = 1
    game.addOption('interact', { script: 'tour' }, 'Accept')
    npc.leaveOption(
      'You politely decline the invitation.',
      "Whenever you're ready. I'm usually here at the station.",
      'Decline',
    )
  },

  onApproach: cond(
    // In the hotel room — random impressed comments
    inLocation('dorm-suite'),
    run('interact', { script: 'roomChat' }),

    // Default: station approach
    seq(
      say('"Back again? The tour offer still stands if you\'re interested."'),
      option('Accept the tour', 'interact', { script: 'tour' }),
      when(hasCard('hotel-booking'),
        option('Invite to see your hotel room', 'interact', { script: 'inviteToRoom' }),
      ),
      when(hasStat('Flirtation', 1),
        option('Flirt', 'interact', { script: 'flirt' }),
      ),
      npcLeaveOption(undefined, 'No worries. Safe travels!', 'Decline'),
    ),
  ),

  scripts: {
    // ----------------------------------------------------------------
    // CITY TOUR
    // ----------------------------------------------------------------
    tour: scenes(
      // City centre
      [
        hideNpcImage(),
        text('You set off with Rob.'),
        move('default'), timeLapse(15),
        say('Here we are—the heart of Aetheria. Magnificent, isn\'t it?'),
        text('Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city.'),
      ],
      // Imperial Hotel
      [
        discoverLocation('hotel'),
        move('hotel'), timeLapse(5),
        text('Rob takes you to an imposing brass-and-marble facade with gilt lettering above its revolving doors. You take a peek inside.'),
        say('The Imperial Hotel. Very grand, very expensive — too expensive for most folks. But worth knowing about if you ever come into money.'),
      ],
      // University
      [
        discoverLocation('school'),
        move('school'), timeLapse(15),
        say('The University - you\'ll be studying there you say? A fine institution.'),
        text('Its grand brass doors and halls where you will learn the mechanical arts, steam engineering, and the mysteries of clockwork.'),
        discoverLocation('subway-university'),
        say('There\'s a subway here - efficient way to get around the city though it costs 3 Krona. It\'s also pretty safe... most of the time...'),
      ],
      // Lake
      [
        discoverLocation('lake'),
        move('lake'), timeLapse(18),
        say('The Lake. A peaceful spot when the city gets too much. Steam off the water—rather lovely.'),
        text('Steam gently rises from the surface, creating a serene mist. A sanctuary where the mechanical and natural worlds blend.'),
      ],
      // Market
      [
        discoverLocation('market'),
        move('market'), timeLapse(15),
        say('The Market. Best place for oddities and curios. Keep your wits about you.'),
        text('Vendors display exotic mechanical trinkets and clockwork wonders. The air is filled with haggling, the clink of gears, and the hiss of steam. The market throbs. Fingers brush you as you pass—accidental, deliberate, promising.'),
      ],
      // Backstreets
      [
        discoverLocation('backstreets'),
        move('backstreets'), timeLapse(15),
        text('The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.'),
        say('Your room\'s in one of the buildings, I believe. It\'s a nice enough area, but be careful at night.'),
      ],
      // Tour ends — farewell
      [
        showNpcImage(),
        text('Rob shows you around the backstreets for a while.'),
        say('I hope this helps you find your feet. Enjoy Aetheria!'),
        addNpcStat('affection', 1, 'tour-guide', true),
        npcLeaveOption('You thank Rob and he leaves you in the backstreets.'),
      ],
    ),

    // ----------------------------------------------------------------
    // HOTEL ROOM VISIT
    // ----------------------------------------------------------------
    inviteToRoom: scenes(
      // Set off from the station
      [
        say('"You\'ve got a room at the Imperial? Blimey! I\'d love to see it. Lead the way!"'),
        hideNpcImage(),
        text('You set off together through the busy streets.'),
      ],
      // City Centre — passing through
      [
        move('default', 10),
        say('"Straight through the centre, is it? I know a shortcut past the fountain."'),
        text('Rob walks briskly, pointing out landmarks as you go. He clearly knows every cobblestone.'),
      ],
      // Hotel Lobby — arriving at the Imperial
      [
        move('hotel', 5),
        text('You push through the revolving brass doors into the lobby. Rob stops in his tracks.'),
        say('"Blimey. I\'ve walked past this place a hundred times but never been inside. Look at those chandeliers!"'),
        text('The concierge glances up, gives Rob a slightly disapproving look, then returns to his ledger.'),
      ],
      // Room 101 — the big reveal
      [
        move('dorm-suite', 1),
        moveNpc('tour-guide', 'dorm-suite'),
        showNpcImage(),
        say('"Would you look at this! A proper bed, a writing desk, a view of the rooftops..."'),
        random(
          say('"I could live like this! Beats my little flat by a country mile."'),
          say('"This is how the other half lives, eh? Polished brass everywhere!"'),
          say('"Steam radiator and everything! You\'ve done well for yourself."'),
        ),
        addNpcStat('affection', 10, 'tour-guide'),
        text('Rob is clearly impressed by your accommodation.'),
      ],
      // Transition into normal room conversation
      [
        npcInteract('roomChat'),
      ],
    ),

    // Random chat while Rob is in the hotel room
    roomChat: seq(
      random(
        say('"I could get used to this. The sheets look like actual cotton — not that scratchy stuff."'),
        say('"Have you seen the bathroom? Claw-footed tub! I\'ve only ever read about those."'),
        say('"The view from up here — you can see right across the rooftops. Magnificent."'),
        say('"I wonder what the kitchens are like. Bet they do a proper breakfast."'),
        say('"My flat has a window that looks onto a brick wall. This is... rather different."'),
      ),
      option('Chat', 'interact', { script: 'roomChat' }),
      when(hasStat('Flirtation', 1),
        option('Flirt', 'interact', { script: 'flirt' }),
      ),
      option('Depart Room', 'interact', { script: 'leaveRoom' }),
      npcLeaveOption(),
    ),

    // Leave the hotel room together
    leaveRoom: seq(
      text('You suggest heading back downstairs.'),
      say('"Right you are. Thanks for the visit — quite the treat!"'),
      moveNpc('tour-guide', null),
      move('hotel', 1),
    ),

    // ----------------------------------------------------------------
    // FLIRTING — requires Flirtation > 0, +3 affection capped at 50
    // ----------------------------------------------------------------
    flirt: seq(
      addNpcStat('affection', 3, 'tour-guide', { max: 50 }),
      random(
        seq(
          text('You lean a little closer and compliment his knowledge of the city.'),
          say('"Oh! Well, I — thank you. I do try to keep up with things. You\'re very kind to say so."'),
          text('His ears go pink.'),
        ),
        seq(
          text('You brush his arm and tell him he\'s got a lovely smile.'),
          say('"I — what? Me? I mean — that\'s — blimey."'),
          text('He fumbles with his guidebook, grinning like an idiot.'),
        ),
        seq(
          text('You catch his eye and hold it just a beat longer than necessary.'),
          say('"I, erm. Right. Yes. Where were we? I\'ve completely lost my train of thought."'),
          text('He scratches the back of his neck, flustered but clearly pleased.'),
        ),
        seq(
          text('You tell him you feel safe with him around.'),
          say('"Really? That\'s — well, that means a lot, actually. I\'ll always look out for you."'),
          text('He straightens up a little, trying not to beam.'),
        ),
        seq(
          text('You tuck a stray bit of hair behind your ear and ask if he\'d like to show you around again sometime — just the two of you.'),
          say('"Just us? I — yes. Yes, I\'d like that very much."'),
          text('He clutches his guidebook to his chest as though it might escape.'),
        ),
      ),
      // Re-show appropriate options depending on location
      cond(
        inLocation('dorm-suite'),
        seq(
          option('Chat', 'interact', { script: 'roomChat' }),
          option('Flirt', 'interact', { script: 'flirt' }),
          option('Depart Room', 'interact', { script: 'leaveRoom' }),
          npcLeaveOption(),
        ),
        seq(
          option('Accept the tour', 'interact', { script: 'tour' }),
          when(hasCard('hotel-booking'),
            option('Invite to see your hotel room', 'interact', { script: 'inviteToRoom' }),
          ),
          option('Flirt', 'interact', { script: 'flirt' }),
          npcLeaveOption(undefined, 'No worries. Safe travels!', 'Decline'),
        ),
      ),
    ),
  },
})
