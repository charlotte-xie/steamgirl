/**
 * Rob Hayes — Tour Guide
 *
 * Rob is one of the first NPCs the player meets. He's a genial, eager
 * puppy-dog type: warm, enthusiastic, and easily impressed. He genuinely
 * likes people and the city, and takes real pleasure in showing newcomers
 * around.
 * 
 * Important stats:
 * - affection => gates dating Rob. 20-50 = happy to date, 50+ = seeks relationship, 80+ = obsessive love
 * - tourDone => modifies the city tour (becomes mini date that can be repeated)
 *
 * Romance path & affection budget:
 *
 *   PRE-DATE (easy to reach ~20-25):
 *   - Can gain affection with city your, flirting or hotel room invite
 *
 *   DATE INVITATION:
 *   - Triggered by: Flirtation skill check DC 10, affection > 20, no
 *     existing date card
 *
 *   DATES — higher affection earned through the date scenes:
 *   - Various choices and skill checks, can boost affection
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
  say, npcLeaveOption, npcInteract, learnNpcName,
  seq, when, random, cond,
  addNpcStat, moveNpc,
  discoverLocation, option, branch, scene, scenes,
  move, time,
  hideNpcImage, showNpcImage,
  hasStat, npcStat, skillCheck,
  run, and, not, or, hasCard, inLocation,
  hasRelationship, setRelationship, chance,
  inBedroom, kiss,
} from '../../model/ScriptDSL'
import {
  registerDatePlan, endDate,
  handleDateApproach,
  standardGreeting, standardCancel, standardNoShow, standardComplete,
  tryStrip,
} from '../Dating'

// ============================================================================
// CITY TOUR — FIRST TIME
// ============================================================================

/** First tour: guided sightseeing with one player choice per stop. */
function robFirstTour(): Instruction {
  return scenes(
    // City centre
    scene(
      hideNpcImage(),
      'You set off with Rob.',
      move('default'), time(15),
      say('Here we are—the heart of Aetheria. Magnificent, isn\'t it?'),
      'Towering brass structures with visible gears and pipes reach toward the sky. Steam-powered carriages glide through cobblestone streets, while clockwork automatons serve the citizens. The air hums with the mechanical pulse of the city.',
      branch('Tell him you\'re impressed',
        say('You should see it at sunset — the brass catches the light something beautiful.'),
        'He looks pleased by your reaction.',
        addNpcStat('affection', 1, { max: 10, hidden: true }),
      ),
      branch('Nod politely',
        'You take in the sights. Rob watches your face, gauging your reaction.',
        say('Give it time. It grows on you.'),
      ),
    ),
    // Imperial Hotel
    scene(
      discoverLocation('hotel'),
      move('hotel'), time(5),
      'Rob takes you to an imposing brass-and-marble facade with gilt lettering above its revolving doors. You take a peek inside.',
      say('The Imperial Hotel. Very grand, very expensive — too expensive for most folks. But worth knowing about if you ever come into money.'),
    ),
    // University
    scene(
      discoverLocation('school'),
      move('school'), time(15),
      say('The University — you\'ll be studying there you say? A fine institution.'),
      'Its grand brass doors and halls where you will learn the mechanical arts, steam engineering, and the mysteries of clockwork.',
      discoverLocation('subway-university'),
      say('There\'s a subway here — efficient way to get around the city though it costs 3 Krona. It\'s also pretty safe... most of the time...'),
      // Perception check — notice an inscription
      skillCheck('Perception', 5,
        seq(
          'As you pass through the courtyard, you notice a faded inscription carved into the stone archway — old Aetherian script, almost worn smooth.',
          say('Sharp eyes! Most people walk right past that. It\'s the university\'s original motto: "By Steam and Starlight."'),
          addNpcStat('affection', 1, { max: 10, hidden: true }),
        ),
      ),
    ),
    // Lake
    scene(
      discoverLocation('lake'),
      move('lake'), time(18),
      say('The Lake. A peaceful spot when the city gets too much. Steam off the water — rather lovely.'),
      'Steam gently rises from the surface, creating a serene mist. A sanctuary where the mechanical and natural worlds blend.',
    ),
    // Market
    scene(
      discoverLocation('market'),
      move('market'), time(15),
      say('The Market. Best place for oddities and curios. Keep your wits about you.'),
      'Vendors display exotic mechanical trinkets and clockwork wonders. The air is filled with haggling, the clink of gears, and the hiss of steam.',
      branch('Ask about his favourite stall',
        say('Oh — there\'s a fellow who sells miniature clockwork birds. Completely useless, absolutely charming. I\'ve got three.'),
        'He grins, embarrassed.',
        addNpcStat('affection', 1, { max: 10, hidden: true }),
      ),
      branch('Keep moving',
        'You press through the crowd. Rob stays close, one hand hovering near your elbow.',
      ),
    ),
    // Backstreets
    scene(
      discoverLocation('backstreets'),
      move('backstreets'), time(15),
      'The alleys close in, narrow and intimate. Gas lamps flicker like dying heartbeats. Somewhere above, gears moan. Somewhere below, something else answers.',
      say('Your room\'s in one of the buildings, I believe. It\'s a nice enough area, but be careful at night.'),
    ),
    // Tour ends — farewell
    scene(
      showNpcImage(),
      'Rob shows you around the backstreets for a while.',
      say('I hope this helps you find your feet. Enjoy Aetheria!'),
      addNpcStat('affection', 1, { hidden: true }),
      addNpcStat('tourDone', 1, { hidden: true }),
      npcLeaveOption('You thank Rob and he leaves you in the backstreets.'),
    ),
  )
}

// ============================================================================
// CITY TOUR — REPEAT (mini-date)
// ============================================================================

