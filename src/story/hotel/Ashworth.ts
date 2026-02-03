import { Game } from '../../model/Game'
import { Item } from '../../model/Item'
import { NPC, registerNPC, PRONOUNS } from '../../model/NPC'
import { makeScripts } from '../../model/Scripts'
import type { Instruction } from '../../model/ScriptDSL'
import {
  seq, say, option, npcInteract, npcLeaveOption, addNpcStat,
  random, hideNpcImage, showNpcImage, learnNpcName, paragraph, hl,
  scenes, scene, exit, menu, move, moveNpc, time, run,

  addStat, skillCheck, when, not, hasItem, addItem, inScene,
  saveOutfit, changeOutfit, wearOutfit, npcStat, cond, impression,
  kiss, replaceScene, wantsIntimacy, madeLove, hourBetween,
  discoverLocation, npcPresent, setNpc, inLocation, stripAll,
  chance, dressed, lt, sub, gameTime,
} from '../../model/ScriptDSL'

// ============================================================================
// HOTEL BAR PATRON — Lord Ashworth, wealthy regular (sugar daddy archetype)
//
// Design notes:
//   Impression gates NPC behaviour, not player choices. The player can always
//   attempt to flirt — but Ashworth only reciprocates if she looks the part
//   (appearance ≥ 50). This gives the player feedback ("he's not interested")
//   and a clear goal ("I need to look better") without removing agency.
//
//   Affection tracks repeat visits and warmth of greetings.
//   Appearance gates whether he'll flirt back or offer outings.
//   Flirtation skill gates execution quality (awkward vs. charming).
//
// Stats:
//   affection — increases when the player takes active interest in him
//              (chat, flirt, outings, player-initiated kisses)
//   control   — increases when the player submits to his advances
//              (accepting intimacy he initiated, going along with demands)
//   Both decrease when the player refuses him.
//
// Storylines:
//   True love path: Get affection high enough to melt his heart.
//   Control path: Take advantage of his money, but face increasing demands.
//
// Story arc:
//   chat (bar) → flirt (appearance-gated reaction) → outing (garden/pool)
//   → kiss attempt (skill-gated) → room 533
// ============================================================================

// Shared bar menu — loops via menu(); cond re-evaluates each iteration
function patronMenu(): Instruction {
  return menu(
    cond(
      // After 11pm — he suggests going upstairs
      hourBetween(23, 6),
      seq(
        cond(
          npcStat('madeLove'),
          random(
            seq(
              'He finishes his drink and sets the glass down with quiet finality.',
              say('Shall we go upstairs? I\'ve had enough of the bar.'),
            ),
            seq(
              'He catches your eye and tilts his head towards the lobby.',
              say('It\'s getting late. Come upstairs with me.'),
            ),
          ),
          random(
            seq(
              'He glances at the clock above the bar, then back at you.',
              say('The evening is getting on. I have a room upstairs — 533. Join me for a nightcap?'),
            ),
            seq(
              'He leans closer, his voice dropping.',
              say('I think we\'ve outgrown the bar, don\'t you? My room is just upstairs.'),
            ),
          ),
        ),
        option('Go with him',
          hideNpcImage(),
          discoverLocation('room-533'),
          'The lift carries you upward in comfortable silence. He produces a brass key and unlocks the door with a quiet click.',
          move('room-533', 2),
          exit(npcInteract('room533')),
        ),
        option('Decline',
          random(
            'You shake your head with a smile. His expression barely changes, but the warmth dims.',
            'You tell him you should call it a night. He takes it with practised grace.',
          ),
          say('As you wish. Goodnight.'),
          addNpcStat('affection', -2),
          addNpcStat('control', -2),
          exit(),
        ),
      ),
      // Normal options — sometimes offers room 533 directly if madeLove before
      seq(
        option('Chat', npcInteract('chat')),
        option('Flirt', npcInteract('flirt')),
        when(npcStat('madeLove'),
          option('Go upstairs',
            hideNpcImage(),
            discoverLocation('room-533'),
            say('I was hoping you\'d say that.'),
            'He settles his tab and offers you his arm. The lift carries you up in comfortable silence.',
            move('room-533', 2),
            exit(npcInteract('room533')),
          ),
        ),
        npcLeaveOption('You excuse yourself.', 'Of course. Good evening.'),
      ),
    ),
  )
}

// Kiss attempt — used in garden and pool paths
function patronKissAttempt(farewell: Instruction): Instruction {
  return seq(
    random(
      'He turns to face you. His hand lifts — hesitates — then brushes a strand of hair from your face. His eyes search yours.',
      'The conversation trails off into silence. He\'s looking at you with an expression that leaves little to the imagination. His hand finds yours.',
    ),
    say('I\'ve been wanting to do this all evening.'),
    'He leans in.',
    option('Let him',
      skillCheck('Flirtation', 30,
        // Success
        scenes(
          scene(
            random(
              'His lips meet yours. The kiss is brief but electric — the taste of gin and something sweeter. When he pulls back, his eyes are bright.',
              'His hand finds the small of your back as he kisses you. It\'s gentle, unhurried, and when it ends neither of you speaks for a moment.',
            ),
            addStat('Flirtation', 1, { max: 40, chance: 0.5 }),
            addStat('Charm', 1, { max: 40, chance: 0.3 }),
            addNpcStat('affection', 2, { max: 30 }),
          ),
          scene(
            'He holds your gaze, something shifting behind his eyes. When he speaks, his voice is low.',
            random(
              say('I have a room upstairs — 533. We could have a drink, just the two of us. No pressure.'),
              say('My room is just upstairs. 533. It seems a shame to end the evening here.'),
            ),
            'His smile is warm, inviting, entirely without menace.',
            option('Go with him',
              'You nod. His smile widens and he offers his arm.',
              run('restorePoolOutfit'),
              hideNpcImage(),
              discoverLocation('room-533'),
              'The lift carries you upward in comfortable silence. He produces a brass key and unlocks the door with a quiet click.',
              move('room-533', 2),
              npcInteract('room533'),
            ),
            option('Decline',
              random(
                'You touch his arm and shake your head gently. His expression softens — disappointed, but understanding.',
                'You smile but step back. "Not tonight." He takes it well.',
              ),
              say('Of course. It was a wonderful evening regardless.'),
              'He kisses your hand and bids you goodnight.',
              addStat('Mood', 5, { max: 85 }),
              farewell,
            ),
          ),
        ),
        // Failure — awkward
        seq(
          random(
            'You let him, but the timing is off somehow. The kiss is clumsy, and when he pulls back you both laugh nervously.',
            'His lips brush yours, but the spark isn\'t there. He senses it too and draws back with a rueful smile.',
          ),
          addStat('Flirtation', 1, { max: 40, chance: 0.3, hidden: true }),
          random(
            say('Well. It\'s been a delightful evening.'),
            say('I should probably call it a night. But I\'ve enjoyed your company tremendously.'),
          ),
          'He smiles warmly, but the moment has passed.',
          farewell,
        ),
      ),
    ),
    option('Turn away',
      random(
        'You turn your head slightly — just enough. He stops, reads the gesture, and straightens up. No offence taken.',
        'You put a gentle hand on his chest. He pauses, then nods with a warm smile. The tension dissolves.',
      ),
      say('It\'s been a wonderful evening.'),
      'He means it.',
      addStat('Mood', 5, { max: 85 }),
      farewell,
    ),
  )
}

// Garden farewell — he leaves the bar for the night
function gardenFarewell(): Instruction {
  return seq(
    hideNpcImage(),
    'He walks you back to the lobby, his hand hovering at the small of your back.',
    random(
      say('Thank you for the company. This city can be lonely, even in the best hotels.'),
      say('You\'re quite unlike anyone I\'ve met here.'),
    ),
    'He tips an imaginary hat and disappears into the night.',
    moveNpc('bar-patron', null),
    move('hotel-bar'),
  )
}

