import { Game } from '../../model/Game'
import { NPC, registerNPC, PRONOUNS } from '../../model/NPC'
import type { Instruction } from '../../model/ScriptDSL'
import {
  seq, say, option, npcInteract, npcLeaveOption, addNpcStat,
  random, hideNpcImage, showNpcImage, learnNpcName,
  scenes, scene, branch, exit, menu, move, time, run,
  addStat, skillCheck, when, not, hasItem, addItem,
  saveOutfit, changeOutfit, wearOutfit, npcStat, cond, impression, moveNpc,
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
// Story arc:
//   chat (bar) → flirt (appearance-gated reaction) → outing (garden/pool)
//   → kiss attempt (skill-gated) → room 533
// ============================================================================

// Shared menu — player always sees all options; NPC reaction varies
function patronMenu(): Instruction {
  return seq(
    option('Chat', npcInteract('chat')),
    option('Flirt', npcInteract('flirt')),
    npcLeaveOption('You excuse yourself.', 'Of course. Good evening.'),
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
    branch('Let him',
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
            addNpcStat('affection', 3, { max: 30 }),
          ),
          scene(
            'He holds your gaze, something shifting behind his eyes. When he speaks, his voice is low.',
            random(
              say('I have a room upstairs — 533. We could have a drink, just the two of us. No pressure.'),
              say('My room is just upstairs. 533. It seems a shame to end the evening here.'),
            ),
            'His smile is warm, inviting, entirely without menace.',
            branch('Go with him',
              'You nod. His smile widens and he offers his arm.',
              run('restorePoolOutfit'),
              hideNpcImage(),
              'The lift carries you upward in comfortable silence. He produces a brass key and unlocks the door with a quiet click.',
              move('room-533', 2),
              run('room533Scene'),
            ),
            branch('Decline',
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
    branch('Turn away',
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
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('bar-patron')
    // Only at the bar 8pm–10pm
    npc.followSchedule(game, [
      [20, 22, 'hotel-bar'],
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

  scripts: {
    // ----- CHAT: casual bar conversation, small affection gain -----
    chat: seq(
      hideNpcImage(),
      random(
        seq(
          showNpcImage(),
          say('I\'ve been coming to the Imperial for fifteen years. Watched the whole city change from this very stool.'),
          'He swirls his whisky contemplatively.',
        ),
        seq(
          showNpcImage(),
          say('Do you know, they import the gin from the continent by airship? Keeps the botanicals fresh. Worth every penny.'),
          'He signals the barman for another round.',
        ),
        seq(
          showNpcImage(),
          say('The theatre season opens next week. I have a box, of course. One must keep up appearances.'),
          'He adjusts his cufflinks with practised ease.',
        ),
        seq(
          showNpcImage(),
          say('I made my fortune in aether refinement, if you must know. Terribly dull business, but it pays for the whisky.'),
          'He smiles with the quiet satisfaction of a man who has never worried about money.',
        ),
      ),
      addNpcStat('affection', 1, { max: 20, hidden: true }),
      time(10),
      patronMenu(),
    ),

    // ----- FLIRT: player can always try; appearance gates HIS reaction -----
    // Impression check is on the NPC's behaviour, not the player's options.
    // Low appearance: he brushes her off (feedback: "look better").
    // High appearance + skill fail: awkward but he's still interested (feedback: "practise flirting").
    // High appearance + skill pass: charmed, offers outing.
    flirt: seq(
      hideNpcImage(),
      cond(
        // He's receptive — she looks good enough to catch his eye
        impression('appearance', { min: 50 }),
        skillCheck('Flirtation', 20,
          // Success — he's charmed
          seq(
            showNpcImage(),
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
                showNpcImage(),
                say('You know, the rooftop garden is rather spectacular at this hour. Care to see it?'),
                branch('Go with him', npcInteract('garden')),
              ),
              seq(
                showNpcImage(),
                say('The hotel has a rather lovely pool, you know. Heated by the boilers. Fancy a swim?'),
                branch('Go with him', npcInteract('pool')),
              ),
            ),
            branch('Stay at the bar',
              say('Well, there\'s no rush. Another round?'),
            ),
            patronMenu(),
          ),
          // Skill check failure — she tried but it fell flat
          seq(
            showNpcImage(),
            random(
              'You try to catch his eye with a coy smile, but the delivery falls flat. He gives a polite laugh and changes the subject.',
              'You attempt a witty remark, but it lands awkwardly. He smiles graciously and steers the conversation elsewhere.',
            ),
            addStat('Flirtation', 1, { max: 40, chance: 0.3, hidden: true }),
            time(15),
            patronMenu(),
          ),
        ),
        // Not interested — appearance too low; NPC disengages (not player's fault)
        seq(
          showNpcImage(),
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
    garden: scenes(
      scene(
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
          branch('Talk',
            random(
              'The conversation flows easily. He tells you about his travels — the canals of Veneto, the clocktowers of Praag. His hand brushes yours, not quite by accident.',
              'You talk and laugh, the evening slipping away. He\'s charming without being pushy, attentive without being overbearing.',
              'He points out landmarks across the skyline — the university clock tower, the great chimney of the steamworks. You find yourself leaning into him as you look.',
              'He asks about your studies and listens with genuine curiosity. The night air is cool, and you stand close for warmth.',
            ),
            time(10),
            addStat('Charm', 1, { max: 40, chance: 0.3 }),
          ),
          branch('Have a drink',
            random(
              'He produces a silver hip flask and pours you something that smells of honey and smoke.',
              'He flags down a passing attendant and orders two glasses of champagne. The bubbles catch the starlight.',
            ),
            run('consumeAlcohol', { amount: 15 }),
            time(5),
          ),
          branch('Enjoy the view',
            random(
              'You lean against the railing together, watching the gaslights flicker across the rooftops. The city hums softly below.',
              'A cool breeze carries the scent of night-blooming jasmine. The stars are unusually bright above the gas-lit haze.',
              'You watch an airship drift silently across the moon, its running lights winking red and green.',
            ),
            time(10),
            addStat('Mood', 2, { max: 85 }),
          ),
          exit('Call it a night',
            random(
              'You tell him you should be heading back. He nods, not pushy about it.',
              'The evening air is getting chilly. You suggest heading inside.',
            ),
            say('Of course. It\'s been a wonderful evening.'),
            addStat('Mood', 3, { max: 85 }),
            addNpcStat('affection', 2, { max: 20 }),
            gardenFarewell(),
          ),
          exit('Stay a while longer...',
            showNpcImage(),
            random(
              'A comfortable silence settles between you. The city glitters below, impossibly beautiful.',
              'The conversation fades into something quieter. You stand close together, the cool air pressing you near.',
            ),
            patronKissAttempt(gardenFarewell()),
          ),
        ),
      ),
    ),

    // ----- POOL: swimming pool outing -----
    pool: (game: Game) => {
      game.run(scenes(
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
            branch('Swim',
              random(
                'You swim lazy lengths together, the water warm and silky against your skin. The echo of splashing fills the vaulted space.',
                'You race him to the far end. He lets you win — or perhaps you\'re simply faster. Either way, you\'re both laughing.',
                'You float on your back, gazing up through the glass ceiling at the stars. He drifts beside you, close enough to touch.',
              ),
              time(10),
              addStat('Fitness', 1, { max: 50, chance: 0.2 }),
            ),
            branch('Talk',
              random(
                'He tells you about his travels — the canals of Veneto, the hot springs of Nordheim. His hand brushes yours beneath the water, not quite by accident.',
                'He asks about your studies, and seems genuinely interested. You talk until your fingers wrinkle, drifting closer with each exchange.',
                'You rest your arms on the pool\'s edge and talk. The warm water makes everything feel languid and easy.',
                'He describes the mechanical baths of Praag — heated by volcanic springs, with brass jets that massage your shoulders. "Nothing like this, though," he adds, looking at you.',
              ),
              time(10),
              addStat('Charm', 1, { max: 40, chance: 0.3 }),
            ),
            branch('Have a drink',
              random(
                'He climbs out briefly and returns with two glasses from the poolside cabinet. You drink treading water, which makes you both laugh.',
                'An attendant materialises with a tray of cocktails. You sip yours with your elbows propped on the marble edge.',
              ),
              run('consumeAlcohol', { amount: 15 }),
              time(5),
            ),
            exit('Get out',
              'You\'ve had enough swimming. You pull yourself up onto the marble edge, water streaming from your skin.',
              random(
                'He follows suit, shaking water from his hair.',
                'He watches you from the water, then hauls himself out beside you.',
              ),
              say('Had enough?'),
              'You towel off and change back into your clothes.',
              wearOutfit('_before-pool', { delete: true }),
              addStat('Mood', 3, { max: 85 }),
              addNpcStat('affection', 2, { max: 20 }),
              poolFarewell(),
            ),
            exit('Float together',
              showNpcImage(),
              random(
                'You drift closer until you\'re floating side by side. His arm slips around your waist beneath the water.',
                'The swimming slows. You find yourselves treading water close together, the warm glow from below casting soft light on his face.',
              ),
              patronKissAttempt(poolFarewell()),
            ),
          ),
        ),
      ))
    },
  },
})