/** Repeat tour: more relaxed, varied stops, flirt potential. */
function robRepeatTour(): Instruction {
  return scenes(
    // Setting off — tone varies by relationship
    scene(
      hideNpcImage(),
      cond(
        hasRelationship('boyfriend'),
        seq(
          random(
            seq(
              say('Come on, love. Let me show you my city properly.'),
              'He takes your hand and pulls you along.',
            ),
            seq(
              say('I know you\'ve seen it all before. But you haven\'t seen it with me holding your hand.'),
              'He grins and laces his fingers through yours.',
            ),
          ),
        ),
        random(
          seq(
            say('Fancy another spin? I know a few spots I skipped last time.'),
            'He falls into step beside you, matching your pace.',
          ),
          seq(
            say('Back for more? I\'ll take that as a compliment.'),
            'He grins and gestures for you to follow.',
          ),
          seq(
            say('I was hoping you\'d ask. Come on — I\'ve got something to show you.'),
            'He sets off eagerly, almost forgetting to wait for you.',
          ),
        ),
      ),
      move('default'), time(10),
    ),
    // City centre — random vignette
    scene(
      random(
        seq(
          'Rob takes you past a steam-powered street organ. It wheezes out a jaunty tune that echoes off the brass facades.',
          say('This old thing\'s been here longer than I have. I think it plays the same three songs.'),
          branch('Dance a few steps',
            'You sway to the music. Rob laughs — surprised, delighted — and does a clumsy little shuffle of his own.',
            addNpcStat('affection', 2, { max: 25, hidden: true }),
          ),
          branch('Listen for a moment',
            'You stand together, letting the tinny melody wash over you. Rob hums along under his breath.',
          ),
        ),
        seq(
          'A clockwork performer stands motionless on a plinth, then springs to life as you pass — juggling brass balls in a blur of gears.',
          say('Brilliant, isn\'t it? Someone programmed it to learn new tricks. Last week it was doing card tricks.'),
          skillCheck('Mechanics', 8,
            seq(
              'You point out the hidden counterweight mechanism in its wrist. Rob stares.',
              say('How did you spot that? I\'ve watched this thing a dozen times and never noticed.'),
              addNpcStat('affection', 1, { max: 25, hidden: true }),
            ),
          ),
        ),
        seq(
          'Rob steers you down a side street you haven\'t seen before. A tiny brass plaque reads "Automaton Row."',
          say('The craftsmen who build the city\'s automatons all work along here. You can hear them hammering away.'),
          'The rhythmic clanging drifts from open workshop doors, accompanied by the hiss of soldering torches.',
        ),
      ),
    ),
    // Lake or market — alternating flavour
    scene(
      random(
        // Lake detour
        seq(
          move('lake'), time(15),
          'Rob takes a detour past the lake. The steam is thicker today, curling in slow spirals.',
          cond(
            npcStat('affection', { min: 15 }),
            seq(
              say('I come here when I need to think. It\'s my favourite spot in the whole city.'),
              'He pauses, watching the steam curl over the water.',
              say('I don\'t usually tell people that. But — I wanted you to know.'),
            ),
            say('Lovely this time of day, isn\'t it? The steam catches the light.'),
          ),
          skillCheck('Perception', 8,
            seq(
              'You notice a heron standing motionless at the water\'s edge — real, not clockwork. Its stillness is almost mechanical.',
              say('Would you look at that! I\'ve never seen a real one here before. They usually avoid the steam.'),
              addNpcStat('affection', 1, { max: 25, hidden: true }),
            ),
          ),
        ),
        // Market detour
        seq(
          move('market'), time(15),
          'Rob leads you through the market. The stalls are different today — new wares, new faces.',
          random(
            seq(
              say('Oh — look at this.'),
              'He picks up a tiny brass bird from a stall. It flutters in his palm, wings whirring.',
              say('I keep meaning to buy one for my flat. Maybe today\'s the day.'),
            ),
            seq(
              'A vendor offers you both samples of spiced tea from a steaming brass urn.',
              say('Go on, try it. The cinnamon one\'s good.'),
            ),
            seq(
              say('See that stall with the red canopy? Best meat pies in the city. Don\'t tell anyone.'),
              'He taps the side of his nose conspiratorially.',
            ),
          ),
        ),
      ),
    ),
    // Backstreets — intimate moment
    scene(
      move('backstreets'), time(10),
      showNpcImage(),
      'The backstreets are quieter than the main thoroughfares. Rob slows his pace.',
      cond(
        // Boyfriend: relaxed, natural affection
        hasRelationship('boyfriend'),
        seq(
          'He takes your hand as you walk, threading his fingers through yours.',
          say('I love this. Just walking with you. No agenda, no tour script — just us.'),
          branch('Squeeze his hand',
            'You squeeze his hand. He lifts yours to his lips and kisses your knuckles.',
            say('I\'m a lucky man.'),
            addNpcStat('affection', 2, { max: 70, hidden: true }),
          ),
          branch('Tease him about his tour script',
            say('Oi! I\'ll have you know that script is very well written.'),
            'He grins and bumps your shoulder.',
            addNpcStat('affection', 1, { max: 70, hidden: true }),
          ),
        ),
        // High affection: vulnerable moment
        npcStat('affection', { min: 15 }),
        seq(
          say('You know, I used to do these tours and it was just... work. Talking to strangers. But with you it\'s different.'),
          'He glances at you, then quickly away.',
          // Flirt opportunity on repeat tours
          when(hasStat('Flirtation', 1),
            seq(
              branch('Flirt back',
                'You tell him you enjoy his company too — more than he probably realises.',
                say('I — really? That\'s — blimey.'),
                'His ears go pink. He\'s trying very hard not to grin.',
                addNpcStat('affection', 2, { max: 25 }),
              ),
              branch('Smile warmly',
                'You give him a warm smile. He relaxes, matching it with one of his own.',
                addNpcStat('affection', 1, { max: 25, hidden: true }),
              ),
            ),
          ),
        ),
        // Default
        seq(
          say('Getting to know the backstreets takes a while. Lots of little turns and dead ends.'),
          'He points out a few landmarks — a bakery with a brass chimney, a wall covered in old playbills.',
        ),
      ),
    ),
    // Farewell
    scene(
      cond(
        hasRelationship('boyfriend'),
        seq(
          say('See you later, love.'),
          'He kisses you — quick, warm, familiar — then heads off with a wave.',
          kiss(2),
        ),
        random(
          seq(
            say('Same time next time?'),
            'He catches himself.',
            say('I mean — if you want. No pressure.'),
          ),
          seq(
            say('I always enjoy our little walks. Is that odd to say?'),
            'He scratches the back of his neck, smiling.',
          ),
          seq(
            say('Right then. Back to the station for me.'),
            'He lingers a moment, as though he\'s forgotten something. Then he gives a small wave.',
          ),
        ),
      ),
      addNpcStat('affection', 1, { hidden: true }),
      addNpcStat('tourDone', 1, { hidden: true }),
      npcLeaveOption('You part ways in the backstreets.'),
    ),
  )
}

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
    const loc = npc.location ? game.getLocation(npc.location) : undefined

    // Stay in bedroom with the player outside of work hours
    if (loc?.template.isBedroom && npc.location === game.currentLocation && game.hourOfDay < 9) {
      return
    }

    // Normal schedule — date positioning is handled by the Date card's afterUpdate
    // If Rob is leaving the player's location, followSchedule fires onLeavePlayer
    npc.followSchedule(game, [
      [9, 18, 'station'],
    ])
  },

  maybeApproach: (game: Game) => {
    handleDateApproach(game, 'tour-guide')
  },

  onLeavePlayer: npcInteract('morningDepart'),

  onWait: (game: Game) => {
    // Auto-greet at station if not yet met
    const npc = game.getNPC('tour-guide')
    if (npc.nameKnown === 0) {
      game.run('approach', { npc: 'tour-guide' })
    }
  },

  onWaitAway: (game: Game) => {
    // Random evening visit — boyfriend drops by your room
    if (
      game.player.relationships.get('tour-guide') === 'boyfriend' &&
      game.location.template.isBedroom &&
      game.hourOfDay >= 18 && game.hourOfDay < 22 &&
      !game.player.hasCard('date') &&
      Math.random() < 0.2
    ) {
      game.scene.npc = 'tour-guide'
      game.scene.hideNpcImage = false
      game.run('interact', { script: 'robVisit' })
    }
  },

  onFirstApproach: seq(
    'A man with a well-worn guidebook catches your eye and steps over with a warm smile.',
    say("The name's Rob Hayes. I lead tours of the city for new arrivals. It takes about an hour and ends in the backstreets—handy if that's where you're headed. Fancy it?"),
    learnNpcName(),
    option('Accept', npcInteract('tour')),
    npcLeaveOption(
      'You politely decline the invitation.',
      "Whenever you're ready. I'm usually here at the station.",
      'Decline',
    ),
  ),

  onApproach: seq(
    cond(
      // In a bedroom — dispatch to appropriate chat
      inLocation('dorm-suite'),
      npcInteract('roomChat'),
      inBedroom(),
      npcInteract('lodgingsChat'),
      seq(
        // Greeting varies based on shared history and relationship
        cond(
          hasRelationship('boyfriend'),
          say('There you are! I was hoping you\'d come by.'),
          hasCard('date'),
          say('Hello again! Looking forward to later.'),
          npcStat('hotelVisited'),
          say('Good to see you! How\'s the Imperial treating you?'),
          npcStat('tourDone'),
          say('Hello again! How are you finding the city?'),
          say('Back again? The tour offer still stands if you\'re interested.'),
        ),
        // Options
        cond(
          npcStat('tourDone'),
          option('Take another tour', npcInteract('tour')),
          option('Accept the tour', npcInteract('tour')),
        ),
        when(and(hasCard('hotel-booking'), not(npcStat('hotelVisited'))),
          option('Invite to see your hotel room', npcInteract('inviteToRoom')),
        ),
        when(hasStat('Flirtation', 1),
          option('Flirt', npcInteract('flirt')),
        ),
        when(hasRelationship('boyfriend'),
          option('Kiss him', npcInteract('quickKiss')),
        ),
        when(hasRelationship('boyfriend'),
          option('Break up', npcInteract('breakup')),
        ),
        npcLeaveOption(undefined, 'No worries. Safe travels!', 'Decline'),
      ),
    ),
  ),

  scripts: {
    // Quick boyfriend kiss — usable from any chat context
    quickKiss: seq(
      random(
        seq(
          'You lean in and kiss him. He smiles against your lips.',
          say('What was that for?'),
          'You tell him you felt like it.',
        ),
        seq(
          'You catch his hand and pull him close for a kiss.',
          say('Mmm. Hello to you too.'),
        ),
        seq(
          'You press a quick kiss to the corner of his mouth. He turns his head to catch it properly.',
          say('You missed. Let me help.'),
        ),
      ),
      time(1),
      kiss(3),
    ),

    // ----------------------------------------------------------------
    // CITY TOUR
    // ----------------------------------------------------------------
    tour: cond(
      npcStat('tourDone'),
      robRepeatTour(),
      robFirstTour(),
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
        addNpcStat('affection', 10, { max: 15 }),
        addNpcStat('hotelVisited', 1, { hidden: true }),
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
      option('Chat', 'npc:roomChat'),
      when(hasRelationship('boyfriend'),
        option('Kiss him', 'npc:quickKiss'),
      ),
      when(hasStat('Flirtation', 1),
        option('Flirt', 'npc:flirt'),
      ),
      when(hasRelationship('boyfriend'),
        option('Break up', 'npc:breakup'),
      ),
      npcLeaveOption('You leave Rob to it for now.', undefined, 'Do something else'),
      option('Depart Room', 'npc:leaveRoom'),
    ),

    // Leave the hotel room together
    leaveRoom: seq(
      'You suggest heading back downstairs.',
      say('Right you are. Thanks for the visit — quite the treat!'),
      moveNpc('tour-guide', null),
      move('hotel', 1),
    ),

    // ----------------------------------------------------------------
    // LODGINGS VISIT — boyfriend drops by your room
    // ----------------------------------------------------------------
    robVisit: scenes(
      scene(
        'A knock at your door. You open it to find Rob on the landing, slightly out of breath.',
        moveNpc('tour-guide', 'bedroom'),
        showNpcImage(),
        random(
          say('I was passing through the backstreets and thought I\'d see if you were in. Is this all right?'),
          say('Evening, love. I finished up early and couldn\'t stop thinking about you.'),
          say('I couldn\'t sleep. Kept thinking about you. So I thought... why not?'),
        ),
        addNpcStat('affection', 1, { hidden: true, max: 70 }),
        branch('Come in',
          'You step aside and he slips through the doorway.',
          npcInteract('lodgingsChat'),
        ),
        branch('It\'s not a good time',
          say('Oh — of course. Sorry, I should have sent word first.'),
          'He gives an apologetic smile and backs away.',
          say('I\'ll see you at the station. Goodnight, love.'),
          addNpcStat('affection', -5),
          moveNpc('tour-guide', null),
        ),
      ),
    ),

    // Repeatable lodgings interaction — more intimate than hotel roomChat
    lodgingsChat: seq(
      random(
        say('It\'s cosy in here. I like it. It\'s very you.'),
        say('Have you read all these books? I can barely manage a newspaper.'),
        seq(
          say('It\'s nice being somewhere quiet with you. No crowds, no steam engines.'),
          'He settles into the chair by your desk, looking perfectly at home.',
        ),
        say('I like your room. It\'s small but it\'s... warm. Like you.'),
        say('This is much better than the station. Better company, too.'),
      ),
      option('Chat', 'npc:lodgingsChat'),
      option('Kiss him', 'npc:lodgingsKiss'),
      when(or(hasCard('flushed'), hasStat('Flirtation', 20)),
        option('Pull him to the bed', 'npc:makeOut'),
      ),
      npcLeaveOption('You leave Rob to it for now.', undefined, 'Do something else'),
      option('Ask him to leave', 'npc:leaveLodgings'),
    ),

    // Intimate moment — kissing in your room
    lodgingsKiss: seq(
      random(
        seq(
          'You lean over and kiss him. He makes a small surprised sound, then melts into it.',
          say('What was that for?'),
          'You tell him you felt like it.',
          say('Feel like it more often.'),
        ),
        seq(
          'He\'s mid-sentence when you kiss him. He forgets whatever he was saying.',
          say('I — what were we talking about?'),
          'He grins, dazed.',
        ),
        seq(
          'You sit beside him and rest your head on his shoulder. He turns and presses his lips to your hair, then your forehead, then finds your mouth.',
          'The kiss is slow and unhurried. There\'s nowhere either of you needs to be.',
        ),
      ),
      addNpcStat('affection', 2, { max: 75, hidden: true }),
      time(2),
      kiss(5),
      option('Chat', 'npc:lodgingsChat'),
      option('Kiss him again', 'npc:lodgingsKiss'),
      when(or(hasCard('flushed'), hasStat('Flirtation', 20)),
        option('Pull him to the bed', 'npc:makeOut'),
      ),
      npcLeaveOption('You leave Rob to it for now.', undefined, 'Do something else'),
      option('Ask him to leave', 'npc:leaveLodgings'),
    ),

    // Making out in bed — escalation from kissing
    makeOut: seq(
      'You take his hand and pull him towards the bed. He follows without resistance.',
      random(
        seq(
          say('Are you sure? I mean — I\'m not complaining, I just—'),
          'You silence him with a kiss. He stops talking.',
        ),
        seq(
          'He lets out a shaky breath as you pull him down beside you.',
          say('Right. Yes. This is — this is happening.'),
        ),
        seq(
          say('I\'ve been thinking about this all evening.'),
          'He pulls you close, one hand tangling in your hair.',
        ),
      ),
      kiss(8),
      time(2),
      npcInteract('makeOutMenu'),
    ),

    // Looping menu for the makeout scene
    makeOutMenu: seq(
      random(
        seq(
          'His hands trace the curve of your waist. His breath is warm against your neck.',
          say('You\'re so beautiful. I can\'t think straight.'),
        ),
        seq(
          'He kisses the hollow of your throat, then your collarbone, then finds your mouth again.',
          'The world outside your room ceases to exist.',
        ),
        seq(
          'You press against him and he makes a soft, helpless sound.',
          say('Don\'t stop. Please don\'t stop.'),
        ),
        seq(
          'His fingers trace along your jawline. He kisses you slowly, deliberately, as if memorising the shape of you.',
        ),
        seq(
          'You run your hands through his hair and he shivers.',
          say('You have no idea what you do to me.'),
        ),
      ),
      kiss(5),
      time(3),
      addNpcStat('affection', 1, { max: 80, hidden: true }),
      option('Keep going', 'npc:makeOutMenu'),
      option('Kiss him', 'npc:makeOutKiss'),
      branch('Slow down',
        'You gently press a hand to his chest. He pulls back immediately, eyes searching yours.',
        say('Too much? I\'m sorry — I got carried away.'),
        'You tell him it\'s fine. He brushes a strand of hair from your face and smiles.',
        say('I\'ll take whatever you\'re willing to give. Always.'),
        npcInteract('lodgingsChat'),
      ),
      tryStrip(),
    ),

    // Kissing within the makeout scene — more intense
    makeOutKiss: seq(
      random(
        seq(
          'You kiss him hard. He gasps against your mouth, his hands tightening on your hips.',
          say('God, you\'re—'),
          'He doesn\'t finish the sentence. He doesn\'t need to.',
        ),
        seq(
          'You cup his face and kiss him, deep and unhurried. He melts into you, boneless.',
          'When you finally pull apart, his eyes are dark and dazed.',
        ),
        seq(
          'He catches your lower lip gently between his teeth. A thrill runs through you.',
          say('Sorry — was that—'),
          'You kiss him again before he can apologise.',
        ),
      ),
      kiss(8),
      time(2),
      addNpcStat('affection', 1, { max: 80, hidden: true }),
      option('Keep going', 'npc:makeOutMenu'),
      option('Kiss him again', 'npc:makeOutKiss'),
      branch('Slow down',
        say('We should probably... stop. Before I lose what\'s left of my self-control.'),
        'He presses his forehead against yours, breathing hard.',
        say('You\'re going to be the death of me. In the best possible way.'),
        npcInteract('lodgingsChat'),
      ),
      tryStrip(),
    ),

    // Rob leaves your room
    leaveLodgings: seq(
      say('Right. I should probably head off. Early start tomorrow.'),
      'He stands and stretches, then pauses at the door.',
      random(
        seq(
          say('Goodnight, love.'),
          'He kisses you gently, then slips out.',
          kiss(2),
        ),
        seq(
          say('Sleep well. Dream of me.'),
          'He winks, then disappears down the stairwell.',
        ),
        seq(
          say('I\'ll see you tomorrow. At the station, if not before.'),
          'He squeezes your hand, then he\'s gone.',
        ),
      ),
      moveNpc('tour-guide', null),
    ),

    // Rob says goodbye in the morning before leaving for work
    morningDepart: seq(
      random(
        seq(
          'Rob pulls on his boots and reaches for his cap.',
          say('Right — I\'d better head to the station. Early shift.'),
          'He pauses at the door and looks back at you.',
          say('Last night was lovely. I\'ll think about it all day.'),
        ),
        seq(
          'Rob stretches and checks his pocket watch, then winces.',
          say('Is that the time? I\'m going to be late.'),
          'He scrambles for his coat, then stops to kiss you on the cheek.',
          kiss(2),
          say('I\'ll see you later, yeah?'),
        ),
        seq(
          'Rob buttons his coat and tucks his guidebook under his arm.',
          say('I don\'t want to go. But if I\'m late again, the stationmaster will have my head.'),
          'He grins ruefully.',
        ),
        seq(
          say('I could stay, you know. Call in sick. Spend the whole day here with you.'),
          'He\'s already putting his boots on as he says it. You both know he won\'t.',
          say('No, you\'re right. Duty calls.'),
        ),
      ),
      branch('Kiss him goodbye',
        'You pull him close and kiss him. He lingers a moment longer than he should.',
        kiss(5),
        say('Now I\'m definitely going to be late.'),
        'He grins and slips out the door.',
      ),
      branch('See you later',
        say('See you later, love.'),
        'He squeezes your hand, then he\'s gone.',
      ),
    ),

    // ----------------------------------------------------------------
    // BREAKUP — only available when in a relationship
    // ----------------------------------------------------------------
    breakup: scenes(
      scene(
        'You tell Rob that you want to talk about your relationship.',
        say('Oh. I — what do you mean?'),
        'His smile fades. He can see it in your face already.',
      ),
      scene(
        say('You\'re breaking up with me. Aren\'t you.'),
        'It isn\'t really a question. His voice is steady but his hands are shaking.',
        branch('Yes',
          say('Right. I — right.'),
          'He takes a deep breath. His eyes are bright but he doesn\'t cry.',
          say('I understand. I do. I just... I thought we were happy.'),
          'He manages a small, broken smile.',
          say('I\'ll always care about you. I hope you know that.'),
          setRelationship(''),
          addNpcStat('affection', -40, { min: 5 }),
          npcLeaveOption('Rob leaves quietly. He doesn\'t look back.'),
        ),
        branch('I changed my mind',
          say('Don\'t scare me like that!'),
          'He exhales, relieved, and shakes his head.',
          say('My heart nearly stopped. Come here.'),
        ),
      ),
    ),

    // ----------------------------------------------------------------
    // FLIRTING — requires Flirtation > 0
    // +3 affection capped at 30 (easy phase).
    // Past 30, needs a Charm check — failure causes pushback and -3.
    // May trigger a date invitation if conditions are met.
    // ----------------------------------------------------------------
    flirt: seq(
      // Main flirt interaction
      cond(
        npcStat('affection', { min: 30 }),
        // Past 30: needs Charm to avoid pushback
        skillCheck('Charm', 12,
          seq(
            addNpcStat('affection', 2, { max: 40, hidden: true }),
            random(
              seq(
                'You say something quiet and sincere about how much you enjoy his company.',
                say('I... thank you. I mean that. You\'re — you\'re special, you know that?'),
                'He holds your gaze for a moment, then looks away with a small, genuine smile.',
              ),
              seq(
                'You let the silence between you stretch — warm and companionable, not awkward.',
                say('I like this. Just... being with you. Not having to fill every moment with chatter.'),
                'He relaxes visibly, leaning back.',
              ),
              seq(
                'You compliment something specific — the way he always notices when you\'re cold, the way he remembers little things.',
                say('You noticed that? I didn\'t think anyone—'),
                'He breaks off, blinking. His smile is slow but real.',
              ),
            ),
          ),
          seq(
            addNpcStat('affection', -3, { min: 20 }),
            random(
              seq(
                'You lean in close and trail a finger down his arm.',
                say('I — could we — maybe slow down a bit?'),
                'He takes a small step back, not unkindly, but firmly. His ears are red and he won\'t quite meet your eye.',
              ),
              seq(
                'You try to hold his hand, but he gently disentangles his fingers.',
                say('Sorry, I just — I\'m not quite ready for... I need a bit more time.'),
                'He looks genuinely uncomfortable. You\'ve pushed a little too far.',
              ),
              seq(
                'You say something bold. Rob\'s smile falters.',
                say('That\'s — I mean — you\'re lovely, but I...'),
                'He trails off, clutching his guidebook like a shield. The moment passes awkwardly.',
              ),
            ),
          ),
        ),
        // Below 30: easy flirting
        seq(
          addNpcStat('affection', 3, { max: 30 }),
          random(
            seq(
              'You lean a little closer and compliment his knowledge of the city.',
              say('Oh! Well, I — thank you. I do try to keep up with things. You\'re very kind to say so.'),
              'His ears go pink.',
            ),
            seq(
              'You brush his arm and tell him he\'s got a lovely smile.',
              say('I — what? Me? I mean — that\'s — blimey.'),
              'He fumbles with his guidebook, grinning like an idiot.',
            ),
            seq(
              'You catch his eye and hold it just a beat longer than necessary.',
              say('I, erm. Right. Yes. Where were we? I\'ve completely lost my train of thought.'),
              'He scratches the back of his neck, flustered but clearly pleased.',
            ),
            seq(
              'You tell him you feel safe with him around.',
              say('Really? That\'s — well, that means a lot, actually. I\'ll always look out for you.'),
              'He straightens up a little, trying not to beam.',
            ),
            seq(
              'You tuck a stray bit of hair behind your ear and ask if he\'d like to show you around again sometime — just the two of you.',
              say('Just us? I — yes. Yes, I\'d like that very much.'),
              'He clutches his guidebook to his chest as though it might escape.',
            ),
          ),
        ),
      ),
      time(3),
      // Date invitation — probabilistic skill check + conditions
      cond(
        and(
          run('skillCheck', { skill: 'Flirtation', difficulty: 10 }),
          npcStat('affection', { min: 21 }),
          not(hasCard('date')),
        ),
        seq(
          say('I was thinking... would you fancy going for a walk tomorrow evening? Just the two of us. I know a lovely spot by the lake.'),
          'He looks at you hopefully, his ears going pink again.',
          option('Accept the date', npcInteract('dateAccept')),
          option('Decline', npcInteract('dateDecline')),
          npcLeaveOption(),
        ),
        // Re-show options based on location
        cond(
          inLocation('dorm-suite'),
          seq(
            option('Chat', 'npc:roomChat'),
            option('Flirt', 'npc:flirt'),
            option('Depart Room', 'npc:leaveRoom'),
            npcLeaveOption(),
          ),
          seq(
            option('Accept the tour', npcInteract('tour')),
            when(hasCard('hotel-booking'),
              option('Invite to see your hotel room', npcInteract('inviteToRoom')),
            ),
            option('Flirt', npcInteract('flirt')),
            npcLeaveOption(undefined, 'No worries. Safe travels!', 'Decline'),
          ),
        ),
      ),
    ),

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

    dateDecline: seq(
      say('Oh. No, that\'s — of course. Maybe some other time, then.'),
      'He tries to smile, but his disappointment is obvious.',
      npcLeaveOption(),
    ),
  },
})

