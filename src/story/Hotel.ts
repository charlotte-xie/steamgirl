import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import type { CardDefinition } from '../model/Card'
import type { Card } from '../model/Card'
import { registerCardDefinition } from '../model/Card'
import { makeScripts } from '../model/Scripts'
import type { Instruction } from '../model/ScriptDSL'
import { script, text, when, npcStat, seq, cond, hasItem, removeItem, timeLapse, eatFood, addStat, random, run, scenes, scene, branch, choice, gatedBranch, hasStat, move, not, addItem, changeOutfit, saveOutfit, wearOutfit, menu, exit, skillCheck } from '../model/ScriptDSL'
import { freshenUp, takeWash, consumeAlcohol, applyRelaxation } from './Effects'
import { bedActivity } from './Sleep'

// ============================================================================
// HOTEL BOOKING CARD
// ============================================================================

const ROOM_PRICE = 800
const SUITE_PRICE = 5000

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

const suiteBookingCard: CardDefinition = {
  name: 'Suite Booking',
  description: 'You have the Imperial Suite booked until 11am tomorrow.',
  type: 'Access',
  color: '#c9a227', // Rich gold
  onTime: (game: Game, card: Card) => {
    const expiresAt = card.expiresAt as number
    if (expiresAt && game.time >= expiresAt) {
      game.removeCard(card.id)
    }
  },
  onRemoved: (game: Game) => {
    game.add({ type: 'text', text: 'Your suite booking has expired.', color: '#c9a227' })
    if (game.currentLocation === 'hotel-suite' || game.currentLocation === 'suite-bathroom') {
      game.add('A bellhop knocks firmly on the door. "Checkout time, I\'m afraid. Please make your way to the lobby."')
      game.run('move', { location: 'hotel' })
    }
  },
}

registerCardDefinition('suite-booking', suiteBookingCard)

// ============================================================================
// RECEPTION SCRIPTS
// ============================================================================