// Ashworth utility scripts
makeScripts({
  // Record interaction time on current NPC (gates afterUpdate cooldown)
  markInteraction: (game: Game, params: { npc?: string }) => {
    const npcId = params.npc ?? game.scene.npc
    if (npcId) game.getNPC(npcId).stats.set('lastInteraction', game.time)
  },
  // Restore outfit — unwinds saved outfits in order, falls back to fixClothing
  restoreAshworthClothing: (game: Game) => {
    // Restore strip outfit first (bikini or clothes), then pool outfit if it exists
    if (game.player.outfits['_before-ashworth']) {
      game.player.wearOutfit('_before-ashworth')
      game.player.deleteOutfit('_before-ashworth')
    }
    if (game.player.outfits['_before-pool']) {
      game.player.wearOutfit('_before-pool')
      game.player.deleteOutfit('_before-pool')
    }
    game.run('fixClothing', {})
    game.player.calcStats()
  },
})

// Leave — friendly goodbye (player chose to leave, Ashworth is satisfied)
function ashworthLeave(): Instruction {
  return seq(
    run('restoreAshworthClothing'),
    cond(
      npcStat('madeLove'),
      random(
        seq(
          say('Same time tomorrow?'),
          'He watches you go with a half-smile.',
        ),
        seq(
          say('You know where to find me.'),
          'He presses a kiss to the back of your hand.',
        ),
      ),
      npcStat('affection', { min: 10 }),
      random(
        seq(
          say('It was a wonderful evening. Thank you.'),
          'He kisses your cheek at the door.',
        ),
        seq(
          say('I enjoyed your company tonight. Truly.'),
          'He opens the door for you with old-fashioned courtesy.',
        ),
      ),
      random(
        seq(
          say('Thank you for a pleasant evening.'),
          'He nods courteously.',
        ),
        seq(
          say('Goodnight. I hope to see you again.'),
          'He stands as you leave.',
        ),
      ),
    ),
    moveNpc('bar-patron', null),
    'You take the lift back down to the lobby.',
    move('hotel'),
  )
}

// Dismiss — player rejected him, he's angry/cold
function ashworthDismiss(): Instruction {
  return seq(
    run('restoreAshworthClothing'),
    moveNpc('bar-patron', null),
    'You step out into the corridor. The door clicks shut behind you.',
    'You take the lift back down to the lobby.',
    move('hotel'),
  )
}

// Pool farewell — he leaves the bar for the night
function poolFarewell(): Instruction {
  return seq(
    hideNpcImage(),
    'He climbs out and wraps himself in a monogrammed robe.',
    random(
      say('Thank you for the company. This city can be lonely, even in the best hotels.'),
      say('You\'re quite unlike anyone I\'ve met here.'),
    ),
    'He gives you a warm smile and disappears towards the lobby.',
    moveNpc('bar-patron', null),
    'You towel off and change back into your clothes.',
    wearOutfit('_before-pool', { delete: true }),
  )
}

// Garden — Ashworth makes his move (triggered by flirting or random chance)
function gardenKissInitiation(): Instruction {
  return seq(
    random(
      seq(
        'A cool breeze sweeps across the rooftop. You shiver, and he notices immediately.',
        say('Cold?'),
        'Before you can answer, his jacket is around your shoulders. His hands linger on your arms, and he doesn\'t step back.',
      ),
      seq(
        'He falls quiet, watching you in the starlight. Something in his expression shifts — the polished charm giving way to something more honest.',
        say('Do you know how beautiful you look right now?'),
        'His voice is low, almost wondering. He reaches out and tucks a strand of hair behind your ear.',
      ),
      seq(
        'The wind catches a loose petal and sends it spiralling between you. He catches it without looking away from you.',
        say('Make a wish.'),
        'He presses the petal into your palm and closes your fingers around it. He doesn\'t let go of your hand.',
      ),
    ),
    patronKissAttempt(gardenFarewell()),
  )
}

// Pool — Ashworth makes his move (triggered by flirting or random chance)
function poolKissInitiation(): Instruction {
  return seq(
    random(
      seq(
        'He drifts closer in the warm water until you can feel the heat of him. His hand finds your waist beneath the surface.',
        say('Come here.'),
        'The water laps softly between you. The underwater lights cast shifting patterns on his face.',
      ),
      seq(
        'He surfaces beside you, water streaming from his hair. He\'s closer than you expected — close enough that you can see the lamplight reflected in his eyes.',
        say('I\'ve been thinking about doing this all evening.'),
      ),
      seq(
        'He reaches out and wipes a droplet from your cheek. His thumb traces your jawline, tilting your face up.',
        say('You are impossible to resist. You know that?'),
        'His voice is barely above a murmur. The pool is very quiet.',
      ),
    ),
    patronKissAttempt(poolFarewell()),
  )
}

