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
 * - If the player flirts, passes a Flirtation check, and affection > 20,
 *   Rob invites the player on a date the following evening. The player can
 *   accept or decline.
 * - Date: Rob meets the player at 6pm in the City Centre, walks to the
 *   Lake, then the Pier, and walks the player home. +15 affection on
 *   completion.
 * - At higher affection levels (future): he starts bringing the player
 *   small gifts, suggests outings, and becomes a possible romance option.
 *
 * Schedule: Station 9am–6pm daily. Can be moved to dorm-suite via the
 * invite-to-room interaction; returns to schedule when the player leaves.
 * During an active date window, moves to the meeting location instead.
 */

import { Game } from '../../model/Game'
import { NPC, registerNPC } from '../../model/NPC'
import {
  type Instruction,
  text, say, npcLeaveOption, npcInteract,
  seq, when, random, cond,
  addNpcStat, moveNpc,
  discoverLocation, option, branch, scenes,
  move, timeLapse,
  hideNpcImage, showNpcImage,
  hasStat, npcStat, skillCheck,
  run, exec, execAll,
} from '../../model/ScriptDSL'
import {
  registerDatePlan, getDateCard, endDate,
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

  generate: (_game: Game, npc: NPC) => {
    npc.location = 'station'
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('tour-guide')

    // If Rob is visiting the hotel room, keep him there until the player leaves
    if (npc.location === 'dorm-suite') {
      if (game.currentLocation === 'dorm-suite') {
        return
      }
    }

    // If there's an active date, move to meeting location during the date window
    const dateCard = getDateCard(game)
    if (dateCard && dateCard.npc === 'tour-guide' && !dateCard.dateStarted) {
      const meetTime = dateCard.meetTime as number
      const waitMinutes = 120
      const deadline = meetTime + waitMinutes * 60

      if (game.time >= meetTime && game.time < deadline) {
        npc.location = (dateCard.meetLocation as string) ?? 'default'
        return
      }
    }

    // Normal schedule
    npc.followSchedule(game, [
      [9, 18, 'station'],
    ])
  },

  onWait: (game: Game) => {
    const npc = game.getNPC('tour-guide')

    // If Rob is waiting for a date and the player is at the meeting location
    const dateCard = getDateCard(game)
    if (dateCard && dateCard.npc === 'tour-guide' && !dateCard.dateStarted) {
      const meetTime = dateCard.meetTime as number
      const meetLocation = (dateCard.meetLocation as string) ?? 'default'
      const deadline = meetTime + 120 * 60

      if (game.time >= meetTime && game.time < deadline && game.currentLocation === meetLocation) {
        game.run('dateApproach', { npc: 'tour-guide' })
        return
      }
    }

    // If you wait at the station and haven't met Rob yet, he approaches you
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
    const dateCard = getDateCard(game)
    if (dateCard && dateCard.npc === 'tour-guide' && !dateCard.dateStarted) {
      const meetLocation = (dateCard.meetLocation as string) ?? 'default'
      const meetTime = dateCard.meetTime as number
      const deadline = meetTime + 120 * 60
      if (game.currentLocation === meetLocation && game.time >= meetTime && game.time < deadline) {
        game.run('dateApproach', { npc: 'tour-guide' })
        return
      }
    }

    // In the hotel room — random impressed comments
    if (game.currentLocation === 'dorm-suite') {
      exec(game, run('interact', { script: 'roomChat' }))
      return
    }

    // Default: station approach
    const npc = game.npc
    npc.say('Back again? The tour offer still stands if you\'re interested.')
    game.addOption('interact', { script: 'tour' }, 'Accept the tour')
    if (game.player.hasCard('hotel-booking')) {
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
        say('You\'ve got a room at the Imperial? Blimey! I\'d love to see it. Lead the way!'),
        hideNpcImage(),
        text('You set off together through the busy streets.'),
      ],
      // City Centre — passing through
      [
        move('default', 10),
        say('Straight through the centre, is it? I know a shortcut past the fountain.'),
        text('Rob walks briskly, pointing out landmarks as you go. He clearly knows every cobblestone.'),
      ],
      // Hotel Lobby — arriving at the Imperial
      [
        move('hotel', 5),
        text('You push through the revolving brass doors into the lobby. Rob stops in his tracks.'),
        say('Blimey. I\'ve walked past this place a hundred times but never been inside. Look at those chandeliers!'),
        text('The concierge glances up, gives Rob a slightly disapproving look, then returns to his ledger.'),
      ],
      // Room 101 — the big reveal
      [
        move('dorm-suite', 1),
        moveNpc('tour-guide', 'dorm-suite'),
        showNpcImage(),
        say('Would you look at this! A proper bed, a writing desk, a view of the rooftops...'),
        random(
          say('I could live like this! Beats my little flat by a country mile.'),
          say('This is how the other half lives, eh? Polished brass everywhere!'),
          say('Steam radiator and everything! You\'ve done well for yourself.'),
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
      text('You suggest heading back downstairs.'),
      say('Right you are. Thanks for the visit — quite the treat!'),
      moveNpc('tour-guide', null),
      move('hotel', 1),
    ),

    // ----------------------------------------------------------------
    // FLIRTING — requires Flirtation > 0, +3 affection capped at 50
    // May trigger a date invitation if conditions are met.
    // ----------------------------------------------------------------
    flirt: (game: Game) => {
      const npc = game.getNPC('tour-guide')

      // +3 affection, capped at 50
      exec(game, addNpcStat('affection', 3, 'tour-guide', { max: 50 }))

      // Random flirt text
      const flirtScenes = [
        [
          text('You lean a little closer and compliment his knowledge of the city.'),
          say('Oh! Well, I — thank you. I do try to keep up with things. You\'re very kind to say so.'),
          text('His ears go pink.'),
        ],
        [
          text('You brush his arm and tell him he\'s got a lovely smile.'),
          say('I — what? Me? I mean — that\'s — blimey.'),
          text('He fumbles with his guidebook, grinning like an idiot.'),
        ],
        [
          text('You catch his eye and hold it just a beat longer than necessary.'),
          say('I, erm. Right. Yes. Where were we? I\'ve completely lost my train of thought.'),
          text('He scratches the back of his neck, flustered but clearly pleased.'),
        ],
        [
          text('You tell him you feel safe with him around.'),
          say('Really? That\'s — well, that means a lot, actually. I\'ll always look out for you.'),
          text('He straightens up a little, trying not to beam.'),
        ],
        [
          text('You tuck a stray bit of hair behind your ear and ask if he\'d like to show you around again sometime — just the two of you.'),
          say('Just us? I — yes. Yes, I\'d like that very much.'),
          text('He clutches his guidebook to his chest as though it might escape.'),
        ],
      ]
      const chosen = flirtScenes[Math.floor(Math.random() * flirtScenes.length)]
      execAll(game, chosen)

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
function robPierPath(): Instruction[][] {
  return [
    // Pier: Walking there
    [
      hideNpcImage(),
      text('You follow the lakeside path as the stars emerge. The wooden boards of the pier creak underfoot.'),
      move('pier', 10),
      text('Lanterns hang from the pilings, casting pools of warm light across the dark water.'),
    ],
    // Pier: The gift
    [
      showNpcImage(),
      say('I brought you something. It\'s not much — just a little thing I spotted at the market.'),
      text('He produces a small brass compass from his pocket, its face engraved with a tiny star.'),
      say('So you\'ll always find your way. In Aetheria, I mean. Or... wherever.'),
      text('He goes pink and looks away, scratching the back of his neck.'),
    ],
    // Pier: Stargazing — intimacy choice
    [
      text('You sit on the edge of the pier, feet dangling over the dark water. The city\'s mechanical hum is distant here, almost peaceful.'),
      say('That bright one there — that\'s the Engineer\'s Star. Sailors used to navigate by it. Or so my granddad said.'),
      text('Rob points upward, his arm almost but not quite touching yours.'),
      branch('Take his hand',
        text('You reach over and lace your fingers through his. He freezes — then holds on as though you might vanish.'),
        addNpcStat('affection', 5, 'tour-guide'),
        say('I... wasn\'t expecting that.'),
        text('His thumb traces a small circle on the back of your hand. Neither of you speaks for a while, and neither of you needs to.'),
      ),
      branch('Enjoy the view',
        text('You gaze up at the stars together, the lantern-light warm on your faces.'),
        say('My granddad said the Engineer\'s Star watches over anyone brave enough to follow their curiosity. I always liked that.'),
      ),
    ],
    // Walk home
    ...robWalkHome(),
  ]
}

/** Garden path — high-affection secret route. */
function robGardenPath(): Instruction[][] {
  return [
    // Garden: Getting there
    [
      hideNpcImage(),
      text('Rob leads you along a narrow path behind the waterworks. The cobbles give way to packed earth and the hiss of pipes fades behind you.'),
      move('lake', 10),
      text('He squeezes through a gap in a wrought-iron fence and holds out a hand to help you through.'),
    ],
    // Garden: Discovery
    [
      showNpcImage(),
      text('You step into a hidden garden. Moonlight catches on a small fountain at its centre — long dry, but beautiful. Ivy cascades over crumbling stonework and wild roses climb a trellis that must be a hundred years old.'),
      say('I found this place years ago. Nobody comes here. I think people have forgotten it exists.'),
      text('His voice is soft, almost reverent.'),
      say('I\'ve never shown anyone before. But I thought... I thought you\'d understand why I love it.'),
      addNpcStat('affection', 5, 'tour-guide'),
    ],
    // Garden: Conversation — skill check for a special moment
    [
      text('You wander through the garden together. The roses smell impossibly sweet in the evening air.'),
      skillCheck('Charm', 12,
        [
          text('You tell him it\'s the most beautiful place you\'ve seen in Aetheria. He beams — really beams — as though you\'ve given him a gift worth more than gold.'),
          say('You mean that? It\'s just a forgotten garden, but — that means a lot. Coming from you.'),
          addNpcStat('affection', 3, 'tour-guide'),
        ],
        [
          text('You try to find the right words, but the beauty of the place has left you a bit lost for speech.'),
          say('It\'s a lot to take in, isn\'t it? I was the same the first time.'),
          text('He smiles, understanding.'),
        ],
      ),
    ],
    // Garden: Intimacy choice
    [
      text('Rob sits on the edge of the old fountain. The moonlight catches the angles of his face. He looks up at you.'),
      say('Thank you. For coming tonight. For... for being here.'),
      text('His voice catches slightly. He looks down at his hands.'),
      branch('Sit close beside him',
        text('You sit next to him, close enough that your shoulders press together. He exhales — a long, shaky breath — and you feel some tension leave him.'),
        addNpcStat('affection', 3, 'tour-guide'),
        say('I don\'t really know what I\'m doing,'),
        text('he admits quietly.'),
        say('But I\'m glad I\'m doing it with you.'),
      ),
      branch('Sit across from him',
        text('You take a seat on the stone bench opposite. The fountain stands between you like a gentle chaperone.'),
        say('It\'s funny. I feel like I can actually talk to you. Not many people I can say that about.'),
        text('He gives a lopsided smile.'),
      ),
    ],
    // Walk home
    ...robWalkHome(),
  ]
}

/** Shared walk-home and farewell scenes. Both paths converge here. */
function robWalkHome(): Instruction[][] {
  return [
    // Walk home
    [
      hideNpcImage(),
      text('The evening has grown late. Rob walks you back through the quiet streets, taking the long way round.'),
      move('backstreets', 20),
      text('The backstreets are hushed, the gas lamps flickering. Your footsteps echo in companionable rhythm.'),
    ],
    // Farewell — affection-gated kiss
    [
      showNpcImage(),
      say('I had a really lovely time tonight. Thank you for coming.'),
      // High affection: Rob asks to kiss you
      cond(
        npcStat('tour-guide', 'affection', 40),
        seq(
          text('He stops under a streetlamp, its amber glow soft on his face. He turns to you, and for once he doesn\'t look away.'),
          say('I... would it be all right if I kissed you?'),
          text('His voice is barely a whisper. His ears are crimson.'),
          branch('Kiss him',
            text('You close the distance between you. The kiss is gentle, a little clumsy, and over too soon. When you pull apart his eyes are shining.'),
            addNpcStat('affection', 5, 'tour-guide'),
            say('I\'ll remember this. Always.'),
            text('He touches his lips as though he can\'t quite believe it happened. Then he smiles — the widest, most unguarded smile you\'ve seen from him.'),
            say('Get home safe. Please.'),
            text('He backs away slowly, still smiling, then turns and disappears into the steam.'),
            endDate(),
          ),
          branch('Not tonight',
            say('Of course. No — of course. I\'m sorry, I shouldn\'t have—'),
            text('You tell him there\'s nothing to apologise for. He nods, manages a smile.'),
            say('Get home safe. And... I hope we can do this again sometime.'),
            text('He gives a small wave, then turns and walks into the steam.'),
            endDate(),
          ),
        ),
        // Below threshold: standard farewell, no kiss
        seq(
          text('He hesitates, opens his mouth, closes it again, then settles for a warm smile.'),
          say('Get home safe. And... I hope we can do this again sometime.'),
          text('He gives a small, almost bashful wave, then turns and disappears into the steam.'),
          endDate(),
        ),
      ),
    ],
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
  onComplete: standardComplete(15),

  dateScene: scenes(
    // ── Scene 1: Setting off from City Centre ──
    [
      hideNpcImage(),
      text('Rob offers you his arm, and together you set off through the lamplit streets.'),
      move('lake', 15),
      text('The city fades behind you as you approach the lake. The evening air is cool and fragrant with coal smoke and distant flowers.'),
    ],

    // ── Scene 2: Arriving at the Lake ──
    [
      text('Steam rises from the lake in languid spirals, catching the last amber light. The surface is mirror-still.'),
      showNpcImage(),
      say('I come here sometimes after work. It\'s the one place in Aetheria where you can actually hear yourself think.'),
      text('He gazes out across the water, the steam wreathing around you both like something from a dream.'),
    ],

    // ── Scene 3: Lakeside conversation — intimacy choice ──
    [
      say('You know, when I first came to the city I was terrified. Couldn\'t tell a steam valve from a kettle. But there\'s something about this place that gets under your skin.'),
      text('He glances at you, his expression earnest.'),
      say('I\'m glad you came tonight. Really glad.'),
      text('He moves a little closer on the bench. His arm rests along the back, not quite touching your shoulder.'),
      // Player choice: show intimacy or hold back
      branch('Lean against him',
        text('You lean against his shoulder. He tenses for a moment, then relaxes, letting out a slow breath.'),
        addNpcStat('affection', 3, 'tour-guide'),
        say('This is... really nice.'),
        text('His voice is barely above a whisper. You feel the warmth of him through his coat.'),
      ),
      branch('Stay where you are',
        text('You keep a comfortable distance, watching the steam curl over the water.'),
        say('It\'s peaceful here, isn\'t it? Away from all the noise.'),
        text('He smiles — a little wistful, but genuine.'),
      ),
    ],

    // ── Scene 4: Skill check — Perception reveals something special ──
    [
      text('You sit together in the quiet, watching the last of the daylight dissolve into deep blue.'),
      skillCheck('Perception', 10,
        [
          text('Something catches your eye — a streak of light arcing across the sky, trailing sparks like a tiny clockwork firework.'),
          say('A shooting star! Did you see that? Quick — make a wish!'),
          text('Rob closes his eyes tight, grinning like a child. When he opens them, he catches you watching and goes pink.'),
          say('I\'m not telling you what I wished for. That\'s the rule.'),
          addNpcStat('affection', 2, 'tour-guide'),
        ],
        [
          text('The stars are beginning to appear, faint pinpricks in the deepening sky.'),
          say('Beautiful night for it. Couldn\'t have asked for better weather.'),
        ],
      ),
    ],

    // ── Scene 5: Route choice — Pier (default) or secret garden (high affection) ──
    [
      say('Shall we walk a bit further? I know a few spots around here.'),
      // High-affection path: Rob knows a secret garden
      cond(
        npcStat('tour-guide', 'affection', 35),
        seq(
          text('He hesitates, then lowers his voice.'),
          say('Actually... there\'s a place I\'ve never shown anyone. A garden, hidden behind the old waterworks. It\'s a bit of a scramble to get to, but it\'s worth it. If you trust me.'),
          text('His eyes are bright with a mix of nerves and excitement.'),
          branch('Go to the hidden garden', robGardenPath()),
          branch('Stick to the pier', robPierPath()),
        ),
        // Default: just the pier
        seq(
          text('He gestures along the lakeside path where lanterns glow like a string of earthbound stars.'),
          say('The pier\'s lovely at night. Come on.'),
          branch('Walk to the pier', robPierPath()),
        ),
      ),
    ],
  ),
})