// ============================================================================
// ROB'S DATE — BRANCHING PATHS
// ============================================================================

/** Normal date — the full lake/pier/garden sequence for non-boyfriend dates. */
function robNormalDate(): Instruction {
  return scenes(
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
        addNpcStat('affection', 3, { max: 45 }),
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
        seq(
          'Something catches your eye — a streak of light arcing across the sky, trailing sparks like a tiny clockwork firework.',
          say('A shooting star! Did you see that? Quick — make a wish!'),
          'Rob closes his eyes tight, grinning like a child. When he opens them, he catches you watching and goes pink.',
          say('I\'m not telling you what I wished for. That\'s the rule.'),
          addNpcStat('affection', 2, { max: 45 }),
        ),
        seq(
          'The stars are beginning to appear, faint pinpricks in the deepening sky.',
          say('Beautiful night for it. Couldn\'t have asked for better weather.'),
        ),
      ),
    ),

    // ── Scene 5: Route choice — Pier (default) or secret garden (high affection) ──
    scene(
      say('Shall we walk a bit further? I know a few spots around here.'),
      // High-affection path: Rob knows a secret garden
      cond(
        npcStat('affection', { min: 35 }),
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
  )
}

// ============================================================================
// ROB'S BOYFRIEND DATE
// ============================================================================

