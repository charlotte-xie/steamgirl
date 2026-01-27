/**
 * Rob Hayes — Tour Guide
 *
 * Rob is one of the first NPCs the player meets. He's a genial, eager
 * puppy-dog type: warm, enthusiastic, and easily impressed. He genuinely
 * likes people and the city, and takes real pleasure in showing newcomers
 * around.
 *
 * Romance path & affection budget:
 *
 *   PRE-DATE (easy to reach ~20-25):
 *   - City tour: +1 hidden (no cap — flavour; warmer dialogue at 15+)
 *   - Hotel room invite: +10 (max 15)
 *   - Flirting: +3 each (max 30 — diminishing returns; pushing past 30
 *     without Charm risks pushback and -3)
 *
 *   DATE INVITATION:
 *   - Triggered by: Flirtation skill check DC 10, affection > 20, no
 *     existing date card
 *
 *   FIRST DATE — all affection earned through the date scenes:
 *   - Lakeside lean: +3 (max 45)
 *   - Shooting star (Perception DC 10): +2 (max 45)
 *   - Pier hand-hold: +5 (max 50)
 *   - Garden discovery (requires affection ≥ 35): +3 (max 50)
 *   - Garden charm check (Charm DC 12): +3 (max 50)
 *   - Garden sit close: +3 (max 50)
 *   - Kiss (requires affection ≥ 40): +5 hidden (max 55)
 *   - No completion bonus — affection is earned through choices.
 *
 *   Getting past 50 is hard and requires both the garden path and
 *   the kiss. Beyond 55 requires future content (multiple dates,
 *   gifts, special events).
 *
 * Approach comments are history-aware: Rob references the tour,
 * hotel room visit, and pending dates in his greetings.
 *
 * Schedule: Station 9am–6pm daily. Can be moved to dorm-suite via the
 * invite-to-room interaction; returns to schedule when the player leaves.
 * During an active date window, moves to the meeting location instead.
 */

