import { Game } from '../../model/Game'
import { NPC, registerNPC, PRONOUNS } from '../../model/NPC'
import type { Instruction } from '../../model/ScriptDSL'
import {
  seq, say, option, npcInteract, npcLeaveOption, addNpcStat,
  random, hideNpcImage, showNpcImage, learnNpcName, paragraph, hl,
  scenes, scene, branch, exit, menu, move, moveNpc, time, run,
  addStat, skillCheck, when, not, hasItem, addItem, inScene,
  saveOutfit, changeOutfit, wearOutfit, npcStat, cond, impression,
  kiss, replaceScene,
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
              npcInteract('room533'),
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

// Dismiss — he's done with the player for the evening
function ashworthDismiss(): Instruction {
  return seq(
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

    // ----- ROOM 533: drinks, chat, he escalates to bed -----
    // Ashworth drives the pace. If the player refuses at the critical moment,
    // he's done — polite but firm. Not interested in being strung along.
    room533: scenes(
      scene(
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
        menu(
          branch('Have a drink',
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
          branch('Chat',
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
          exit('Kiss him',
            random(
              'You lean into him. He catches you halfway, one hand at the back of your neck.',
              'You close the distance between you. His response is immediate — his arm around your waist, pulling you in.',
            ),
            kiss(5),
            addStat('Arousal', 5, { max: 100 }),
            time(5),
            npcInteract('makeOut'),
          ),
          exit('Call it a night',
            random(
              'You set down your glass and tell him you should go.',
              'You stand and smooth your clothes.',
            ),
            say('Thank you for a memorable evening.'),
            'He presses a kiss to the back of your hand. He doesn\'t try to stop you.',
            addStat('Mood', 5, { max: 85 }),
            ashworthDismiss(),
          ),
        ),
      ),
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
      addNpcStat('affection', 1, { max: 30, hidden: true }),
      addStat('Flirtation', 1, { max: 40, chance: 0.3 }),
      // He commands her to strip — assertive sugar daddy moment
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
        branch('Undress for him',
          saveOutfit('_before-ashworth'),
          random(
            'You hold his gaze as you undress, piece by piece. His eyes never leave you. When you\'re done he lets out a slow breath.',
            'You slip out of your clothes under his approving stare. The lamplight is warm on your bare skin. He watches every movement with quiet intensity.',
            'You undress slowly, letting each garment fall. He leans back against the pillows, watching with the satisfied expression of a man who is used to getting what he wants.',
          ),
          changeOutfit([]),
          say('Beautiful. Come here.'),
          npcInteract('makeLove'),
        ),
        // Refuses to strip — he's done. Polite but final.
        branch('Refuse',
          'You hesitate, suddenly self-conscious. He reads it instantly.',
          say('I see.'),
          'He straightens his waistcoat and pours himself a drink. The warmth in his eyes has cooled to something polite and distant.',
          say('I think we\'ve had a lovely evening. But I won\'t pretend I\'m not disappointed.'),
          random(
            'He walks you to the door. His hand on the small of your back is courteous, nothing more.',
            'He opens the door and holds it for you. The gesture is impeccable and utterly final.',
          ),
          say('Goodnight.'),
          addNpcStat('affection', -5),
          ashworthDismiss(),
        ),
      ),
    ),

    // ----- MAKE LOVE: fade to black, stat tracking -----
    makeLove: seq(
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
      addStat('Arousal', -70),
      addNpcStat('madeLove', 1),
      addNpcStat('affection', 5, { max: 30, hidden: true }),
      time(30),
      npcInteract('aftermath'),
    ),

    // ----- AFTERMATH: post-intimacy, he's content -----
    aftermath: seq(
      random(
        seq(
          'He lies back against the pillows, one arm behind his head. He looks content — the look of a man who got exactly what he wanted.',
          say('You can stay if you like. I don\'t mind the company.'),
        ),
        seq(
          'He pours two glasses from the bedside decanter and hands you one. He is relaxed, unhurried.',
          say('That was rather wonderful. Drink?'),
        ),
        seq(
          'He traces idle patterns on your shoulder. His breathing has slowed.',
          say('You are full of surprises. I like that in a woman.'),
        ),
      ),
      option('Leave', npcInteract('leave')),
      option('Sleep here', npcInteract('sleepOver')),
    ),

    // ----- SLEEP OVER: nested sleep + morning scene -----
    // Sleep runs as part of a DSL sequence. After sleep completes,
    // the morning scene continues naturally. If sleep was interrupted
    // by an event, the morning scene is skipped via when(not(inScene())).
    sleepOver: seq(
      run('sleep', { quality: 1.2 }),
      // Morning scene — only runs if sleep completed without interruption
      when(not(inScene()),
        'Pale morning light filters through the heavy curtains. The room smells of sandalwood and last night\'s whisky.',
        cond(
          npcStat('madeLove', { min: 3 }),
          // Comfortable familiarity
          random(
            seq(
              'He\'s already up, dressed in a silk robe, reading the morning paper by the window. He glances up with a warm smile.',
              say('Good morning, darling. I ordered breakfast.'),
            ),
            seq(
              'He\'s at the dressing table, fastening his cufflinks. He catches your eye in the mirror.',
              say('There she is. Sleep well?'),
            ),
          ),
          // First time or early visits — slightly more formal
          random(
            seq(
              'He\'s sitting at the edge of the bed, already half-dressed. He turns and smiles.',
              say('Ah, you\'re awake. I took the liberty of ordering room service.'),
            ),
            seq(
              'You stir to the sound of clinking china. He\'s pouring tea from a silver pot, dressed in a monogrammed robe.',
              say('Good morning. I hope you slept well.'),
            ),
          ),
        ),
        // Sugar daddy flavour — breakfast and gift
        random(
          'A silver tray sits on the bedside table — fresh pastries, fruit, and coffee that smells of heaven. You eat together in comfortable quiet.',
          'Breakfast is laid out on the writing desk — smoked salmon, soft eggs, toast with real butter. He pours you coffee from a silver pot.',
          'There are fresh pastries and a pot of fragrant tea. He butters a piece of toast and hands it to you with a quiet smile.',
        ),
        wearOutfit('_before-ashworth', { delete: true }),
        // He gives you money — casual generosity, sugar daddy framing
        random(
          seq(
            'As you dress, he slips something into your hand. A fold of crisp banknotes.',
            say('For you. Buy yourself something nice — you deserve it.'),
          ),
          seq(
            'He presses an envelope into your palm as you gather your things.',
            say('A little something. I know student life isn\'t easy.'),
          ),
          seq(
            'He watches you dress, then reaches for his wallet on the nightstand. He counts out several notes without looking.',
            say('Take this. I insist. Consider it a token of my appreciation.'),
          ),
        ),
        run('gainItem', { item: 'crown', number: 100, text: '+100 Kr' }),
        // Morning farewell
        random(
          seq(
            'He kisses your cheek at the door. The gesture is proprietary but not unpleasant.',
            say('Until next time.'),
          ),
          seq(
            'He straightens your collar with a half-smile.',
            say('You know where to find me.'),
          ),
          seq(
            'He opens the door for you with old-fashioned courtesy.',
            say('Same time tonight? I\'ll be at the bar.'),
          ),
        ),
        moveNpc('bar-patron', null),
        move('hotel'),
      ),
    ),

    // ----- LEAVE: after intimacy -----
    leave: seq(
      'You dress quietly and let yourself out. He watches you go with a half-smile.',
      wearOutfit('_before-ashworth', { delete: true }),
      say('Same time tomorrow?'),
      moveNpc('bar-patron', null),
      'You take the lift back down to the lobby.',
      move('hotel'),
    ),

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
    ),
  },
})