/** Boyfriend date — relaxed, affectionate, intimate. */
function robBoyfriendDate(): Instruction {
  return scenes(
    // ── Scene 1: Setting off — easy warmth ──
    scene(
      hideNpcImage(),
      random(
        seq(
          'Rob takes your hand the moment you set off, lacing his fingers through yours as though it\'s the most natural thing in the world.',
          say('I\'ve been looking forward to this all day, love.'),
        ),
        seq(
          'He pulls you close and kisses your temple before you even say hello.',
          kiss(2),
          say('Come on. I\'ve got plans for us tonight.'),
        ),
        seq(
          say('There\'s my favourite person.'),
          'He wraps an arm around your shoulders as you fall into step together.',
        ),
      ),
      move('lake', 15),
      'The city fades behind you. There\'s no need to fill the silence — it\'s comfortable, warm, yours.',
    ),

    // ── Scene 2: Lake — callback to first date ──
    scene(
      'The lake is quiet tonight. Steam curls across the surface in slow, silver spirals.',
      showNpcImage(),
      random(
        seq(
          say('Remember the first time I brought you here? I was so nervous I could barely string a sentence together.'),
          'He laughs, shaking his head.',
          say('Now look at us.'),
        ),
        seq(
          say('I was thinking about that shooting star. The wish I wouldn\'t tell you about.'),
          'He squeezes your hand.',
          say('It came true, by the way.'),
        ),
        seq(
          say('Same bench, same view, same steam. But it\'s different now, isn\'t it?'),
          'He looks at you, and his expression is so tender it makes your chest ache.',
          say('Better. Much better.'),
        ),
      ),
      addNpcStat('affection', 2, { max: 70, hidden: true }),
    ),

    // ── Scene 3: Intimacy choice ──
    scene(
      'You sit together on the bench. Rob\'s arm settles around you, warm and solid.',
      say('You know what I like about being with you? I don\'t have to try to be interesting. I can just... be.'),
      branch('Lean into him',
        'You rest your head against his shoulder. He presses his cheek against your hair.',
        say('This. Right here. This is everything.'),
        addNpcStat('affection', 3, { max: 70 }),
      ),
      branch('Tease him',
        'You tell him he was never interesting to begin with.',
        say('Oi! That\'s — that\'s just rude, that is.'),
        'But he\'s grinning. He tickles your side until you squirm.',
        say('Take it back!'),
        addNpcStat('affection', 2, { max: 70, hidden: true }),
      ),
    ),

    // ── Scene 4: Random vignette ──
    scene(
      random(
        // Street performer
        seq(
          'A clockwork busker plays a wheezy accordion on the lakeside path. The tune is awful.',
          say('Our song, love.'),
          'He offers you his hand with exaggerated formality.',
          branch('Dance with him',
            'You sway together to the terrible music, laughing too hard to keep time. Other walkers give you odd looks. Neither of you cares.',
            addNpcStat('affection', 3, { max: 70 }),
          ),
          branch('Applaud the busker',
            'You clap enthusiastically. The clockwork performer bows, gears clicking.',
            say('Encore! ... Actually, please don\'t.'),
          ),
        ),
        // Food stall
        seq(
          'A vendor is selling roasted chestnuts from a steam-powered cart. The smell is irresistible.',
          say('My treat. Don\'t argue.'),
          'He buys a bag and holds it between you, your fingers brushing as you reach in.',
          'You eat chestnuts and walk in comfortable silence, shoulders bumping.',
          addNpcStat('affection', 2, { max: 70, hidden: true }),
        ),
        // Stargazing
        seq(
          'Rob stops and tilts his head back, looking up.',
          say('There — the Engineer\'s Star. Remember? My granddad\'s favourite.'),
          skillCheck('Perception', 8,
            seq(
              'You spot a second, fainter star just beside it.',
              say('That one\'s new — or I\'ve never noticed it before. A companion star, maybe.'),
              'He looks at you with an expression that makes the metaphor very clear.',
              addNpcStat('affection', 2, { max: 70, hidden: true }),
            ),
          ),
          say('I used to look up and think about all the places I\'d never go. Now I just think about how glad I am to be right here.'),
        ),
      ),
    ),

    // ── Walk home ──
    ...robWalkHome(),
  )
}