import { Game } from '../../model/Game'
import { NPC, PRONOUNS, registerNPC } from '../../model/NPC'
import {
  type Instruction,
  say, npcLeaveOption, npcInteract,
  seq, when, random, cond,
  addNpcStat, moveNpc,
  discoverLocation, option, branch, scene, scenes,
  move, timeLapse,
  hideNpcImage, showNpcImage,
  hasStat, npcStat, skillCheck,
  run, 
} from '../../model/ScriptDSL'
import {
  registerDatePlan, endDate,
  handleDateApproach,
  standardGreeting, standardCancel, standardNoShow, standardComplete,
} from '../Dating'

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
  pronouns: PRONOUNS.he,

  generate: (_game: Game, npc: NPC) => {
    npc.location = 'station'
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('tour-guide')

    // If Rob is visiting the hotel room, keep him there until the player leaves
    if (npc.location === 'dorm-suite' && game.currentLocation === 'dorm-suite') {
      return
    }

    // Normal schedule — date positioning is handled by the Date card's afterUpdate
    npc.followSchedule(game, [
      [9, 18, 'station'],
    ])
  },

  onWait: (game: Game) => {
    // If Rob is waiting for a date and the player is at the meeting location
    if (handleDateApproach(game, 'tour-guide')) return

    // If you wait at the station and haven't met Rob yet, he approaches you
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

  onApproach: (game: Game) => {
    // If there's an active date and we're at the meeting point, trigger date approach
    if (handleDateApproach(game, 'tour-guide')) return

    // In the hotel room — random impressed comments
    if (game.currentLocation === 'dorm-suite') {
      game.run(run('interact', { script: 'roomChat' }))
      return
    }

    // Default: station approach
    const npc = game.npc
    const tourDone = npc.stats.get('tourDone') ?? 0
    const hotelVisited = npc.stats.get('hotelVisited') ?? 0

    // Greeting varies based on shared history
    if (game.player.hasCard('date')) {
      npc.say('Hello again! Looking forward to later.')
    } else if (hotelVisited) {
      npc.say('Good to see you! How\'s the Imperial treating you?')
    } else if (tourDone) {
      npc.say('Hello again! How are you finding the city?')
    } else {
      npc.say('Back again? The tour offer still stands if you\'re interested.')
    }

    if (!tourDone) {
      game.addOption('interact', { script: 'tour' }, 'Accept the tour')
    } else {
      game.addOption('interact', { script: 'tour' }, 'Take another tour')
    }
    if (game.player.hasCard('hotel-booking') && !hotelVisited) {
      game.addOption('interact', { script: 'inviteToRoom' }, 'Invite to see your hotel room')
    }
    if ((game.player.stats.get('Flirtation') ?? 0) >= 1) {
      game.addOption('interact', { script: 'flirt' }, 'Flirt')
    }
    npc.leaveOption(undefined, 'No worries. Safe travels!', 'Decline')
  },

  scripts: {
    // ----------------------------------------------------------------
    // CITY TOUR
    // ----------------------------------------------------------------
    tour: scenes(
      // City centre
      scene(
        hideNpcImage(),
        cond(
          npcStat('tour-guide', 'affection', 15),
          seq(
            'You set off together, Rob matching your pace. He keeps glancing at you with a warm, slightly nervous smile.',
            move('default'), timeLapse(15),
            say('Here we are — the heart of Aetheria. I never get tired of this view. But it\'s nicer with company.'),
          ),
          seq(
            'You set off with Rob.',
            move('default'), timeLapse(15),
            say('Here we are—the heart of Aetheria. Magnificent, isn\'t it?'),
          ),
        ),
        'Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city.',
      ),
      // Imperial Hotel
      scene(
        discoverLocation('hotel'),
        move('hotel'), timeLapse(5),
        'Rob takes you to an imposing brass-and-marble facade with gilt lettering above its revolving doors. You take a peek inside.',
        say('The Imperial Hotel. Very grand, very expensive — too expensive for most folks. But worth knowing about if you ever come into money.'),
      ),
      // University
      scene(
        discoverLocation('school'),
        move('school'), timeLapse(15),
        say('The University - you\'ll be studying there you say? A fine institution.'),
        'Its grand brass doors and halls where you will learn the mechanical arts, steam engineering, and the mysteries of clockwork.',
        discoverLocation('subway-university'),
        say('There\'s a subway here - efficient way to get around the city though it costs 3 Krona. It\'s also pretty safe... most of the time...'),
      ),
      // Lake
      scene(
        discoverLocation('lake'),
        move('lake'), timeLapse(18),
        cond(
          npcStat('tour-guide', 'affection', 15),
          seq(
            say('The Lake. I come here when I need to think. It\'s my favourite spot in the whole city.'),
            'He pauses, watching the steam curl over the water.',
            say('I don\'t usually tell people that. But — I wanted you to know.'),
          ),
          say('The Lake. A peaceful spot when the city gets too much. Steam off the water—rather lovely.'),
        ),
        'Steam gently rises from the surface, creating a serene mist. A sanctuary where the mechanical and natural worlds blend.',
      ),
      // Market
      scene(
        discoverLocation('market'),
        move('market'), timeLapse(15),
        cond(
          npcStat('tour-guide', 'affection', 15),
          seq(
            say('The Market. Brilliant for oddities, but stay close — some of the vendors can be a bit pushy.'),
            'He steps a little nearer as the crowd thickens, his hand hovering protectively near your elbow.',
          ),
          say('The Market. Best place for oddities and curios. Keep your wits about you.'),
        ),
        'Vendors display exotic mechanical trinkets and clockwork wonders. The air is filled with haggling, the clink of gears, and the hiss of steam. The market throbs. Fingers brush you as you pass—accidental, deliberate, promising.',
      ),
      // Backstreets
      scene(
        discoverLocation('backstreets'),
        move('backstreets'), timeLapse(15),
        'The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.',
        cond(
          npcStat('tour-guide', 'affection', 15),
          seq(
            say('Your room\'s in one of the buildings, I believe. It can get a bit rough at night, so — if you ever need anything, you know where to find me.'),
            'He catches your eye, and looks away quickly.',
          ),
          say('Your room\'s in one of the buildings, I believe. It\'s a nice enough area, but be careful at night.'),
        ),
      ),
      // Tour ends — farewell
      scene(
        showNpcImage(),
        'Rob shows you around the backstreets for a while.',
        cond(
          npcStat('tour-guide', 'affection', 15),
          seq(
            say('I really enjoyed that. More than usual, if I\'m honest.'),
            'He lingers, reluctant to say goodbye.',
            say('Come find me at the station any time. I mean it.'),
          ),
          say('I hope this helps you find your feet. Enjoy Aetheria!'),
        ),
        addNpcStat('affection', 1, 'tour-guide', { hidden: true }),
        addNpcStat('tourDone', 1, 'tour-guide', { hidden: true }),
        npcLeaveOption('You thank Rob and he leaves you in the backstreets.'),
      ),
    ),

    // ----------------------------------------------------------------
    // HOTEL ROOM VISIT
    // ----------------------------------------------------------------
    inviteToRoom: scenes(
      // Set off from the station
      scene(
        say('You\'ve got a room at the Imperial? Blimey! I\'d love to see it. Lead the way!'),
        hideNpcImage(),
        'You set off together through the busy streets.',
      ),
      // City Centre — passing through
      scene(
        move('default', 10),
        say('Straight through the centre, is it? I know a shortcut past the fountain.'),
        'Rob walks briskly, pointing out landmarks as you go. He clearly knows every cobblestone.',
      ),
      // Hotel Lobby — arriving at the Imperial
      scene(
        move('hotel', 5),
        'You push through the revolving brass doors into the lobby. Rob stops in his tracks.',
        say('Blimey. I\'ve walked past this place a hundred times but never been inside. Look at those chandeliers!'),
        'The concierge glances up, gives Rob a slightly disapproving look, then returns to his ledger.',
      ),
      // Room 101 — the big reveal
      scene(
        move('dorm-suite', 1),
        moveNpc('tour-guide', 'dorm-suite'),
        showNpcImage(),
        say('Would you look at this! A proper bed, a writing desk, a view of the rooftops...'),
        random(
          say('I could live like this! Beats my little flat by a country mile.'),
          say('This is how the other half lives, eh? Polished brass everywhere!'),
          say('Steam radiator and everything! You\'ve done well for yourself.'),
        ),
        addNpcStat('affection', 10, 'tour-guide', { max: 15 }),
        addNpcStat('hotelVisited', 1, 'tour-guide', { hidden: true }),
        'Rob is clearly impressed by your accommodation.',
      ),
      // Transition into normal room conversation
      scene(
        npcInteract('roomChat'),
      ),
    ),

    // Random chat while Rob is in the hotel room
    roomChat: seq(
      random(
        say('I could get used to this. The sheets look like actual cotton — not that scratchy stuff.'),
        say('Have you seen the bathroom? Claw-footed tub! I\'ve only ever read about those.'),
        say('The view from up here — you can see right across the rooftops. Magnificent.'),
        say('I wonder what the kitchens are like. Bet they do a proper breakfast.'),
        say('My flat has a window that looks onto a brick wall. This is... rather different.'),
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
      'You suggest heading back downstairs.',
      say('Right you are. Thanks for the visit — quite the treat!'),
      moveNpc('tour-guide', null),
      move('hotel', 1),
    ),

    // ----------------------------------------------------------------
    // FLIRTING — requires Flirtation > 0
    // +3 affection capped at 30 (easy phase).
    // Past 30, needs a Charm check — failure causes pushback and -3.
    // May trigger a date invitation if conditions are met.
    // ----------------------------------------------------------------
    flirt: (game: Game) => {
      const npc = game.getNPC('tour-guide')

      // Past 30 affection, Rob is wary of being pushed — needs subtlety
      if (npc.affection >= 30) {
        if (game.player.skillTest('Charm', 12)) {
          // Charming enough to keep things comfortable
          game.run(addNpcStat('affection', 2, 'tour-guide', { max: 40, hidden: true }))
          const highFlirtScenes = [
            [
              'You say something quiet and sincere about how much you enjoy his company.',
              say('I... thank you. I mean that. You\'re — you\'re special, you know that?'),
              'He holds your gaze for a moment, then looks away with a small, genuine smile.',
            ],
            [
              'You let the silence between you stretch — warm and companionable, not awkward.',
              say('I like this. Just... being with you. Not having to fill every moment with chatter.'),
              'He relaxes visibly, leaning back.',
            ],
            [
              'You compliment something specific — the way he always notices when you\'re cold, the way he remembers little things.',
              say('You noticed that? I didn\'t think anyone—'),
              'He breaks off, blinking. His smile is slow but real.',
            ],
          ]
          const chosen = highFlirtScenes[Math.floor(Math.random() * highFlirtScenes.length)]
          game.run(seq(...chosen))
        } else {
          // Too forward — Rob pulls back
          game.run(addNpcStat('affection', -3, 'tour-guide', { min: 20 }))
          const pushbackScenes = [
            [
              'You lean in close and trail a finger down his arm.',
              say('I — could we — maybe slow down a bit?'),
              'He takes a small step back, not unkindly, but firmly. His ears are red and he won\'t quite meet your eye.',
            ],
            [
              'You try to hold his hand, but he gently disentangles his fingers.',
              say('Sorry, I just — I\'m not quite ready for... I need a bit more time.'),
              'He looks genuinely uncomfortable. You\'ve pushed a little too far.',
            ],
            [
              'You say something bold. Rob\'s smile falters.',
              say('That\'s — I mean — you\'re lovely, but I...'),
              'He trails off, clutching his guidebook like a shield. The moment passes awkwardly.',
            ],
          ]
          const chosen = pushbackScenes[Math.floor(Math.random() * pushbackScenes.length)]
          game.run(seq(...chosen))
        }
      } else {
        // Normal flirting — easy phase, +3 capped at 30
        game.run(addNpcStat('affection', 3, 'tour-guide', { max: 30 }))

        const flirtScenes = [
          [
            'You lean a little closer and compliment his knowledge of the city.',
            say('Oh! Well, I — thank you. I do try to keep up with things. You\'re very kind to say so.'),
            'His ears go pink.',
          ],
          [
            'You brush his arm and tell him he\'s got a lovely smile.',
            say('I — what? Me? I mean — that\'s — blimey.'),
            'He fumbles with his guidebook, grinning like an idiot.',
          ],
          [
            'You catch his eye and hold it just a beat longer than necessary.',
            say('I, erm. Right. Yes. Where were we? I\'ve completely lost my train of thought.'),
            'He scratches the back of his neck, flustered but clearly pleased.',
          ],
          [
            'You tell him you feel safe with him around.',
            say('Really? That\'s — well, that means a lot, actually. I\'ll always look out for you.'),
            'He straightens up a little, trying not to beam.',
          ],
          [
            'You tuck a stray bit of hair behind your ear and ask if he\'d like to show you around again sometime — just the two of you.',
            say('Just us? I — yes. Yes, I\'d like that very much.'),
            'He clutches his guidebook to his chest as though it might escape.',
          ],
        ]
        const chosen = flirtScenes[Math.floor(Math.random() * flirtScenes.length)]
        game.run(seq(...chosen))
      }

      // Check date invitation conditions
      const canInvite = game.player.skillTest('Flirtation', 10)
        && npc.affection > 20
        && !game.player.hasCard('date')

      if (canInvite) {
        // Rob asks the player on a date
        npc.say('I was thinking... would you fancy going for a walk tomorrow evening? Just the two of us. I know a lovely spot by the lake.')
        game.add('He looks at you hopefully, his ears going pink again.')
        game.addOption('interact', { script: 'dateAccept' }, 'Accept the date')
        game.addOption('interact', { script: 'dateDecline' }, 'Decline')
        npc.leaveOption()
      } else {
        // Re-show normal options depending on location
        if (game.currentLocation === 'dorm-suite') {
          game.addOption('interact', { script: 'roomChat' }, 'Chat')
          game.addOption('interact', { script: 'flirt' }, 'Flirt')
          game.addOption('interact', { script: 'leaveRoom' }, 'Depart Room')
          npc.leaveOption()
        } else {
          game.addOption('interact', { script: 'tour' }, 'Accept the tour')
          if (game.player.hasCard('hotel-booking')) {
            game.addOption('interact', { script: 'inviteToRoom' }, 'Invite to see your hotel room')
          }
          game.addOption('interact', { script: 'flirt' }, 'Flirt')
          npc.leaveOption(undefined, 'No worries. Safe travels!', 'Decline')
        }
      }
    },

    // ----------------------------------------------------------------
    // DATE INVITATION — accept or decline
    // ----------------------------------------------------------------
    dateAccept: (game: Game) => {
      const npc = game.getNPC('tour-guide')

      // Calculate meetTime: 6pm tomorrow
      const tomorrow = new Date(game.date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(18, 0, 0, 0)
      const meetTime = Math.floor(tomorrow.getTime() / 1000)

      npc.say('Really? Brilliant! I\'ll meet you in the City Centre at six o\'clock tomorrow evening. Don\'t be late!')
      game.add('He beams, practically bouncing on his heels.')

      game.addCard('date', 'Date', {
        npc: 'tour-guide',
        meetTime,
        meetLocation: 'default',
        dateStarted: false,
      })
    },

    dateDecline: (game: Game) => {
      const npc = game.getNPC('tour-guide')
      npc.say('Oh. No, that\'s — of course. Maybe some other time, then.')
      game.add('He tries to smile, but his disappointment is obvious.')
      npc.leaveOption()
    },
  },
})

// ============================================================================
// ROB'S DATE — BRANCHING PATHS
// ============================================================================

/** Pier path — the default scenic route with gift and stargazing. */
function robPierPath(): Instruction[] {
  return [
    // Pier: Walking there
    scene(
      hideNpcImage(),
      'You follow the lakeside path as the stars emerge. The wooden boards of the pier creak underfoot.',
      move('pier', 10),
      'Lanterns hang from the pilings, casting pools of warm light across the dark water.',
    ),
    // Pier: The gift
    scene(
      showNpcImage(),
      say('I brought you something. It\'s not much — just a little thing I spotted at the market.'),
      'He produces a small brass compass from his pocket, its face engraved with a tiny star.',
      say('So you\'ll always find your way. In Aetheria, I mean. Or... wherever.'),
      'He goes pink and looks away, scratching the back of his neck.',
    ),
    // Pier: Stargazing — intimacy choice
    scene(
      'You sit on the edge of the pier, feet dangling over the dark water. The city\'s mechanical hum is distant here, almost peaceful.',
      say('That bright one there — that\'s the Engineer\'s Star. Sailors used to navigate by it. Or so my granddad said.'),
      'Rob points upward, his arm almost but not quite touching yours.',
      branch('Take his hand',
        'You reach over and lace your fingers through his. He freezes — then holds on as though you might vanish.',
        addNpcStat('affection', 5, 'tour-guide', { max: 50 }),
        say('I... wasn\'t expecting that.'),
        'His thumb traces a small circle on the back of your hand. Neither of you speaks for a while, and neither of you needs to.',
      ),
      branch('Enjoy the view',
        'You gaze up at the stars together, the lantern-light warm on your faces.',
        say('My granddad said the Engineer\'s Star watches over anyone brave enough to follow their curiosity. I always liked that.'),
      ),
    ),
    // Walk home
    ...robWalkHome(),
  ]
}

/** Garden path — high-affection secret route. */
function robGardenPath(): Instruction[] {
  return [
    // Garden: Getting there
    scene(
      hideNpcImage(),
      'Rob leads you along a narrow path behind the waterworks. The cobbles give way to packed earth and the hiss of pipes fades behind you.',
      move('lake', 10),
      'He squeezes through a gap in a wrought-iron fence and holds out a hand to help you through.',
    ),
    // Garden: Discovery
    scene(
      showNpcImage(),
      'You step into a hidden garden. Moonlight catches on a small fountain at its centre — long dry, but beautiful. Ivy cascades over crumbling stonework and wild roses climb a trellis that must be a hundred years old.',
      say('I found this place years ago. Nobody comes here. I think people have forgotten it exists.'),
      'His voice is soft, almost reverent.',
      say('I\'ve never shown anyone before. But I thought... I thought you\'d understand why I love it.'),
      addNpcStat('affection', 3, 'tour-guide', { max: 50 }),
    ),
    // Garden: Conversation — skill check for a special moment
    scene(
      'You wander through the garden together. The roses smell impossibly sweet in the evening air.',
      skillCheck('Charm', 12,
        [
          'You tell him it\'s the most beautiful place you\'ve seen in Aetheria. He beams — really beams — as though you\'ve given him a gift worth more than gold.',
          say('You mean that? It\'s just a forgotten garden, but — that means a lot. Coming from you.'),
          addNpcStat('affection', 3, 'tour-guide', { max: 50 }),
        ],
        [
          'You try to find the right words, but the beauty of the place has left you a bit lost for speech.',
          say('It\'s a lot to take in, isn\'t it? I was the same the first time.'),
          'He smiles, understanding.',
        ],
      ),
    ),
    // Garden: Intimacy choice
    scene(
      'Rob sits on the edge of the old fountain. The moonlight catches the angles of his face. He looks up at you.',
      say('Thank you. For coming tonight. For... for being here.'),
      'His voice catches slightly. He looks down at his hands.',
      branch('Sit close beside him',
        'You sit next to him, close enough that your shoulders press together. He exhales — a long, shaky breath — and you feel some tension leave him.',
        addNpcStat('affection', 3, 'tour-guide', { max: 50 }),
        say('I don\'t really know what I\'m doing,'),
        'he admits quietly.',
        say('But I\'m glad I\'m doing it with you.'),
      ),
      branch('Sit across from him',
        'You take a seat on the stone bench opposite. The fountain stands between you like a gentle chaperone.',
        say('It\'s funny. I feel like I can actually talk to you. Not many people I can say that about.'),
        'He gives a lopsided smile.',
      ),
    ),
    // Walk home
    ...robWalkHome(),
  ]
}

/** Shared walk-home and farewell scenes. Both paths converge here. */
function robWalkHome(): Instruction[] {
  return [
    // Walk home
    scene(
      hideNpcImage(),
      'The evening has grown late. Rob walks you back through the quiet streets, taking the long way round.',
      move('backstreets', 20),
      'The backstreets are hushed, the gas lamps flickering. Your footsteps echo in companionable rhythm.',
    ),
    // Farewell — affection-gated kiss
    scene(
      showNpcImage(),
      say('I had a really lovely time tonight. Thank you for coming.'),
      // High affection: Rob asks to kiss you
      cond(
        npcStat('tour-guide', 'affection', 40),
        seq(
          'He stops under a streetlamp, its amber glow soft on his face. He turns to you, and for once he doesn\'t look away.',
          say('I... would it be all right if I kissed you?'),
          'His voice is barely a whisper. His ears are crimson.',
          branch('Kiss him', [
            // The kiss — pure narrative, no stat noise
            scene(
              'You close the distance between you. The kiss is gentle, a little clumsy, and over too soon. When you pull apart his eyes are shining.',
              say('I\'ll remember this. Always.'),
              'He touches his lips as though he can\'t quite believe it happened. Then he smiles — the widest, most unguarded smile you\'ve seen from him.',
            ),
            // Farewell
            scene(
              say('Get home safe. Please.'),
              'He backs away slowly, still smiling, then turns and disappears into the steam.',
              addNpcStat('affection', 5, 'tour-guide', { hidden: true, max: 55 }),
              endDate(),
            ),
          ]),
          branch('Not tonight',
            say('Of course. No — of course. I\'m sorry, I shouldn\'t have—'),
            'You tell him there\'s nothing to apologise for. He nods, manages a smile.',
            say('Get home safe. And... I hope we can do this again sometime.'),
            'He gives a small wave, then turns and walks into the steam.',
            endDate(),
          ),
        ),
        // Below threshold: standard farewell, no kiss
        seq(
          'He hesitates, opens his mouth, closes it again, then settles for a warm smile.',
          say('Get home safe. And... I hope we can do this again sometime.'),
          'He gives a small, almost bashful wave, then turns and disappears into the steam.',
          endDate(),
        ),
      ),
    ),
  ]
}

// ============================================================================
// ROB'S DATE PLAN
// ============================================================================

registerDatePlan({
  npcId: 'tour-guide',
  npcDisplayName: 'Rob',
  meetLocation: 'default',
  meetLocationName: 'the City Centre',
  waitMinutes: 120,

  onGreeting: standardGreeting('You came! I was starting to worry. You look wonderful. Shall we?'),
  onCancel: standardCancel('Oh. Right. No, that\'s... that\'s fine. Maybe another time.', 20),
  onNoShow: standardNoShow('Rob', 'Rob waited in the City Centre for two hours, but you never showed.', 15),
  onComplete: standardComplete(0),

  dateScene: scenes(
    // ── Scene 1: Setting off from City Centre ──
    scene(
      hideNpcImage(),
      'Rob offers you his arm, and together you set off through the lamplit streets.',
      move('lake', 15),
      'The city fades behind you as you approach the lake. The evening air is cool and fragrant with coal smoke and distant flowers.',
    ),

    // ── Scene 2: Arriving at the Lake ──
    scene(
      'Steam rises from the lake in languid spirals, catching the last amber light. The surface is mirror-still.',
      showNpcImage(),
      say('I come here sometimes after work. It\'s the one place in Aetheria where you can actually hear yourself think.'),
      'He gazes out across the water, the steam wreathing around you both like something from a dream.',
    ),

    // ── Scene 3: Lakeside conversation — intimacy choice ──
    scene(
      say('You know, when I first came to the city I was terrified. Couldn\'t tell a steam valve from a kettle. But there\'s something about this place that gets under your skin.'),
      'He glances at you, his expression earnest.',
      say('I\'m glad you came tonight. Really glad.'),
      'He moves a little closer on the bench. His arm rests along the back, not quite touching your shoulder.',
      // Player choice: show intimacy or hold back
      branch('Lean against him',
        'You lean against his shoulder. He tenses for a moment, then relaxes, letting out a slow breath.',
        addNpcStat('affection', 3, 'tour-guide', { max: 45 }),
        say('This is... really nice.'),
        'His voice is barely above a whisper. You feel the warmth of him through his coat.',
      ),
      branch('Stay where you are',
        'You keep a comfortable distance, watching the steam curl over the water.',
        say('It\'s peaceful here, isn\'t it? Away from all the noise.'),
        'He smiles — a little wistful, but genuine.',
      ),
    ),

    // ── Scene 4: Skill check — Perception reveals something special ──
    scene(
      'You sit together in the quiet, watching the last of the daylight dissolve into deep blue.',
      skillCheck('Perception', 10,
        [
          'Something catches your eye — a streak of light arcing across the sky, trailing sparks like a tiny clockwork firework.',
          say('A shooting star! Did you see that? Quick — make a wish!'),
          'Rob closes his eyes tight, grinning like a child. When he opens them, he catches you watching and goes pink.',
          say('I\'m not telling you what I wished for. That\'s the rule.'),
          addNpcStat('affection', 2, 'tour-guide', { max: 45 }),
        ],
        [
          'The stars are beginning to appear, faint pinpricks in the deepening sky.',
          say('Beautiful night for it. Couldn\'t have asked for better weather.'),
        ],
      ),
    ),

    // ── Scene 5: Route choice — Pier (default) or secret garden (high affection) ──
    scene(
      say('Shall we walk a bit further? I know a few spots around here.'),
      // High-affection path: Rob knows a secret garden
      cond(
        npcStat('tour-guide', 'affection', 35),
        seq(
          'He hesitates, then lowers his voice.',
          say('Actually... there\'s a place I\'ve never shown anyone. A garden, hidden behind the old waterworks. It\'s a bit of a scramble to get to, but it\'s worth it. If you trust me.'),
          'His eyes are bright with a mix of nerves and excitement.',
          branch('Go to the hidden garden', robGardenPath()),
          branch('Stick to the pier', robPierPath()),
        ),
        // Default: just the pier
        seq(
          'He gestures along the lakeside path where lanterns glow like a string of earthbound stars.',
          say('The pier\'s lovely at night. Come on.'),
          branch('Walk to the pier', robPierPath()),
        ),
      ),
    ),
  ),
})