const addReceptionOptions = (g: Game) => {
  if (!g.player.hasCard('hotel-booking')) {
    g.addOption('receptionBookRoom', {}, `Book a Room (${ROOM_PRICE} Kr)`)
  }
  if (!g.player.hasCard('suite-booking')) {
    g.addOption('receptionBookSuite', {}, `Book the Suite (${SUITE_PRICE} Kr)`)
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
  receptionBookSuite: (g: Game) => {
    const crowns = g.player.inventory.find(i => i.id === 'crown')?.number ?? 0
    if (crowns < SUITE_PRICE) {
      g.add(`The concierge glances at a brass ledger. "The Imperial Suite is ${SUITE_PRICE} Krona per night, checkout at eleven. Our finest accommodation." He pauses. "Perhaps another time."`)
      addReceptionOptions(g)
      return
    }
    g.player.removeItem('crown', SUITE_PRICE)
    const tomorrow = new Date(g.date)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)
    const expiresAt = Math.floor(tomorrow.getTime() / 1000)
    g.addCard('suite-booking', 'Access', { expiresAt }, true)
    g.getLocation('hotel-suite').discovered = true
    g.add('The concierge\'s eyes widen slightly as you produce the payment. He retrieves an ornate brass key from a velvet-lined case.')
    g.add('"The Imperial Suite, madam. Top floor, take the lift. You\'ll find every luxury at your disposal. Checkout is at eleven tomorrow."')
    g.add({ type: 'text', text: `Paid ${SUITE_PRICE} Krona.`, color: '#c9a227' })
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

// Additional scripts for hotel activities
makeScripts({
  showPayment: (g: Game, params: { amount?: number }) => {
    const amount = params.amount ?? 0
    g.add({ type: 'text', text: `Paid ${amount} Krona.`, color: '#d4af37' })
  },
  consumeAlcohol: (g: Game, params: { amount?: number }) => {
    consumeAlcohol(g, params.amount ?? 0)
  },
  restorePoolOutfit: (g: Game) => {
    if (g.player.outfits['_before-pool']) {
      g.add('You duck into the changing room and get dressed.')
      g.player.wearOutfit('_before-pool')
      g.player.deleteOutfit('_before-pool')
      g.player.calcStats()
    }
  },
})

// ============================================================================
// BAR PATRON RANDOM ENCOUNTER (DSL)
// ============================================================================

// The patron leans in to kiss — the player responds.
// Uses a Flirtation skill check (Charm + Flirtation vs difficulty 30):
//   - Early player (Charm 10, Flirtation 5): ~0% — the moment is awkward
//   - Mid player (Charm 25, Flirtation 20): ~15% — sometimes it clicks
//   - Late player (Charm 40, Flirtation 60): ~70% — natural chemistry
function patronKissAttempt(farewell: Instruction): Instruction {
  return seq(
    random(
      'He turns to face you. His hand lifts — hesitates — then brushes a strand of hair from your face. His eyes search yours.',
      'The conversation trails off into silence. He\'s looking at you with an expression that leaves little to the imagination. His hand finds yours.',
    ),
    text('"I\'ve been wanting to do this all evening," he murmurs, and leans in.'),
    choice(
      branch('Let him',
        skillCheck('Flirtation', 30,
          // Success — the kiss works
          scenes(
            scene(
              random(
                'His lips meet yours. The kiss is brief but electric — the taste of gin and something sweeter. When he pulls back, his eyes are bright.',
                'His hand finds the small of your back as he kisses you. It\'s gentle, unhurried, and when it ends neither of you speaks for a moment.',
              ),
              addStat('Flirtation', 1, { max: 40, chance: 0.5 }),
              addStat('Charm', 1, { max: 40, chance: 0.3 }),
              addStat('Arousal', 3, { max: 100 }),
            ),
            scene(
              text('He holds your gaze, something shifting behind his eyes. When he speaks, his voice is low.'),
              random(
                '"I have a room upstairs — 533. We could have a drink, just the two of us. No pressure." His smile is warm, inviting, entirely without menace.',
                '"My room is just upstairs. 533. It seems a shame to end the evening here." He lets the suggestion hang, watching your reaction.',
              ),
              choice(
                branch('Go with him',
                  'You nod. His smile widens and he offers his arm.',
                  run('restorePoolOutfit'),
                  'The lift carries you upward in comfortable silence. He produces a brass key and unlocks the door with a quiet click.',
                  move('room-533', 2),
                  run('room533Scene'),
                ),
                branch('Decline',
                  random(
                    'You touch his arm and shake your head gently. His expression softens — disappointed, but understanding.',
                    'You smile but step back. "Not tonight." He takes it well.',
                  ),
                  '"Of course. It was a wonderful evening regardless." He kisses your hand and bids you goodnight.',
                  addStat('Mood', 5, { max: 85 }),
                  farewell,
                ),
              ),
            ),
          ),
          // Failure — the moment is awkward
          seq(
            random(
              'You let him, but the timing is off somehow. The kiss is clumsy, and when he pulls back you both laugh nervously.',
              'His lips brush yours, but the spark isn\'t there. He senses it too and draws back with a rueful smile.',
            ),
            addStat('Flirtation', 1, { max: 40, chance: 0.3, hidden: true }),
            random(
              '"Well," he says, recovering quickly. "It\'s been a delightful evening." He smiles warmly, but the moment has passed.',
              'He clears his throat. "I should probably call it a night. But I\'ve enjoyed your company tremendously."',
            ),
            farewell,
          ),
        ),
      ),
      branch('Turn away',
        random(
          'You turn your head slightly — just enough. He stops, reads the gesture, and straightens up. No offence taken.',
          'You put a gentle hand on his chest. He pauses, then nods with a warm smile. The tension dissolves.',
        ),
        '"It\'s been a wonderful evening," he says, and means it.',
        addStat('Mood', 5, { max: 85 }),
        farewell,
      ),
    ),
  )
}

// Garden farewell — plays when the player doesn't go to Room 533
function gardenFarewell(): Instruction {
  return seq(
    'He walks you back to the lobby, his hand hovering at the small of your back.',
    random(
      '"Thank you for the company. This city can be lonely, even in the best hotels." He tips an imaginary hat and disappears into the night.',
      '"You\'re quite unlike anyone I\'ve met here," he says. A final lingering look, and then he\'s gone.',
    ),
    move('hotel-bar'),
  )
}

// Garden path — walk, talk, repeatable menu, patron escalates
function patronGardenPath(): Instruction {
  return scene(
    'You follow him through the lobby and into the brass lift. He presses the top button with a confident smile.',
    move('hotel-garden', 5),
    'The lift opens onto the rooftop garden. The city stretches below, gaslights tracing the streets like scattered jewels. The air is cool and fragrant with night-blooming flowers.',
    '"Worth the trip, wouldn\'t you say?" He stands close, one hand resting lightly on the railing beside yours.',
    timeLapse(10),
    run('consumeAlcohol', { amount: 15 }),
    menu(
      branch('Talk',
        random(
          'The conversation flows easily. He tells you about his travels — the canals of Veneto, the clocktowers of Praag. His hand brushes yours, not quite by accident.',
          'You talk and laugh, the evening slipping away. He\'s charming without being pushy, attentive without being overbearing.',
          'He points out landmarks across the skyline — the university clock tower, the great chimney of the steamworks. You find yourself leaning into him as you look.',
          'He asks about your studies and listens with genuine curiosity. The night air is cool, and you stand close for warmth.',
        ),
        timeLapse(10),
        addStat('Charm', 1, { max: 40, chance: 0.3 }),
      ),
      branch('Have a drink',
        random(
          'He produces a silver hip flask and pours you something that smells of honey and smoke.',
          'He flags down a passing attendant and orders two glasses of champagne. The bubbles catch the starlight.',
        ),
        run('consumeAlcohol', { amount: 15 }),
        timeLapse(5),
      ),
      branch('Enjoy the view',
        random(
          'You lean against the railing together, watching the gaslights flicker across the rooftops. The city hums softly below.',
          'A cool breeze carries the scent of night-blooming jasmine. The stars are unusually bright above the gas-lit haze.',
          'You watch an airship drift silently across the moon, its running lights winking red and green.',
        ),
        timeLapse(10),
        addStat('Mood', 2, { max: 85 }),
      ),
      exit('Call it a night',
        random(
          'You tell him you should be heading back. He nods, not pushy about it.',
          'The evening air is getting chilly. You suggest heading inside.',
        ),
        '"Of course. It\'s been a wonderful evening." He smiles warmly.',
        addStat('Mood', 3, { max: 85 }),
        gardenFarewell(),
      ),
      exit('Stay a while longer...',
        random(
          'A comfortable silence settles between you. The city glitters below, impossibly beautiful.',
          'The conversation fades into something quieter. You stand close together, the cool air pressing you near.',
        ),
        patronKissAttempt(gardenFarewell()),
      ),
    ),
  )
}

// Pool farewell — plays when the player doesn't go to Room 533
function poolFarewell(): Instruction {
  return seq(
    'He climbs out and wraps himself in a monogrammed robe.',
    random(
      '"Thank you for the company. This city can be lonely, even in the best hotels." He gives you a warm smile and disappears towards the lobby.',
      '"You\'re quite unlike anyone I\'ve met here," he says. A final lingering look, and then he\'s gone.',
    ),
    'You towel off and change back into your clothes.',
    wearOutfit('_before-pool', { delete: true }),
    'You have the pool to yourself now. The water laps gently against the marble.',
  )
}

// Pool path — change into swimwear, repeatable menu, patron escalates
function patronPoolPath(): Instruction {
  return scenes(
    scene(
      'He leads you through a side corridor and down a flight of marble stairs. The air grows warm and humid.',
      move('hotel-pool', 5),
      'The pool glimmers under the vaulted glass ceiling, lit from below by brass lanterns. You have the place entirely to yourselves.',
      // Offer to buy a bikini if the player doesn't have one
      when(not(hasItem('bikini-top')),
        'You hesitate — you don\'t have anything to swim in.',
        'He notices your expression and waves a hand. "Leave it to me." He has a quiet word with an attendant, who returns minutes later with a neatly folded bikini in hotel packaging.',
        '"A gift," he says with a smile. "Consider it an investment in the evening."',
        addItem('bikini-top'),
        addItem('bikini-bottom'),
      ),
      saveOutfit('_before-pool'),
      'You slip into the changing room and emerge in your bikini. The warm, humid air feels pleasant on your skin.',
      changeOutfit(['bikini-top', 'bikini-bottom']),
    ),
    scene(
      random(
        'You lower yourself into the heated water. It\'s blissfully warm — the hotel\'s boilers keep it at a perfect temperature.',
        'You dive in. The water is warm and silky, lit from below so it glows a deep aquamarine.',
      ),
      timeLapse(10),
      run('consumeAlcohol', { amount: 15 }),
      menu(
        branch('Swim',
          random(
            'You swim lazy lengths together, the water warm and silky against your skin. The echo of splashing fills the vaulted space.',
            'You race him to the far end. He lets you win — or perhaps you\'re simply faster. Either way, you\'re both laughing.',
            'You float on your back, gazing up through the glass ceiling at the stars. He drifts beside you, close enough to touch.',
          ),
          timeLapse(10),
          addStat('Fitness', 1, { max: 50, chance: 0.2 }),
        ),
        branch('Talk',
          random(
            'He tells you about his travels — the canals of Veneto, the hot springs of Nordheim. His hand brushes yours beneath the water, not quite by accident.',
            'He asks about your studies, and seems genuinely interested. You talk until your fingers wrinkle, drifting closer with each exchange.',
            'You rest your arms on the pool\'s edge and talk. The warm water makes everything feel languid and easy.',
            'He describes the mechanical baths of Praag — heated by volcanic springs, with brass jets that massage your shoulders. "Nothing like this, though," he adds, looking at you.',
          ),
          timeLapse(10),
          addStat('Charm', 1, { max: 40, chance: 0.3 }),
        ),
        branch('Have a drink',
          random(
            'He climbs out briefly and returns with two glasses from the poolside cabinet. You drink treading water, which makes you both laugh.',
            'An attendant materialises with a tray of cocktails. You sip yours with your elbows propped on the marble edge.',
          ),
          run('consumeAlcohol', { amount: 15 }),
          timeLapse(5),
        ),
        exit('Get out',
          'You\'ve had enough swimming. You pull yourself up onto the marble edge, water streaming from your skin.',
          random(
            'He follows suit, shaking water from his hair. "Had enough?"',
            'He watches you from the water, then hauls himself out beside you.',
          ),
          'You towel off and change back into your clothes.',
          wearOutfit('_before-pool', { delete: true }),
          addStat('Mood', 3, { max: 85 }),
          poolFarewell(),
        ),
        exit('Float together',
          random(
            'You drift closer until you\'re floating side by side. His arm slips around your waist beneath the water.',
            'The swimming slows. You find yourselves treading water close together, the warm glow from below casting soft light on his face.',
          ),
          patronKissAttempt(poolFarewell()),
        ),
      ),
    ),
  )
}

// After flirting, the patron suggests going somewhere more interesting
function patronOuting(): Instruction {
  return scenes(
    scene(
      random(
        seq(
          text('He sets down his glass and glances towards the lobby. "You know, the rooftop garden is rather spectacular at this hour. Care to see it?"'),
          branch('Go with him', patronGardenPath()),
        ),
        seq(
          text('He leans back with an appraising look. "The hotel has a rather lovely pool, you know. Heated by the boilers. Fancy a swim?"'),
          branch('Go with him', patronPoolPath()),
        ),
      ),
      branch('Decline gracefully',
        text('You smile but shake your head. "I think I\'ll stay here. But thank you — for the drink, and the conversation."'),
        text('He nods, not offended. "The pleasure was entirely mine." He settles his bill and leaves you to the quiet hum of the bar.'),
        addStat('Mood', 2, { max: 85 }),
      ),
    ),
  )
}

const barPatronScene = scenes(
  // A well-dressed stranger approaches — varies each time
  scene(
    random(
      text('A well-dressed man in a tailored waistcoat slides onto the stool beside you. His cufflinks are polished brass, and he smells faintly of expensive cologne.'),
      text('A gentleman with silver-streaked hair and an impeccable suit takes the stool beside you. He orders a whisky without looking at the menu.'),
      text('A broad-shouldered man in a velvet smoking jacket settles onto the neighbouring stool. He catches the barman\'s eye with a practised gesture.'),
    ),
    random(
      text('"Forgive the intrusion," he says, signalling the barman. "But it seems a shame for a young lady to drink alone. Might I buy you something?"'),
      text('"I don\'t believe I\'ve seen you here before," he says, turning to you with an easy smile. "Allow me to buy you a drink?"'),
    ),
    branch('Accept the drink',
      run('consumeAlcohol', { amount: 25 }),
      random(
        text('The barman sets down two cocktails — something with gin and elderflower that catches the light.'),
        text('Two glasses of champagne arrive, the bubbles catching the amber lamplight.'),
      ),
      text('He raises his glass. "To new acquaintances." His eyes linger on you a moment longer than strictly necessary.'),
      choice(
        gatedBranch(hasStat('Flirtation', 1), 'Flirt back',
          // Flirtation check (difficulty 20): early players mostly fail, experienced players succeed
          skillCheck('Flirtation', 20,
            // Success — he's charmed
            scenes(
              scene(
                'You hold his gaze and let a slow smile play across your lips. He leans in, clearly intrigued.',
                random(
                  'The conversation turns playful. He\'s witty and attentive, and keeps finding excuses to touch your hand.',
                  'You trade barbs and compliments in equal measure. He laughs easily, charmed by your boldness.',
                ),
                timeLapse(30),
                run('consumeAlcohol', { amount: 20 }),
                addStat('Flirtation', 1, { max: 40, chance: 0.4 }),
              ),
              // After flirting — he suggests going somewhere
              patronOuting(),
            ),
            // Failure — the flirtation falls flat
            seq(
              random(
                'You try to catch his eye with a coy smile, but the delivery falls flat. He gives a polite laugh and changes the subject.',
                'You attempt a witty remark, but it lands awkwardly. He smiles graciously and steers the conversation elsewhere.',
              ),
              timeLapse(20),
              addStat('Flirtation', 1, { max: 40, chance: 0.3, hidden: true }),
              'After a pleasant but unremarkable chat, he finishes his drink. "Well, it\'s been a pleasure. Do enjoy your evening."',
            ),
          ),
        ),
        branch('Keep it casual',
          'You steer the conversation to safer waters — the city, the weather, a new exhibition at the museum.',
          'He seems genuine enough, and the chat is pleasant. After a while he finishes his drink and bids you a courteous good evening.',
          timeLapse(20),
          addStat('Mood', 3, { max: 85 }),
        ),
        branch('Excuse yourself',
          'You thank him for the drink but explain you were just leaving.',
          'He looks faintly disappointed but recovers quickly. "Of course. It was a pleasure." You leave him nursing his cocktail alone.',
        ),
      ),
    ),
    branch('Politely decline',
      text('You decline with a polite smile. He inclines his head graciously.'),
      text('"Of course. Enjoy your evening." He takes his drink and moves to a table across the room.'),
    ),
  ),
)


// ============================================================================
// ROOM 533 — PATRON'S ROOM (DSL MENU)
// ============================================================================

const room533Scene = scenes(
  scene(
    random(
      'The room is warm and softly lit, the city glittering beyond the window. He pours two drinks from a crystal decanter and hands you one.',
      'He closes the door behind you and crosses to the drinks cabinet. "Make yourself comfortable." The room smells of sandalwood and expensive leather.',
    ),
    'He settles beside you, close enough that your shoulders almost touch. The evening stretches ahead, unhurried and full of possibility.',
    menu(
      branch('Kiss him',
        random(
          'You lean into him and his arms wrap around you. The kiss is slow and deliberate, tasting of whisky and wanting. Your pulse quickens.',
          'You close the distance between you. His hand slides to your waist as your lips meet — gentle at first, then with growing urgency.',
          'He cups your face in his hands and kisses you deeply. The room seems to narrow to just the two of you, the city forgotten beyond the glass.',
          'You kiss him again, harder this time. He makes a soft sound of surprise, then pulls you closer. The warmth of his body is intoxicating.',
        ),
        addStat('Arousal', 5, { max: 100 }),
        addStat('Flirtation', 1, { max: 40, chance: 0.3 }),
        timeLapse(5),
        random(
          'He draws back just far enough to look at you, slightly breathless. "You are full of surprises."',
          'When you finally pull apart, his eyes are bright. He runs a hand through his hair, composing himself.',
          'He exhales slowly, a smile tugging at his lips. "I think I could get used to that."',
        ),
      ),
      branch('Have a drink',
        random(
          'He refills your glass from the crystal decanter. The whisky is smooth and warm, settling into your chest like liquid amber.',
          'He produces a bottle of champagne from an ice bucket you hadn\'t noticed. The cork pops with a satisfying sound, and golden bubbles rise in your glass.',
          'He mixes you something from the well-stocked drinks cabinet — gin, something floral, a twist of lemon. It\'s dangerously easy to drink.',
        ),
        run('consumeAlcohol', { amount: 20 }),
        timeLapse(10),
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
        timeLapse(15),
        addStat('Charm', 1, { max: 40, chance: 0.3 }),
        addStat('Mood', 2, { max: 85 }),
      ),
      exit('Call it a night',
        random(
          'You set down your glass and tell him you should go. He nods, rising to walk you to the door.\n\n"Thank you for a memorable evening," he says, pressing a kiss to the back of your hand. "Truly."',
          'You stand and smooth your clothes. He doesn\'t try to stop you — just smiles, warm and genuine.\n\n"I won\'t forget tonight," he says quietly. The door clicks shut behind you, and you make your way to the lift.',
        ),
        'You step out into the corridor, your heart still racing slightly, and take the lift back down to the lobby.',
        move('hotel'),
      ),
    ),
  ),
)

makeScripts({
  room533Scene: (g: Game) => g.run(room533Scene),
})

// ============================================================================
// ACTIVITY SCRIPTS (DSL)
// ============================================================================

const lightLunchScript = script(
  cond(
    hasItem('crown', 25),
    seq(
      removeItem('crown', 25),
      run('showPayment', { amount: 25 }),
      timeLapse(30),
      text('A waiter brings you a light but exquisite lunch — a salad of fresh greens, a delicate soup, and bread still warm from the oven. Every bite is perfect.'),
      eatFood(80),
      addStat('Mood', 3, { max: 90 }),
    ),
    text('A waiter approaches with a leather-bound menu. The prices make you wince. You don\'t have enough for lunch here.'),
  ),
)

const fineDinnerScript = script(
  cond(
    hasItem('crown', 50),
    seq(
      removeItem('crown', 50),
      run('showPayment', { amount: 50 }),
      timeLapse(90),
      text('You are treated to a multi-course dinner that borders on the transcendent. Roast pheasant, seasonal vegetables, a cheese course, and a dessert so rich it ought to be illegal. The wine is excellent.'),
      eatFood(150),
      addStat('Mood', 10, { max: 100 }),
      run('consumeAlcohol', { amount: 20 }),
    ),
    text('A waiter presents the evening menu with a flourish. The prices are eye-watering. You quietly excuse yourself.'),
  ),
)

const takeTeaScript = script(
  cond(
    hasItem('crown', 10),
    seq(
      removeItem('crown', 10),
      run('showPayment', { amount: 10 }),
      timeLapse(30),
      text('A waiter brings you a pot of perfectly brewed tea and a tiered stand of finger sandwiches, scones with clotted cream, and tiny pastries. It\'s delightfully civilised.'),
      eatFood(40),
      addStat('Mood', 5, { max: 90 }),
    ),
    text('You eye the tiered cake stands at nearby tables with longing. Ten krona for afternoon tea is beyond your means right now.'),
  ),
)

const swimScript = script(
  timeLapse(30),
  random(
    text('You swim steady lengths in the warm water, feeling the tension leave your muscles.'),
    text('You float on your back, gazing up through the glass ceiling at the clouds drifting past.'),
    text('You swim with powerful strokes, enjoying the exercise. The heated water is invigorating.'),
  ),
  addStat('Fitness', 1, { max: 50, chance: 0.3 }),
  addStat('Mood', 3, { max: 85 }),
  run('recordTime', { timer: 'lastWash' }),
  text('You emerge refreshed, your skin tingling pleasantly.'),
)

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
      {
        dest: 'hotel-suite',
        time: 2,
        label: 'Imperial Suite (Lift)',
        checkAccess: (game: Game) => {
          if (!game.player.hasCard('suite-booking')) {
            return 'You need to book the suite at the reception desk first.'
          }
          return null
        },
      },
      { dest: 'hotel-bar', time: 1, label: 'Bar' },
      { dest: 'hotel-restaurant', time: 1, label: 'Restaurant' },
      {
        dest: 'hotel-pool',
        time: 2,
        label: 'Pool',
        checkAccess: (game: Game) => {
          if (!game.player.hasCard('hotel-booking') && !game.player.hasCard('suite-booking')) {
            return 'The pool is for hotel residents only. You\'ll need to book a room first.'
          }
          return null
        },
      },
      { dest: 'hotel-garden', time: 2, label: 'Rooftop Garden (Lift)' },
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
      when(npcStat('affection', { npc: 'tour-guide' }),
        text('You wonder if Rob the tour guide would like to see it.'),
      ),
    ),
    activities: [
      bedActivity({ quality: 1.3 }),
    ],
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
          applyRelaxation(g, 60, 1.5)
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
  'hotel-bar': {
    name: 'Hotel Bar',
    description: 'A sophisticated drinking establishment with a long mahogany bar, leather armchairs, and brass light fittings that cast a warm amber glow. The shelves behind the bar gleam with bottles of spirits from across the Empire, and a mechanical cocktail mixer whirs softly.',
    image: '/images/hotel/bar.jpg',
    links: [
      { dest: 'hotel', time: 1, label: 'Back to Lobby' },
    ],
    onWait: (g: Game) => {
      // 20% chance per 10-minute chunk of a rich patron approaching
      if (Math.random() < 0.2) {
        g.run(barPatronScene)
      }
    },
    activities: [
      {
        name: 'Order a Drink (15 Kr)',
        symbol: '🍸',
        script: (g: Game) => {
          const crowns = g.player.inventory.find(i => i.id === 'crown')?.number ?? 0
          if (crowns < 15) {
            g.add('The barman polishes a glass and glances at you. "Fifteen krona for a cocktail, madam." You don\'t have enough.')
            return
          }
          g.player.removeItem('crown', 15)
          consumeAlcohol(g, 30)
          g.add('The barman mixes you a cocktail with practiced flair — gin, bitters, and something that fizzes when he adds it. You take a sip. It\'s excellent.')
          g.add({ type: 'text', text: 'Paid 15 Krona.', color: '#d4af37' })
        },
      },
      {
        name: 'Sit at the Bar',
        symbol: '🪑',
        script: (g: Game) => {
          g.run('wait', { minutes: 30 })
          if (!g.inScene) {
            const texts = [
              'You sit at the bar, watching the well-dressed clientele come and go. A businessman argues quietly with his companion. A woman in furs laughs at something her escort says.',
              'You observe the barman\'s mechanical precision as he mixes drinks. The brass fixtures gleam in the lamplight.',
            ]
            // Only compare to the Copper Pot if the player has actually been there
            if (g.getLocation('copper-pot-tavern').numVisits > 0) {
              texts.push('You listen to the low murmur of conversation and the clink of glasses. The bar has a hushed, genteel atmosphere quite unlike the Copper Pot.')
            } else {
              texts.push('You listen to the low murmur of conversation and the clink of glasses. The bar has a hushed, genteel atmosphere.')
            }
            g.add(texts[Math.floor(Math.random() * texts.length)])
          }
        },
      },
    ],
  },
  'hotel-restaurant': {
    name: 'Hotel Restaurant',
    description: 'An elegant dining room with white tablecloths, silver cutlery, and chandeliers that tinkle softly with the vibration of the steam pipes. Waiters in crisp uniforms glide between tables, and the air carries the scent of fine cuisine.',
    image: '/images/hotel/restaurant.jpg',
    links: [
      { dest: 'hotel', time: 1, label: 'Back to Lobby' },
    ],
    activities: [
      {
        name: 'Light Lunch (25 Kr)',
        symbol: '🥗',
        script: lightLunchScript,
        condition: (g: Game) => g.hourOfDay >= 11 && g.hourOfDay < 15,
      },
      {
        name: 'Fine Dinner (50 Kr)',
        symbol: '🍽',
        script: fineDinnerScript,
        condition: (g: Game) => g.hourOfDay >= 18 && g.hourOfDay < 22,
      },
      {
        name: 'Take Tea (10 Kr)',
        symbol: '☕',
        script: takeTeaScript,
        condition: (g: Game) => g.hourOfDay >= 14 && g.hourOfDay < 18,
      },
    ],
  },
  'hotel-pool': {
    name: 'Hotel Pool',
    description: 'A grand indoor swimming pool beneath a vaulted glass ceiling. Brass pipes feed heated water from the hotel\'s boilers, keeping it pleasantly warm. Marble columns line the edges, and loungers draped with white towels await guests. The air is humid and smells faintly of minerals.',
    image: '/images/hotel/pool.jpg',
    links: [
      { dest: 'pool-changing', time: 1, label: 'Changing Room' },
      { dest: 'hotel', time: 2, label: 'Back to Lobby' },
    ],
    activities: [
      {
        name: 'Swim',
        symbol: '🏊',
        script: swimScript,
      },
      {
        name: 'Relax by the Pool',
        symbol: '☀',
        script: (g: Game) => {
          g.run('wait', { minutes: 30 })
          if (!g.inScene) {
            const texts = [
              'You recline on a lounger and let the warm, humid air relax you. The gentle splash of water is soothing.',
              'You watch other guests swimming lazy lengths. A mechanical attendant offers you a towel.',
              'You close your eyes and listen to the echo of water against marble. This is the life.',
            ]
            g.add(texts[Math.floor(Math.random() * texts.length)])
            applyRelaxation(g, 30, 2.0)
          }
        },
      },
    ],
  },
  'pool-changing': {
    name: 'Pool Changing Room',
    description: 'A clean, tiled changing room with wooden cubicles, brass hooks, and a long mirror. Folded towels are stacked on a marble shelf, and the air carries the warmth and mineral scent of the pool beyond.',
    image: '/images/lowtown/ladies.jpg',
    links: [
      { dest: 'hotel-pool', time: 1, label: 'Back to Pool' },
    ],
    activities: [
      {
        name: 'Change into Swimwear',
        symbol: '👙',
        condition: (g: Game) => {
          // Only show if player has swimwear and isn't already wearing it
          const hasBikini = g.player.inventory.some(i => i.id === 'bikini-top')
          const wearingBikini = g.player.getWornItems().some(i => i.id === 'bikini-top')
          return hasBikini && !wearingBikini
        },
        script: (g: Game) => {
          g.player.saveOutfit('_before-pool')
          g.player.stripAll()
          g.player.wearItem('bikini-top')
          g.player.wearItem('bikini-bottom')
          g.player.calcStats()
          g.add('You change into your bikini and hang your clothes in the cubicle.')
        },
      },
      {
        name: 'Get Dressed',
        symbol: '👗',
        condition: (g: Game) => !!g.player.outfits['_before-pool'],
        script: (g: Game) => {
          g.player.wearOutfit('_before-pool')
          g.player.deleteOutfit('_before-pool')
          g.player.calcStats()
          g.add('You towel off and change back into your clothes.')
        },
      },
    ],
  },
  'hotel-garden': {
    name: 'Rooftop Garden',
    description: 'A verdant oasis atop the Imperial Hotel, enclosed by brass railings and glass panels that shelter delicate plants from the city\'s soot. Exotic flowers bloom in copper planters, and a small fountain burbles beside wrought-iron benches. The view across Aetheria\'s rooftops is spectacular.',
    image: '/images/hotel/garden.jpg',
    nightImage: '/images/hotel/garden-night.jpg',
    links: [
      { dest: 'hotel', time: 2, label: 'Back to Lobby (Lift)' },
    ],
    onFirstArrive: script(
      text('The lift doors open onto an unexpected paradise. Green leaves and bright flowers surround you, impossibly lush against the industrial skyline. You can see the whole city from here — the university spires, the factory smokestacks, the distant gleam of the river.'),
    ),
    activities: [
      {
        name: 'Enjoy the View',
        symbol: '🌆',
        script: (g: Game) => {
          g.run('wait', { minutes: 20 })
          if (!g.inScene) {
            const hour = g.hourOfDay
            if (hour >= 6 && hour < 10) {
              g.add('You watch the city wake up below. Steam rises from a hundred chimneys as Aetheria begins another day.')
            } else if (hour >= 17 && hour < 21) {
              g.add('The setting sun paints the rooftops in shades of copper and gold. The view is breathtaking.')
            } else if (hour >= 21 || hour < 6) {
              g.add('The city glitters below, gaslights tracing the streets like strings of jewels. Somewhere, a clock tower chimes.')
            } else {
              g.add('You lean against the railing and take in the panoramic view. The whole of Aetheria stretches before you.')
            }
          }
        },
      },
      {
        name: 'Stroll Through Gardens',
        symbol: '🌸',
        script: (g: Game) => {
          g.timeLapse(15)
          g.add('You wander among the flowerbeds, marvelling at orchids and ferns that have no business surviving in this climate. The hotel\'s steam-heated pipes must keep the garden warm even in winter.')
          g.player.modifyStat('Mood', 5)
        },
      },
    ],
  },
  'room-533': {
    name: 'Room 533',
    description: 'A compact but well-appointed hotel room with a single bed, a writing desk, and a window overlooking the city rooftops. The bedsheets are crisp, the fixtures polished, and a small steam radiator keeps the chill at bay. A crystal decanter of whisky sits on the dresser.',
    image: '/images/dorm-suite.jpg',
    secret: true,
    links: [
      { dest: 'hotel', time: 2, label: 'Leave to Lobby' },
    ],
  },
  'hotel-suite': {
    name: 'Imperial Suite',
    description: 'The hotel\'s finest accommodation — a spacious suite with a four-poster bed draped in velvet, a sitting area with plush armchairs, and floor-to-ceiling windows overlooking the city. Every surface gleams with brass and polished wood. A mechanical valet stands ready in the corner.',
    image: '/images/hotel/suite.jpg',
    secret: true,
    links: [
      { dest: 'suite-bathroom', time: 1, label: 'En-Suite Bathroom' },
      { dest: 'hotel', time: 2, label: 'Back to Lobby (Lift)' },
    ],
    onFirstArrive: script(
      text('The lift opens directly into the suite. You step out onto thick carpet and take in your surroundings — the four-poster bed, the sitting area, the view that seems to encompass half the city. This is how the other half lives.'),
    ),
    activities: [
      bedActivity({ quality: 1.4 }),
    ],
  },
  'suite-bathroom': {
    name: 'Suite Bathroom',
    description: 'A palatial bathroom with a marble tub large enough to swim in, brass taps shaped like swan necks, and mirrors that seem to go on forever. Fresh flowers sit in crystal vases, and monogrammed towels are stacked on heated rails.',
    image: '/images/nice-bathroom.jpg',
    links: [
      { dest: 'hotel-suite', time: 1, label: 'Back to Suite' },
    ],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
      {
        name: 'Take Shower',
        script: (g: Game) => {
          g.add('You step into the marble-clad shower. Multiple brass heads rain hot water from every angle.')
          g.timeLapse(10)
          takeWash(g)
        },
      },
      {
        name: 'Luxurious Bath',
        script: (g: Game) => {
          g.add('You fill the enormous marble tub with steaming water and add fragrant oils from cut-glass bottles. Sinking in, you feel like royalty. The heated towel rail keeps your robe warm for when you emerge.')
          g.timeLapse(60)
          takeWash(g)
          g.player.modifyStat('Mood', 10)
          applyRelaxation(g, 60, 2.0)
        },
      },
    ],
  },
}

// Register all hotel location definitions when module loads
Object.entries(HOTEL_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