registerNPC('bar-patron', {
  name: 'Lord Ashworth',
  uname: 'well-dressed gentleman',
  description:
    'A broad-shouldered man in an impeccably tailored waistcoat with polished brass cufflinks. ' +
    'Silver streaks his dark hair at the temples, lending him a distinguished air. He carries ' +
    'himself with the easy confidence of old money and smells faintly of expensive cologne.',
  image: '/images/hotel/patrons_1.webp',
  speechColor: '#b8860b', // Dark goldenrod — wealthy, warm
  pronouns: PRONOUNS.he,

  generate: (_game: Game, npc: NPC) => {
    // Starts offscreen — onMove schedule places him at the bar 8–10pm
    npc.location = null
    npc.stats.set('affection', 0)
    npc.stats.set('control', 0)
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('bar-patron')
    const loc = npc.location ? game.getLocation(npc.location) : undefined

    // Stay in room 533 with the player outside schedule hours
    if (loc?.template.isBedroom && npc.location === game.currentLocation && game.hourOfDay < 9) {
      return
    }

    npc.followSchedule(game, [
      [20, 22, 'hotel-bar'],
      [22, 9, 'room-533'],
    ])
  },

  onFirstApproach: seq(
    showNpcImage(),
    random(
      'A well-dressed man in a tailored waistcoat catches your eye from across the bar. He raises his glass with a slight nod and makes his way over.',
      'A gentleman with silver-streaked hair and an impeccable suit turns on his stool as you pass. His eyes linger a moment.',
    ),
    say('Forgive the intrusion. I don\'t believe I\'ve seen you here before. Might I buy you a drink?'),
    learnNpcName(),
    option('Accept', npcInteract('chat')),
    npcLeaveOption('You politely decline.', 'Another time, perhaps.', 'Decline'),
  ),

  onApproach: seq(
    showNpcImage(),
    cond(
      // In room 533 — re-engage after bathroom etc.
      inLocation('room-533'),
      npcInteract('room533Approach'),
      // Bar approach
      seq(
        cond(
          npcStat('affection', { min: 15 }),
          random(
            say('There she is. I was beginning to worry you\'d found better company.'),
            say('My favourite part of the evening just arrived. What are you drinking?'),
          ),
          npcStat('affection', { min: 5 }),
          random(
            say('Ah, there you are. I was hoping you\'d come by this evening.'),
            say('Good evening. The bar isn\'t the same without pleasant company.'),
          ),
          random(
            say('I thought I might see you tonight. Care for a drink?'),
            say('Good evening. Might I buy you a drink?'),
          ),
        ),
        patronMenu(),
      ),
    ),
  ),

  afterUpdate: cond(
    not(inScene()),
    cond(
      inLocation('room-533'),
      // Wait at least 30 mins since player last disengaged before interrupting
      cond(
        not(lt(sub(gameTime(), npcStat('lastInteraction')), 1800)),
        cond(
          // He wants intimacy — demand scene
          wantsIntimacy('bar-patron'),
          npcInteract('ashworthDemand'),
          // Past 11pm, no intimacy desire — curfew (sleep or leave)
          hourBetween(23, 6),
          npcInteract('ashworthCurfew'),
        ),
      ),
    ),
  ),

  scripts: {
    // ----- CHAT: casual bar conversation, small affection gain -----
    chat: seq(
      showNpcImage(),
      random(
        seq(
          say('I\'ve been coming to the Imperial for fifteen years. Watched the whole city change from this very stool.'),
          'He swirls his whisky contemplatively.',
        ),
        seq(
          say('Do you know, they import the gin from the continent by airship? Keeps the botanicals fresh. Worth every penny.'),
          'He signals the barman for another round.',
        ),
        seq(
          say('The theatre season opens next week. I have a box, of course. One must keep up appearances.'),
          'He adjusts his cufflinks with practised ease.',
        ),
        seq(
          say('I made my fortune in aether refinement, if you must know. Terribly dull business, but it pays for the whisky.'),
          'He smiles with the quiet satisfaction of a man who has never worried about money.',
        ),
      ),
      addNpcStat('affection', 1, { max: 20, hidden: true }),
      time(10),
    ),

    // ----- FLIRT: player can always try; appearance gates HIS reaction -----
    // Impression check is on the NPC's behaviour, not the player's options.
    // Low appearance: he brushes her off (feedback: "look better").
    // High appearance + skill fail: awkward but he's still interested (feedback: "practise flirting").
    // High appearance + skill pass: charmed, offers outing.
    flirt: seq(
      showNpcImage(),
      cond(
        // He's receptive — she looks good enough to catch his eye
        impression('appearance', { min: 50 }),
        skillCheck('Flirtation', 20,
          // Success — he's charmed
          seq(
            run('consumeAlcohol', { amount: 25 }),
            random(
              seq(
                'You hold his gaze and let a slow smile play across your lips. He leans in, clearly intrigued.',
                'The barman sets down two cocktails — something with gin and elderflower that catches the light.',
                say('To new acquaintances.'),
                'His eyes linger on you a moment longer than strictly necessary.',
              ),
              seq(
                'You catch his eye across the bar and he\'s beside you in an instant, signalling for champagne.',
                'The conversation turns playful. He\'s witty and attentive, and keeps finding excuses to touch your hand.',
                say('You are delightful company. Truly.'),
              ),
            ),
            addStat('Flirtation', 1, { max: 40, chance: 0.4 }),
            addNpcStat('affection', 2, { max: 20, hidden: true }),
            time(20),
            // Suggest an outing
            random(
              seq(
                say('You know, the rooftop garden is rather spectacular at this hour. Care to see it?'),
                option('Go with him', npcInteract('garden')),
              ),
              seq(
                say('The hotel has a rather lovely pool, you know. Heated by the boilers. Fancy a swim?'),
                option('Go with him', npcInteract('pool')),
              ),
            ),
            option('Stay at the bar',
              say('Well, there\'s no rush. Another round?'),
            ),
          ),
          // Skill check failure — she tried but it fell flat
          seq(
            random(
              'You try to catch his eye with a coy smile, but the delivery falls flat. He gives a polite laugh and changes the subject.',
              'You attempt a witty remark, but it lands awkwardly. He smiles graciously and steers the conversation elsewhere.',
            ),
            addStat('Flirtation', 1, { max: 40, chance: 0.3, hidden: true }),
            time(15),
          ),
        ),
        // Not interested — appearance too low; NPC disengages (not player's fault)
        seq(
          random(
            seq(
              'You lean in with a smile, but his gaze drifts. He\'s polite, but his attention is elsewhere.',
              say('Charming. If you\'ll excuse me — I see someone I must speak to.'),
              'He signals the barman and moves to the other end of the bar.',
            ),
            seq(
              'You try to steer the conversation somewhere more intimate, but he doesn\'t take the bait.',
              say('You\'re good company, but I should call it an evening. Early start tomorrow.'),
              'He finishes his drink and straightens his cufflinks.',
            ),
          ),
          addStat('Flirtation', 1, { max: 30, chance: 0.2, hidden: true }),
          time(10),
          npcLeaveOption('He returns to his drink.', 'Good evening.'),
        ),
      ),
    ),

    // ----- GARDEN: rooftop garden outing -----
    garden: seq(
      hideNpcImage(),
      'You follow him through the lobby and into the brass lift. He presses the top button with a confident smile.',
      move('hotel-garden', 5),
      showNpcImage(),
      'The lift opens onto the rooftop garden. The city stretches below, gaslights tracing the streets like scattered jewels. The air is cool and fragrant with night-blooming flowers.',
      say('Worth the trip, wouldn\'t you say?'),
      'He stands close, one hand resting lightly on the railing beside yours.',
      time(10),
      run('consumeAlcohol', { amount: 15 }),
      menu(
        option('Talk',
          random(
            seq(
              'He tells you about his travels — the canals of Veneto, the clocktowers of Praag.',
              'His hand brushes yours on the railing, not quite by accident.',
              say('I spent a summer in Veneto once. The light there is extraordinary — like liquid gold.'),
              'He catches your eye. "Rather like your eyes, actually."',
            ),
            seq(
              'He points out constellations, standing close enough that you feel the warmth of him against the evening chill.',
              say('My father taught me the stars. Useful for navigation, he said. Though I\'ve always preferred them for the romance.'),
              'He catches your eye and smiles.',
            ),
            seq(
              'He asks about your studies and listens with genuine curiosity.',
              'The night air is cool, and you stand close for warmth.',
              say('You\'re more interesting than half the people I know. And I know a great many people.'),
            ),
            seq(
              'He talks about Aetheria as it was twenty years ago — wilder, dirtier, more dangerous.',
              say('The city\'s changed. Grown respectable. I\'m not sure it\'s an improvement.'),
              'He gazes out at the skyline with an expression you can\'t quite read.',
            ),
          ),
          time(10),
          addStat('Charm', 1, { max: 40, chance: 0.3 }),
          addNpcStat('affection', 1, { max: 25, hidden: true }),
          // He might make his move
          cond(npcStat('affection', { min: 8 }),
            cond(chance(0.2), exit(gardenKissInitiation())),
          ),
        ),
        option('Have a drink',
          random(
            seq(
              'He produces a silver hip flask and pours you something that smells of honey and smoke.',
              say('Single malt. Thirty years old. I\'ve been saving it for the right company.'),
            ),
            seq(
              'He flags down a passing attendant and orders two glasses of champagne.',
              'The bubbles catch the starlight as you clink glasses.',
              say('To beautiful evenings.'),
            ),
            seq(
              'He opens a bottle he\'d had sent up in advance — something dark and French.',
              say('A good wine and a good view. What more does a man need?'),
              'His eyes linger on you as he says it.',
            ),
          ),
          run('consumeAlcohol', { amount: 15 }),
          time(5),
          cond(npcStat('affection', { min: 10 }),
            cond(chance(0.15), exit(gardenKissInitiation())),
          ),
        ),
        option('Enjoy the view',
          random(
            seq(
              'You lean against the railing together, watching the gaslights flicker across the rooftops.',
              'An airship drifts silently across the moon, its running lights winking red and green.',
              'He stands close enough that your shoulders almost touch.',
            ),
            seq(
              'A cool breeze carries the scent of night-blooming jasmine.',
              'The stars are unusually bright above the gas-lit haze.',
              say('On a clear night you can see the lighthouse at Thornmouth from here. Sixty miles.'),
            ),
            seq(
              'The city hums below — distant steam whistles, the clatter of a late tram, the faint strains of music from somewhere.',
              'He rests his arms on the railing, his sleeve brushing yours.',
              say('I never tire of this view. Though the company makes a difference.'),
            ),
          ),
          time(10),
          addStat('Mood', 2, { max: 85 }),
          cond(npcStat('affection', { min: 10 }),
            cond(chance(0.15), exit(gardenKissInitiation())),
          ),
        ),
        option('Flirt',
          // No appearance gate — he already invited her here from the bar
          random(
            seq(
              'You lean against the railing and look up at him through your lashes. "It\'s cold up here."',
              'He raises an eyebrow, then slips his jacket from his shoulders and drapes it around you. His hands linger.',
              say('Better?'),
              'You pull the jacket tighter and let your fingers brush his. "Much."',
            ),
            seq(
              'You pluck a night-blooming flower from a nearby planter and tuck it behind your ear.',
              '"How do I look?"',
              'His gaze travels over you slowly.',
              say('Dangerous. Absolutely dangerous.'),
            ),
            seq(
              'You move closer and rest your head briefly against his shoulder, as if admiring the view.',
              'He goes very still. When you glance up, he\'s watching you with an intensity that makes your pulse quicken.',
              say('You are making it very difficult to be a gentleman.'),
            ),
          ),
          addStat('Flirtation', 1, { max: 40, chance: 0.4 }),
          addNpcStat('affection', 2, { max: 25, hidden: true }),
          time(5),
          // Very likely he makes his move
          cond(chance(0.75),
            exit(gardenKissInitiation()),
            // Charged atmosphere but he holds back
            random(
              'He holds your gaze a beat too long, then looks away with a slow smile.',
              'Something electric passes between you. He clears his throat and reaches for his drink.',
            ),
          ),
        ),
        option('Call it a night',
          random(
            'You tell him you should be heading back. He nods, not pushy about it.',
            'The evening air is getting chilly. You suggest heading inside.',
          ),
          say('Of course. It\'s been a wonderful evening.'),
          addStat('Mood', 3, { max: 85 }),
          addNpcStat('affection', 2, { max: 20 }),
          exit(gardenFarewell()),
        ),
      ),
    ),

    // ----- ROOM 533: arrival scene, then menu -----
    room533: seq(
      showNpcImage(),
      discoverLocation('room-533'),
      moveNpc('bar-patron', 'room-533'),
      random(
        'The room is warm and softly lit, the city glittering beyond the window. He pours two drinks from a crystal decanter and hands you one.',
        'He closes the door behind you and crosses to the drinks cabinet. "Make yourself comfortable." The room smells of sandalwood and expensive leather.',
      ),
      cond(
        npcStat('madeLove'),
        seq(
          'He settles beside you, close enough that your shoulders touch. His hand finds your knee.',
          say('I\'m glad you came back.'),
        ),
        seq('He settles beside you, close enough that your shoulders almost touch. The evening stretches ahead, unhurried and full of possibility.'),
      ),
      npcInteract('room533Menu'),
    ),

    // Arriving at room 533 via reception
    room533Welcome: seq(
      showNpcImage(),
      setNpc('bar-patron'),
      random(
        seq(
          'He opens the door in his shirtsleeves, a glass of whisky in hand.',
          say('Well. This is a pleasant surprise. Come in.'),
        ),
        seq(
          'The door opens before you can knock. He leans against the frame, studying you.',
          say('I hoped you\'d find your way here. Please — come in.'),
        ),
      ),
      option('Continue', npcInteract('room533Menu')),
    ),

    // Re-engage after leaving the menu (bathroom, etc.)
    room533Approach: seq(
      cond(
        npcStat('madeLove'),
        random(
          say('Back already?'),
          say('Come sit down.'),
        ),
        random(
          say('Make yourself at home.'),
          say('Ah, there you are.'),
        ),
      ),
      npcInteract('room533Menu'),
    ),

    // ----- ROOM 533 MENU -----
    // Collar gift check runs first; if triggered, its accept/decline handlers
    // call back into room533Menu (which skips the gift the second time because
    // hasItem is now true). Late-night behaviour is driven by afterUpdate only.
    room533Menu: cond(
      npcStat('control', { min: 30 }),
      cond(
        not(hasItem('ashworth-collar')),
        npcInteract('maybeGiveCollar'),
        npcInteract('room533MenuInner'),
      ),
      npcInteract('room533MenuInner'),
    ),

    room533MenuInner: menu(
      option('Have a drink',
        random(
          'He refills your glass from the crystal decanter. The whisky is smooth and warm, settling into your chest like liquid amber.',
          'He produces a bottle of champagne from an ice bucket you hadn\'t noticed. The cork pops with a satisfying sound, and golden bubbles rise in your glass.',
          'He mixes you something from the well-stocked drinks cabinet — gin, something floral, a twist of lemon. It\'s dangerously easy to drink.',
        ),
        run('consumeAlcohol', { amount: 20 }),
        time(10),
        random(
          'The alcohol warms you pleasantly. The conversation comes easier, the laughter more freely.',
          'You clink glasses. The room feels cosier now, the city lights softening through the window.',
        ),
      ),
      option('Chat',
        random(
          'He tells you about the places he\'s been — the floating markets of Hai Phong, the underground libraries of Zurich. He\'s an engaging storyteller, and you find yourself leaning closer to listen.',
          'You talk about Aetheria — the university, the strange energy of the city. He listens with genuine interest, asking questions that show he\'s paying attention.',
          'The conversation drifts to dreams and ambitions. He speaks carefully, choosing his words, and you realise he\'s more thoughtful than his polished exterior suggests.',
          'He asks about your life before Aetheria. You find yourself sharing more than you expected, drawn out by his quiet attentiveness. In turn, he tells you about growing up in the country — a different world from this gilded hotel room.',
        ),
        time(15),
        addStat('Charm', 1, { max: 40, chance: 0.3 }),
        addStat('Mood', 2, { max: 85 }),
      ),
      option('Kiss him',
        random(
          'You lean into him. He catches you halfway, one hand at the back of your neck.',
          'You close the distance between you. His response is immediate — his arm around your waist, pulling you in.',
        ),
        kiss(5),
        addStat('Arousal', 5, { max: 100 }),
        time(5),
        exit(npcInteract('makeOut')),
      ),
      option('Excuse yourself',
        say('Of course. The room is yours.'),
        run('markInteraction', { npc: 'bar-patron' }),
        exit(),
      ),
      option('Call it a night',
        addStat('Mood', 5, { max: 85 }),
        exit(ashworthLeave()),
      ),
    ),

    // ----- COLLAR GIFT: Ashworth marks his territory (control ≥ 30, one-time) -----
    maybeGiveCollar: (game: Game) => {
      game.add('He reaches into the bedside drawer and produces a small velvet box. He opens it with deliberate care.')
      game.getNPC('bar-patron').say('I had this made for you.')
      game.add('Inside, nestled on dark silk, is a white leather collar with a small brass plate. You can make out the engraved initial — "A."')
      game.addOption(['interact', { npc: 'bar-patron', script: 'ashworthAcceptCollar' }], 'Accept')
      game.addOption(['interact', { npc: 'bar-patron', script: 'ashworthDeclineCollar' }], 'Decline')
    },

    ashworthAcceptCollar: (game: Game) => {
      const collar = new Item('ashworth-collar')
      collar.gift = 'bar-patron'
      game.player.inventory.push(collar)
      game.player.wearItem(collar)
      game.player.calcStats()
      game.getNPC('bar-patron').say('Turn around.')
      game.add('He fastens the collar around your throat. His fingers are sure and unhurried. The leather is soft, the brass cool against your skin.')
      game.add('He turns you to face him and studies the result with quiet satisfaction.')
      game.getNPC('bar-patron').say('Perfect. Now everyone will know you\'re mine.')
      game.run('addNpcStat', { stat: 'control', change: 3, max: 50, hidden: true })
      game.run('addNpcStat', { stat: 'affection', change: 2, max: 30, hidden: true })
      // Continue to the normal room menu
      game.run('interact', { npc: 'bar-patron', script: 'room533Menu' })
    },

    ashworthDeclineCollar: (game: Game) => {
      game.add('You close the box gently and push it back towards him.')
      game.getNPC('bar-patron').say('No?')
      game.add('His expression doesn\'t change, but something behind his eyes hardens.')
      game.getNPC('bar-patron').say('Keep it. You may change your mind.')
      // Give the item but don't wear it
      const collar = new Item('ashworth-collar')
      collar.gift = 'bar-patron'
      game.player.inventory.push(collar)
      game.run('addNpcStat', { stat: 'affection', change: -2 })
      game.run('addNpcStat', { stat: 'control', change: -3 })
      // Continue to the normal room menu
      game.run('interact', { npc: 'bar-patron', script: 'room533Menu' })
    },

    // ----- ASHWORTH DEMAND: he wants intimacy (triggered by afterUpdate via wantsIntimacy) -----
    ashworthDemand: seq(
      showNpcImage(),
      setNpc('bar-patron'),
      cond(
        npcStat('madeLove'),
        random(
          seq(
            'He sets down his glass and turns to you. His hand finds your knee.',
            say('It\'s getting late. Stay with me tonight.'),
          ),
          seq(
            'He loosens his collar and catches your eye. The look is unambiguous.',
            say('I think we\'ve had enough small talk, don\'t you?'),
          ),
        ),
        random(
          seq(
            'He glances at the clock on the mantelpiece, then back at you. His expression has changed — something more direct behind the charm.',
            say('It\'s late. I\'d very much like you to stay.'),
          ),
          seq(
            'The clock chimes on the mantelpiece. He sets down his drink and turns to face you fully.',
            say('The hour is getting on. I don\'t want the evening to end just yet.'),
          ),
        ),
      ),
      option('Stay', npcInteract('makeOut')),
      option('Decline',
        random(
          'You smile but shake your head. Something shifts in his expression — not anger, but a door closing.',
          'You touch his hand and tell him you should go. The warmth fades from his eyes like a gas lamp turning down.',
        ),
        say('I see. Well. It was a pleasant evening.'),
        'He stands and straightens his waistcoat. The gesture is precise and final.',
        addNpcStat('affection', -2),
        addNpcStat('control', -3),
        exit(ashworthDismiss()),
      ),
    ),

    // ----- ASHWORTH CURFEW: past 11pm, no intimacy desire — sleep or leave -----
    ashworthCurfew: seq(
      showNpcImage(),
      setNpc('bar-patron'),
      random(
        seq(
          'He stifles a yawn and glances at the clock.',
          say('It\'s getting late. Shall we turn in?'),
        ),
        seq(
          'The clock on the mantelpiece chimes softly. He sets down his whisky.',
          say('Well. It\'s late.'),
        ),
      ),
      option('Sleep with him', npcInteract('bedTime')),
      option('Leave', exit(ashworthLeave())),
    ),

    // ----- BATHROOM INTRUSION: Ashworth fetches player back to room (late night, no intimacy) -----
    // Move happens only when the player agrees — background stays as bathroom until then.
    // Room afterUpdate handles what happens next (ashworthDemand or ashworthCurfew).
    bathroomIntrusion: seq(
      showNpcImage(),
      setNpc('bar-patron'),
      random(
        seq(
          'The bathroom door swings open without warning. He leans against the frame, tie loosened, glass in hand.',
          say('You\'ve been in here long enough. Come to bed.'),
        ),
        seq(
          'A sharp knock, then the door opens before you can answer. He fills the doorway, shirtsleeves rolled to the elbow.',
          say('Come on. It\'s late.'),
        ),
      ),
      option('Go with him',
        move('room-533', 1),
        npcInteract('bedTime'),
      ),
      option('Refuse',
        say('Fine. Don\'t be long.'),
        'He pulls the door shut. You hear his footsteps retreat.',
        addNpcStat('affection', -1),
        addNpcStat('control', -2),
      ),
    ),

    // ----- BATHROOM INTIMACY: Ashworth barges in and demands an intimate encounter -----
    bathroomIntimacy: scenes(
      scene(
        showNpcImage(),
        setNpc('bar-patron'),
        random(
          seq(
            'The door opens without ceremony. He stands in the doorway, eyes dark and intent.',
            say('I didn\'t invite you here to wash.'),
            'He steps inside and pulls the door shut behind him. The lock clicks.',
          ),
          seq(
            'You hear the handle turn. He slips inside, steam curling around him, and leans back against the door.',
            say('I\'ve been thinking about you.'),
            'His voice is low, unhurried. He doesn\'t ask permission.',
          ),
        ),
        option('Give in',
          'His hands find your hips. Fingers hook fabric and pull downward with practised efficiency.',
          stripAll({ position: 'hips' }),
          'He presses you against the cool tiles. His hands are certain, proprietary.',
          'The mirror fogs. The water runs cold and neither of you notices.',
        ),
        option('Resist',
          'You pull back, but he catches your wrist — not roughly, but firmly enough to make the point.',
          say('Don\'t be difficult.'),
          'His mouth finds your neck. Your protest dies somewhere in your throat.',
        ),
      ),
      scene(
        random(
          'It is quick and urgent and nothing like the bedroom. The porcelain is slippery and cold against your back. He is not gentle — but he is thorough.',
          'He takes what he wants with a focused intensity that leaves you breathless against the basin. The tap drips. His breathing is ragged in your ear.',
        ),
        paragraph(hl('• • •', '#6b7280')),
        madeLove(),
        addNpcStat('control', 4, { max: 30, hidden: true }),
        time(15),
      ),
      scene(
        showNpcImage(),
        random(
          seq(
            'He straightens his shirt, runs a hand through his hair. He looks entirely unruffled.',
            say('Take your time. I\'ll be in the other room.'),
            'The door clicks shut behind him.',
          ),
          seq(
            'He kisses the top of your head — a surprisingly tender gesture after what just happened.',
            say('You look beautiful like this. Don\'t take too long.'),
            'He leaves without looking back.',
          ),
        ),
      ),
    ),

    // ----- BED INTERCEPT: Ashworth present → behaviour depends on wantsIntimacy -----
    ashworthBed: cond(
      npcPresent('bar-patron'),
      cond(
        wantsIntimacy('bar-patron'),
        // He wants intimacy — intercepts bedtime
        seq(
          showNpcImage(),
          setNpc('bar-patron'),
          random(
            seq(
              say('The bed\'s a good idea.'),
              'His eyes travel over you.',
              say('But first...'),
            ),
            seq(
              say('Thinking of turning in?'),
              'He loosens his collar.',
              say('I have a better idea.'),
            ),
          ),
          option('Go along with it', npcInteract('makeOut')),
          option('Just sleep',
            random(
              seq(
                say('Just sleep?'),
                'He steps closer, his hand finding your waist.',
                say('I don\'t think so. Not tonight.'),
              ),
              seq(
                say('You came to my room to sleep?'),
                'His voice is low, amused, but there\'s an edge to it.',
                say('I had something else in mind.'),
              ),
            ),
            option('Go along with it', npcInteract('makeOut')),
            option('Excuse yourself',
              say('If that\'s how you feel.'),
              'He turns away, reaching for the whisky decanter.',
              addNpcStat('affection', -1),
              addNpcStat('control', -2),
              run('markInteraction', { npc: 'bar-patron' }),
            ),
            option('Refuse',
              say('I said — I don\'t think so.'),
              'His expression hardens. He straightens his cuffs with deliberate calm.',
              say('You should leave. Now.'),
              addNpcStat('affection', -3),
              addNpcStat('control', -5),
              exit(ashworthDismiss()),
            ),
          ),
        ),
        // Doesn't want intimacy — bedTime handles sleep or player-initiated intimacy
        npcInteract('bedTime'),
      ),
      run('bedScene', { quality: 1.2 }),
    ),

    // ----- MAKE OUT: he drives the pace, commands stripping, escalates to bed -----
    makeOut: seq(
      cond(
        npcStat('madeLove'),
        // Experienced — confident, possessive
        random(
          seq(
            'His hands find your waist with practised ease. He pulls you against him.',
            say('I\'ve missed this.'),
          ),
          seq(
            'He kisses the hollow of your throat, then lower. His hands are sure and unhurried.',
            say('You always smell so good.'),
          ),
          seq(
            'He draws you onto his lap with quiet authority. His mouth is at your ear.',
            say('I know what you like. Let me show you.'),
          ),
        ),
        // First time — direct but not rough
        random(
          seq(
            'His hand slides to the small of your back and pulls you closer. His breath is warm against your neck.',
            say('You\'re exquisite. Do you know that?'),
          ),
          seq(
            'He traces the line of your jaw with one finger, tilting your face up to his.',
            say('I\'ve been wanting to do this all evening.'),
          ),
          seq(
            'He loosens his collar and sits beside you on the bed, close enough that your legs touch.',
            say('Come here.'),
            'It is not a question.',
          ),
        ),
      ),
      kiss(8),
      time(5),
      addNpcStat('control', 2, { max: 30, hidden: true }),
      addStat('Flirtation', 1, { max: 40, chance: 0.3 }),
      // He commands her to strip — only if she's actually wearing clothes
      cond(
        dressed(),
        replaceScene(
          random(
            seq(
              'He pulls back and looks at you, eyes travelling slowly down your body. His voice drops.',
              say('Take your clothes off. I want to see you.'),
            ),
            seq(
              'He sits on the edge of the bed, loosening his cufflinks with deliberate calm. His gaze is direct.',
              say('Strip for me.'),
              'It is not a request.',
            ),
            seq(
              'His fingers find the fastening at the back of your dress. He pauses.',
              say('Let me see all of you. Or do it yourself — I don\'t mind watching.'),
            ),
          ),
          option('Undress for him',
            saveOutfit('_before-ashworth'),
            random(
              'You hold his gaze as you undress, piece by piece. His eyes never leave you. When you\'re done he lets out a slow breath.',
              'You slip out of your clothes under his approving stare. The lamplight is warm on your bare skin. He watches every movement with quiet intensity.',
              'You undress slowly, letting each garment fall. He leans back against the pillows, watching with the satisfied expression of a man who is used to getting what he wants.',
            ),
            cond(hasItem('ashworth-collar'), changeOutfit(['ashworth-collar']), changeOutfit([])),
            say('Beautiful. Come here.'),
            npcInteract('makeLove'),
          ),
          // Refuses to strip — he's done. Polite but final.
          option('Refuse',
          'You hesitate, suddenly self-conscious. He reads it instantly.',
          say('I see.'),
          'He straightens his waistcoat and pours himself a drink. The warmth in his eyes has cooled to something polite and distant.',
          say('I think we\'ve had a lovely evening. But I won\'t pretend I\'m not disappointed.'),
          random(
            'He walks you to the door. His hand on the small of your back is courteous, nothing more.',
            'He opens the door and holds it for you. The gesture is impeccable and utterly final.',
          ),
          say('Goodnight.'),
          addNpcStat('affection', -3),
          addNpcStat('control', -5),
          option('Leave', exit(ashworthDismiss())),
        ),
      ),
      // Already undressed — skip straight to bed
      seq(
        saveOutfit('_before-ashworth'),
        npcInteract('makeLove'),
      ),
    ),
    ),

    // ----- MAKE LOVE: fade to black, stat tracking -----
    makeLove: scenes(
      scene(
        cond(
          npcStat('madeLove'),
          // Experienced — confident, possessive
          random(
            seq(
              'He pulls you to him with quiet authority, one hand in your hair, the other at the small of your back.',
              say('I\'ve been thinking about this since the last time.'),
            ),
            seq(
              'His hands are sure and unhurried. He knows what he wants.',
              say('Come here.'),
            ),
          ),
          // First time — direct but not rough
          random(
            seq(
              'He draws you towards the bed, one hand at your waist. His eyes hold yours — intent, certain, but waiting for you to close the distance.',
              say('I want you. If you\'ll have me.'),
            ),
            seq(
              'He cups your face in his hands. His thumb traces your lower lip.',
              say('Stay with me tonight.'),
            ),
          ),
        ),
        paragraph(hl('• • •', '#6b7280')),
        option('Accept'),
        option('Change your mind',
          'You pull back. Something in your expression makes him stop instantly.',
          say('I see.'),
          'He releases you without protest. His composure returns in an instant — but the warmth has gone out of his eyes.',
          say('Get dressed, please.'),
          option('Get dressed',
            'He turns away and pours himself a drink while you gather your clothes. The silence is precise and final.',
            wearOutfit('_before-ashworth', { delete: true }),
            say('It was a pleasant evening. Goodnight.'),
            addNpcStat('affection', -2),
            addNpcStat('control', -3),
            exit(ashworthDismiss()),
          ),
        ),
      ),
      scene(
        cond(
          npcStat('madeLove'),
          random(
            'He is unhurried and confident, attentive without tenderness. He takes his pleasure and gives it in equal measure — practised, generous, and entirely without sentiment.',
            'There is no awkwardness, no hesitation. He knows what he likes and he knows how to please. Afterwards you are breathless and flushed, and he looks quietly satisfied.',
          ),
          random(
            'What follows is direct and surprisingly tender. He is attentive and generous, and asks what you like with the easy confidence of a man who is used to asking. When it is over, you lie in the warm glow of the city lights, your skin still tingling.',
            'He is gentle where it matters and assertive everywhere else. He murmurs your name against your skin. It is over too quickly — and not quickly enough.',
          ),
        ),
        paragraph(hl('• • •', '#6b7280')),
        run('madeLove'),
        addNpcStat('control', 5, { max: 30, hidden: true }),
        time(30),
      ),
      // Afterglow — clean three options
      scene(
        showNpcImage(),
        random(
          seq(
            'He lies back against the pillows, one arm behind his head. He looks content — the look of a man who got exactly what he wanted.',
            say('You are full of surprises. I like that in a woman.'),
          ),
          seq(
            'He traces idle patterns on your shoulder. His breathing has slowed.',
            say('That was rather wonderful.'),
          ),
          seq(
            'He stretches lazily beside you, looking thoroughly satisfied.',
            say('You are magnificent. You know that?'),
          ),
        ),
        option('Excuse yourself',
          say('Of course. The room is yours.'),
          run('markInteraction', { npc: 'bar-patron' }),
          exit(),
        ),
        option('Leave',
          exit(ashworthLeave()),
        ),
        when(hourBetween(22, 6),
          option('Sleep with him', npcInteract('bedTime')),
        ),
      ),
    ),

    // ----- SLEEP OVER: nested sleep + morning scene -----
    // Sleep runs as part of a DSL sequence. After sleep completes,
    // the morning scene continues naturally. If sleep was interrupted
    // by an event, the morning scene is skipped via when(not(inScene())).
    // ----- BED TIME: getting into bed together — gates on wantsIntimacy -----
    bedTime: seq(
      showNpcImage(),
      setNpc('bar-patron'),
      random(
        seq(
          'You climb into bed beside him. The sheets are cool and crisp, the pillows soft.',
          'He dims the lamp and settles in beside you.',
        ),
        seq(
          'He pulls back the covers for you. You slip in beside him.',
          'The bed is warm and comfortable, the city quiet beyond the window.',
        ),
        seq(
          'You slide between the sheets. He turns down the gaslight until the room is lit only by the glow of the city beyond the curtains.',
        ),
      ),
      cond(
        // He wants intimacy — demands it
        wantsIntimacy('bar-patron'),
        seq(
          random(
            seq(
              'His hand finds your waist under the sheets. He pulls you closer.',
              say('I wasn\'t planning on sleeping just yet.'),
            ),
            seq(
              'He rolls to face you, eyes dark in the lamplight.',
              say('You didn\'t think I was going to let you just sleep, did you?'),
            ),
          ),
          option('Give in', npcInteract('makeOut')),
          option('Refuse',
            say('I see.'),
            'He rolls away. The warmth between you evaporates.',
            addNpcStat('affection', -2),
            addNpcStat('control', -3),
            exit(ashworthDismiss()),
          ),
        ),
        // No intimacy desire — peaceful bedtime, but player can initiate
        seq(
          random(
            seq(
              'He puts his arm around you and pulls you close. His breathing is slow and steady.',
              say('Goodnight.'),
            ),
            seq(
              'He settles beside you, one arm draped loosely over your waist.',
              say('Sleep well.'),
            ),
            seq(
              'He lies on his back, one hand finding yours under the covers.',
              'The room is warm and still.',
            ),
          ),
          option('Sleep', npcInteract('sleepOver')),
          option('Kiss him',
            'You turn to face him and press your lips to his. He responds immediately, pulling you closer.',
            say('Well. If you insist.'),
            kiss(5),
            addStat('Arousal', 5, { max: 100 }),
            npcInteract('makeOut'),
          ),
        ),
      ),
    ),

    // ----- SLEEP OVER: nested sleep + morning scene -----
    sleepOver: seq(
      run('sleepTogether', { quality: 1.2 }),
      // Morning scene — only runs if sleep completed without interruption
      when(not(inScene()),
        npcInteract('morning'),
      ),
    ),

    // ----- MORNING: wakeup, optional intimacy, breakfast offer, then free time -----
    morning: scenes(
      scene(
        'Pale morning light filters through the heavy curtains. The room smells of sandalwood and last night\'s whisky.',
        cond(
          npcStat('madeLove', { min: 3 }),
          // Comfortable familiarity
          random(
            seq(
              'He\'s propped against the pillows beside you, already awake. He watches you stir with quiet amusement.',
              say('There she is.'),
            ),
            seq(
              'You feel his arm tighten around your waist. He\'s awake, his chin resting on your shoulder.',
              say('Good morning, darling.'),
            ),
          ),
          // First time or early visits — slightly more formal
          random(
            seq(
              'He\'s lying on his side, watching you. He looks different in the morning light — softer, less composed.',
              say('Good morning. I hope you slept well.'),
            ),
            seq(
              'You stir to find him propped on one elbow, studying you with a faint smile.',
              say('Ah. You\'re awake.'),
            ),
          ),
        ),
        // Morning intimacy — he initiates if cooldown has passed
        when(wantsIntimacy(),
          npcInteract('morningIntimacy'),
        ),
      ),
      // Breakfast offer
      scene(
        showNpcImage(),
        cond(
          npcStat('madeLove', { min: 3 }),
          random(
            'He rings the bell for room service, then pulls on a silk robe.',
            'He\'s at the dressing table fastening his cufflinks when there\'s a knock at the door. Breakfast.',
          ),
          random(
            'He sits at the edge of the bed, already half-dressed, and rings for room service.',
            'He pulls on a monogrammed robe and busies himself with the tea things.',
          ),
        ),
        'A silver tray arrives — fresh pastries, fruit, smoked salmon, soft eggs, and coffee that smells of heaven.',
        option('Eat',
          random(
            'You eat together in comfortable quiet. The coffee is strong and the pastries are still warm from the oven.',
            'He pours you coffee from a silver pot while you help yourself to eggs and toast with real butter.',
            'You eat hungrily. He watches with quiet amusement, buttering toast for you without being asked.',
          ),
          run('eatFood', { amount: 100 }),
          addStat('Mood', 5, { max: 90 }),
          time(20),
        ),
        option('Decline',
          'You wave away the food. He raises an eyebrow but doesn\'t press.',
          say('At least have some coffee.'),
          'You accept a cup. It\'s excellent.',
          time(5),
        ),
      ),
      // Money offer
      scene(
        showNpcImage(),
        random(
          seq(
            'He slips something into your hand. A fold of crisp banknotes.',
            say('For you. Buy yourself something nice — you deserve it.'),
          ),
          seq(
            'He presses an envelope into your palm.',
            say('A little something. I know student life isn\'t easy.'),
          ),
          seq(
            'He reaches for his wallet on the nightstand and counts out several notes without looking.',
            say('Take this. I insist. Consider it a token of my appreciation.'),
          ),
        ),
        option('Accept',
          'You take the money with a smile. He looks pleased.',
          run('gainItem', { item: 'crown', number: 100, text: '+100 Kr' }),
        ),
        option('Decline',
          'You push his hand away gently. His expression cools.',
          say('I see. How... principled.'),
          'He tucks the notes back into his wallet with a flick of his wrist. Something in his manner has stiffened.',
          addNpcStat('affection', -3),
        ),
      ),
      // Player is free in the room — can use bathroom, approach Ashworth, or leave
      scene(
        run('restoreAshworthClothing'),
        run('markInteraction', { npc: 'bar-patron' }),
      ),
    ),

    // ----- MORNING INTIMACY: he initiates, player responds -----
    morningIntimacy: seq(
      cond(
        npcStat('madeLove', { min: 3 }),
        // Familiar — lazy, proprietary
        random(
          seq(
            'His hand traces slowly down your side beneath the sheets. There is nothing hurried about it.',
            say('We have time. The world can wait.'),
          ),
          seq(
            'He pulls you closer, his mouth warm against your neck. His hands move with easy familiarity.',
            say('I\'m not done with you yet.'),
          ),
        ),
        // Early visits — direct, testing the waters
        random(
          seq(
            'His fingers brush your collarbone, then trail lower. His eyes hold yours — direct, unhurried, asking without asking.',
            say('Stay a moment longer.'),
          ),
          seq(
            'He leans over you, one hand braced on the pillow. The sheets slip. His expression is intent.',
            say('I don\'t think either of us is in a rush.'),
          ),
        ),
      ),
      option('Let him',
        npcInteract('morningIntimacyScene'),
      ),
      option('Not now',
        random(
          seq(
            'You catch his hand and press a kiss to his knuckles. He reads it instantly and withdraws with a smile.',
            say('As you wish.'),
          ),
          seq(
            'You stretch and roll away, pulling the sheet with you. He chuckles.',
            say('Cruel woman. Very well — breakfast it is.'),
          ),
        ),
      ),
    ),

    // ----- MORNING INTIMACY SCENE: the act itself -----
    morningIntimacyScene: scenes(
      scene(
        cond(
          npcStat('madeLove', { min: 3 }),
          random(
            'The morning is lazy and warm. He takes his time — unhurried, attentive, sure of himself and sure of you. The city wakes outside but neither of you notices.',
            'He is slow and deliberate, savouring every moment. There is none of the urgency of the night before — only quiet, confident pleasure.',
          ),
          random(
            'He is gentler than last night — unhurried, attentive, watching your face. The morning light makes everything feel different. More real, somehow.',
            'What follows is slow and warm and surprisingly intimate. In the pale morning light there is nowhere to hide, and neither of you tries to.',
          ),
        ),
        paragraph(hl('• • •', '#6b7280')),
        madeLove(),
        addNpcStat('control', 3, { max: 30, hidden: true }),
        time(30),
      ),
      scene(
        showNpcImage(),
        random(
          seq(
            'He lies back against the pillows, one arm behind his head. He looks thoroughly satisfied.',
            say('Now that is how one should start the morning.'),
          ),
          seq(
            'He stretches lazily beside you, tracing idle circles on your shoulder.',
            say('If I didn\'t have meetings, I\'d keep you here all day.'),
          ),
        ),
      ),
    ),

    // (morningMenu/morningFarewell removed — player is free in room after morning scene)

    // ----- POOL: swimming pool outing -----
    pool: scenes(
      scene(
        hideNpcImage(),
        'He leads you through a side corridor and down a flight of marble stairs. The air grows warm and humid.',
        move('hotel-pool', 5),
        showNpcImage(),
        'The pool glimmers under the vaulted glass ceiling, lit from below by brass lanterns. You have the place entirely to yourselves.',
        // Gift bikini if needed
        when(not(hasItem('bikini-top')),
          'You hesitate — you don\'t have anything to swim in.',
          'He notices your expression and waves a hand.',
          say('Leave it to me.'),
          'He has a quiet word with an attendant, who returns minutes later with a neatly folded bikini in hotel packaging.',
          say('A gift. Consider it an investment in the evening.'),
          addItem('bikini-top'),
          addItem('bikini-bottom'),
        ),
        saveOutfit('_before-pool'),
        'You slip into the changing room and emerge in your bikini. The warm, humid air feels pleasant on your skin.',
        changeOutfit(['bikini-top', 'bikini-bottom']),
      ),
      scene(
        showNpcImage(),
        random(
          'You lower yourself into the heated water. It\'s blissfully warm — the hotel\'s boilers keep it at a perfect temperature.',
          'You dive in. The water is warm and silky, lit from below so it glows a deep aquamarine.',
        ),
        time(10),
        run('consumeAlcohol', { amount: 15 }),
        menu(
          option('Swim',
            random(
              seq(
                'You swim lazy lengths together, the water warm and silky against your skin.',
                'The echo of splashing fills the vaulted space.',
                'He matches your pace easily, powerful strokes cutting the water.',
              ),
              seq(
                'You race him to the far end. He lets you win — or perhaps you\'re simply faster.',
                'Either way, you\'re both laughing and breathless at the wall.',
                say('Best of three?'),
              ),
              seq(
                'You float on your back, gazing up through the glass ceiling at the stars.',
                'He drifts beside you, close enough that your fingers occasionally touch beneath the surface.',
              ),
              seq(
                'You swim a few lengths, feeling the warm water loosen muscles you didn\'t know were tense.',
                'He watches from the edge, drink in hand, openly admiring.',
                say('You swim beautifully. Like a selkie.'),
              ),
            ),
            time(10),
            addStat('Fitness', 1, { max: 50, chance: 0.2 }),
            cond(
              // Certain after 9:30pm if he has some control
              hourBetween(21.5, 6), cond(npcStat('control', { min: 10 }), exit(poolKissInitiation())),
              // Otherwise random chance based on affection
              npcStat('affection', { min: 8 }), cond(chance(0.2), exit(poolKissInitiation())),
            ),
          ),
          option('Talk',
            random(
              seq(
                'He tells you about the hot springs of Nordheim — volcanic pools carved into mountainsides, where nobles bathe in mineral water under the northern lights.',
                say('Beautiful, but lonely. I prefer present company.'),
                'His hand brushes yours beneath the water.',
              ),
              seq(
                'You rest your arms on the pool\'s edge and talk.',
                'The warm water makes everything feel languid and easy.',
                'He asks about your life before Aetheria, and seems genuinely interested in the answers.',
              ),
              seq(
                'He describes a villa he once rented on the Adriatic coast — white stone, blue shutters, a pool overlooking the sea.',
                say('I should take you there sometime. You\'d love it.'),
                'He says it casually, but there\'s something underneath.',
              ),
              seq(
                'The conversation turns to music, of all things. He has surprisingly strong opinions about opera.',
                say('You can tell everything about a person by their favourite aria.'),
                '"And what does yours say about you?"',
                'He smiles. "That I\'m a hopeless romantic masquerading as a cynic."',
              ),
            ),
            time(10),
            addStat('Charm', 1, { max: 40, chance: 0.3 }),
            addNpcStat('affection', 1, { max: 25, hidden: true }),
            cond(
              hourBetween(21.5, 6), cond(npcStat('control', { min: 10 }), exit(poolKissInitiation())),
              wantsIntimacy('bar-patron'), cond(chance(0.2), exit(poolKissInitiation())),
            ),
          ),
          option('Have a drink',
            random(
              seq(
                'He climbs out briefly and returns with two glasses from the poolside cabinet.',
                'You drink treading water, which makes you both laugh.',
              ),
              seq(
                'An attendant materialises with a tray of cocktails.',
                'You sip yours with your elbows propped on the marble edge.',
                say('The barman makes these with orange blossom water. Quite something, aren\'t they?'),
              ),
              seq(
                'He produces a bottle of champagne that\'s been chilling in an ice bucket by the loungers.',
                'The cork echoes off the vaulted ceiling.',
                say('To midnight swimming.'),
              ),
            ),
            run('consumeAlcohol', { amount: 15 }),
            time(5),
            cond(
              hourBetween(21.5, 6), cond(npcStat('control', { min: 10 }), exit(poolKissInitiation())),
              wantsIntimacy('bar-patron'), cond(chance(0.15), exit(poolKissInitiation())),
            ),
          ),
          option('Flirt',
            // No appearance gate — they're in a private pool in swimwear, he's already interested
            random(
              seq(
                'You swim close and surface right beside him, water streaming from your hair. You hold his gaze.',
                '"The water\'s lovely. Though I think the view from over here is better."',
                'His eyes travel slowly over you. The underwater lighting does flattering things to bare skin.',
                say('You are going to be the death of me.'),
              ),
              seq(
                'You pull yourself up onto the marble edge, letting the water cascade off your body.',
                'You catch him watching and don\'t look away.',
                say('You do that on purpose, don\'t you?'),
                'You smile innocently and slip back into the water.',
              ),
              seq(
                'You drift closer in the warm water until you\'re almost touching.',
                '"I thought you said this pool was heated by the boilers?"',
                say('It is.'),
                '"Then why is the water so much warmer over here?"',
                'He laughs — a real laugh, not his usual polished chuckle.',
              ),
            ),
            addStat('Flirtation', 1, { max: 40, chance: 0.4 }),
            addNpcStat('affection', 2, { max: 25, hidden: true }),
            time(5),
            // Very likely he makes his move
            cond(chance(0.75),
              exit(poolKissInitiation()),
              // Charged atmosphere but he holds back
              random(
                'He holds your gaze, something smouldering behind his eyes. But he doesn\'t close the distance. Not yet.',
                'The tension between you is palpable. He takes a breath and ducks under the water.',
              ),
            ),
          ),
          option('Get out',
            'You\'ve had enough swimming. You pull yourself up onto the marble edge, water streaming from your skin.',
            random(
              'He follows suit, shaking water from his hair.',
              'He watches you from the water, then hauls himself out beside you.',
            ),
            'He wraps himself in a monogrammed robe and hands you a towel.',
            addStat('Mood', 3, { max: 85 }),
            addNpcStat('affection', 2, { max: 20 }),
            random(
              say('Come upstairs for a drink? My room is just up the lift.'),
              say('Shall we continue the evening upstairs? I have a rather good whisky.'),
            ),
            option('Go with him',
              hideNpcImage(),
              discoverLocation('room-533'),
              'You wrap the towel around your shoulders and follow him to the lift. He doesn\'t seem to mind that you\'re still in your bikini.',
              move('room-533', 2),
              exit(npcInteract('room533')),
            ),
            option('Stay here',
              random(
                say('Of course. It was a lovely evening.'),
                say('Another time, perhaps. Goodnight.'),
              ),
              hideNpcImage(),
              'He gives you a warm smile and disappears towards the lobby.',
              moveNpc('bar-patron', null),
            ),
          ),
        ),
      ),
    ),
  },
})