/** Pier path — the default scenic route with gift and stargazing. */
function robPierPath(): Instruction {
  return scenes(
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
        addNpcStat('affection', 5, { max: 50 }),
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
  )
}

/** Garden path — high-affection secret route. */
function robGardenPath(): Instruction {
  return scenes(
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
      addNpcStat('affection', 3, { max: 50 }),
    ),
    // Garden: Conversation — skill check for a special moment
    scene(
      'You wander through the garden together. The roses smell impossibly sweet in the evening air.',
      skillCheck('Charm', 12,
        seq(
          'You tell him it\'s the most beautiful place you\'ve seen in Aetheria. He beams — really beams — as though you\'ve given him a gift worth more than gold.',
          say('You mean that? It\'s just a forgotten garden, but — that means a lot. Coming from you.'),
          addNpcStat('affection', 3, { max: 50 }),
        ),
        seq(
          'You try to find the right words, but the beauty of the place has left you a bit lost for speech.',
          say('It\'s a lot to take in, isn\'t it? I was the same the first time.'),
          'He smiles, understanding.',
        ),
      ),
    ),
    // Garden: Intimacy choice
    scene(
      'Rob sits on the edge of the old fountain. The moonlight catches the angles of his face. He looks up at you.',
      say('Thank you. For coming tonight. For... for being here.'),
      'His voice catches slightly. He looks down at his hands.',
      branch('Sit close beside him',
        'You sit next to him, close enough that your shoulders press together. He exhales — a long, shaky breath — and you feel some tension leave him.',
        addNpcStat('affection', 3, { max: 50 }),
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
  )
}

/**
 * Rob may ask the player to be his girlfriend/boyfriend.
 * Conditions: affection > 50, not already in a relationship, 30% chance.
 * Returns a scene array (empty-looking scene auto-skips if conditions fail).
 */
function robMaybeAskRelationship(): Instruction[] {
  return [
    scene(
      cond(
        and(
          npcStat('affection', { min: 51 }),
          not(hasRelationship()),
          chance(0.3),
        ),
        seq(
          'He takes a breath. His hand finds yours again.',
          say('I need to say something. I\'ve been thinking about it for a while and if I don\'t say it now I never will.'),
          'He meets your eyes, and for once there\'s no fidgeting, no looking away.',
          say('I like you. A lot. More than — well, more than I\'ve liked anyone. And I was wondering if — if you\'d want to be... together. Properly. You and me.'),
          'His voice cracks on the last word. He\'s trembling.',
          branch('Yes',
            say('Really? You mean it?'),
            'His face lights up — pure, unguarded joy. He squeezes your hand tight.',
            say('I\'ll be good to you. I promise. I\'ll be the best — I\'ll try, anyway.'),
            'He laughs, half-crying, and pulls you into a hug that lifts you off your feet.',
            setRelationship('boyfriend'),
            addNpcStat('affection', 5, { hidden: true, max: 70 }),
          ),
          branch('I\'m not ready',
            'His smile freezes, then slowly crumbles.',
            say('Right. No — of course. I understand. I shouldn\'t have — sorry. I\'m sorry.'),
            'He lets go of your hand and takes a step back. He\'s trying to smile but his eyes are bright.',
            say('Forget I said anything. Please.'),
            addNpcStat('affection', -10),
          ),
        ),
      ),
    ),
  ]
}

/** Shared walk-home and farewell scenes. Both paths converge here. */
function robWalkHome(): Instruction[] {
  return [
    // Walk home
    scene(
      hideNpcImage(),
      cond(
        hasRelationship('boyfriend'),
        seq(
          'Rob takes your hand as you walk back through the quiet streets. There\'s no hurry.',
          move('backstreets', 20),
          'The gas lamps paint warm circles on the cobbles. He hums something tuneless and content.',
        ),
        seq(
          'The evening has grown late. Rob walks you back through the quiet streets, taking the long way round.',
          move('backstreets', 20),
          'The backstreets are hushed, the gas lamps flickering. Your footsteps echo in companionable rhythm.',
        ),
      ),
    ),
    // Farewell — conditioned on relationship
    scene(
      showNpcImage(),
      cond(
        // ── Boyfriend farewell: kiss + offer to come back to yours ──
        hasRelationship('boyfriend'),
        seq(
          'He stops under a streetlamp and turns to you. The amber light catches the warmth in his eyes.',
          say('I never get tired of this, you know. Being with you.'),
          'He cups your face gently and kisses you — unhurried, sure, the kind of kiss that feels like coming home.',
          kiss(10),
          addNpcStat('affection', 3, { hidden: true, max: 70 }),
          say('I don\'t want tonight to end just yet.'),
          branch('Come back to mine',
            endDate(),
            move('bedroom', 5),
            moveNpc('tour-guide', 'bedroom'),
            say('I thought you\'d never ask.'),
            npcInteract('lodgingsChat'),
          ),
          branch('Goodnight',
            say('Goodnight, love. I\'ll see you soon.'),
            'He squeezes your hand one last time, then walks into the steam, whistling.',
            endDate(),
          ),
        ),
        // ── High affection: Rob asks to kiss you ──
        npcStat('affection', { min: 40 }),
        seq(
          say('I had a really lovely time tonight. Thank you for coming.'),
          'He stops under a streetlamp, its amber glow soft on his face. He turns to you, and for once he doesn\'t look away.',
          say('I... would it be all right if I kissed you?'),
          'His voice is barely a whisper. His ears are crimson.',
          branch('Kiss him', scenes(
            // The kiss — pure narrative, no stat noise
            scene(
              'You close the distance between you. The kiss is gentle, a little clumsy, and over too soon. When you pull apart his eyes are shining.',
              kiss(10),
              say('I\'ll remember this. Always.'),
              'He touches his lips as though he can\'t quite believe it happened. Then he smiles — the widest, most unguarded smile you\'ve seen from him.',
              addNpcStat('affection', 5, { hidden: true, max: 55 }),
            ),
            // Relationship ask — affection > 50, not already together, 30% chance
            ...robMaybeAskRelationship(),
            // Farewell
            scene(
              say('Get home safe. Please.'),
              'He backs away slowly, still smiling, then turns and disappears into the steam.',
              endDate(),
            ),
          )),
          branch('Not tonight',
            say('Of course. No — of course. I\'m sorry, I shouldn\'t have—'),
            'You tell him there\'s nothing to apologise for. He nods, manages a smile.',
            say('Get home safe. And... I hope we can do this again sometime.'),
            'He gives a small wave, then turns and walks into the steam.',
            endDate(),
          ),
        ),
        // ── Below threshold: standard farewell, no kiss ──
        seq(
          say('I had a really lovely time tonight. Thank you for coming.'),
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

  onGreeting: cond(
    hasRelationship('boyfriend'),
    standardGreeting('There you are, love. I\'ve been counting the minutes. Shall we?'),
    standardGreeting('You came! I was starting to worry. You look wonderful. Shall we?'),
  ),
  onCancel: standardCancel('Oh. Right. No, that\'s... that\'s fine. Maybe another time.', 20),
  onNoShow: standardNoShow('Rob', 'Rob waited in the City Centre for two hours, but you never showed.', 15),
  onComplete: standardComplete(0),

  dateScene: cond(
    hasRelationship('boyfriend'),
    robBoyfriendDate(),
    robNormalDate(),
  ),
})
