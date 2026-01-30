/**
 * Jonny Elric — Enforcer
 *
 * Jonny is Elvis Crowe's right-hand man: a sharp-dressed, monocled
 * enforcer who values loyalty, toughness, and appearances. He's not
 * cruel for cruelty's sake, but he's dangerous and knows it. He
 * respects people who can hold their nerve around him.
 *
 * Interaction model:
 *
 *   Jonny is hard to befriend. Every interaction is a Charm test.
 *   He doesn't warm up to people who can't handle themselves.
 *
 *   FIRST APPROACH (affection 0):
 *   - Instant Charm DC 15 test. Success: +1, failure: -1 (min 0).
 *   - Either way he brushes you off, but success means next time
 *     he'll at least talk to you.
 *
 *   KNOWN (affection > 0):
 *   - He introduces himself (nameKnown = 1).
 *   - Each interaction is a Charm DC 12 test.
 *     Success: +1 (max 5). Failure: -1 (min 0).
 *   - Chat options: ask about Elvis, territory, work.
 *
 *   TOUR OFFER (affection ≥ 5, one-off):
 *   - New option: "What do you actually do?" triggers a Date-style
 *     tour of his patch. Acts as a date — affection can reach ~20
 *     if the player agrees with him and compliments him.
 *   - Gated by tourDone flag — only offered once.
 *
 *   RANDOM ROUNDS (affection > 15, repeatable):
 *   - When the player waits at Jonny's location, he may offer to
 *     "do a round" — another Date-style patrol. Chance to push
 *     affection further (max 25).
 *
 *   CELLAR CONFRONTATION (affection > 30, one-off):
 *   - Jonny takes you to the Copper Pot cellars to meet Elvis.
 *   - Jonny wants to be boss. Elvis doesn't know.
 *   - Player chooses:
 *     (a) Back Jonny: +20 Jonny, -40 Elvis
 *     (b) Back Elvis: +20 Elvis, -40 Jonny
 *     (c) Mediate: Charm DC 15 — success: +0/+0, failure: -20/-20
 *   - Gated by cellarsDone flag.
 *
 * Affection budget:
 *
 *   PRE-TOUR (slow grind to 5):
 *   - First approach Charm DC 15: +1 / -1
 *   - Each chat Charm DC 12: +1 (max 5) / -1 (min 0)
 *
 *   TOUR DATE (one-off, can reach ~20 with good play):
 *   - Compliment his territory: +2 (max 12)
 *   - Approve of his methods: +3 (max 15)
 *   - Tavern toast Charm DC 10: +3 (max 18)
 *   - Handle yourself in tense moment: +2 (max 20)
 *
 *   ROUNDS (affection > 15, repeatable, max 25):
 *   - Each round is a shorter date with +2-3 opportunities.
 *
 *   CELLAR CONFRONTATION (one-off, affection > 30):
 *   - Back Jonny: +20 Jonny, -40 Elvis
 *   - Back Elvis: +20 Elvis, -40 Jonny
 *   - Mediate: Charm DC 15 → +0/+0 or -20/-20
 *
 *   He basically wants an agreeable, attractive companion at his side
 *   while he shows off how tough and streetwise he is. Long-term, he
 *   wants to overthrow Elvis and run Lowtown himself.
 *
 * Schedule: Docks (morning), market/backstreets (midday), Lowtown
 * (afternoon), Copper Pot Tavern (evening). Special days on Mon/Tue/Thu.
 */

import { Game } from '../../model/Game'
import { PRONOUNS, registerNPC } from '../../model/NPC'
import type { ScheduleEntry } from '../../model/NPC'
import {
  type Instruction,
  say, seq,
  addNpcStat,
  branch, scene, scenes,
  move,
  hideNpcImage, showNpcImage,
  skillCheck,
} from '../../model/ScriptDSL'
import {
  registerDatePlan, endDate,
  handleDateApproach,
  standardGreeting, standardCancel, standardNoShow, standardComplete,
} from '../Dating'

registerNPC('jonny-elric', {
  name: 'Jonny Elric',
  uname: 'monocled gangster',
  description:
    'A sharp-dressed enforcer with a polished brass monocle that catches the gaslight. ' +
    'His movements are precise, economical — every gesture calculated. The well-maintained ' +
    'revolver at his hip and the scars on his knuckles tell a story of violence meted out ' +
    'with professional detachment.',
  image: '/images/npcs/boss2.jpg',
  speechColor: '#6b5b6b',
  pronouns: PRONOUNS.he,

  generate: (_game: Game, npc) => {
    npc.location = 'lowtown'
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('jonny-elric')
    const schedule: ScheduleEntry[] = [
      [6, 10, 'docks', [1]],            // Monday: early morning dockside intimidation
      [10, 14, 'market', [2]],          // Tuesday: collecting protection money at the market
      [14, 19, 'back-alley', [4]],      // Thursday: back-alley business
      [6, 10, 'docks'],                 // default: morning at the docks
      [10, 11, 'backstreets'],           // cutting through backstreets
      [11, 13, 'market'],               // browsing the market (and keeping an eye on things)
      [13, 14, 'backstreets'],           // returning through the backstreets
      [14, 16, 'lowtown'],              // afternoon patrol in Lowtown
      [16, 19, 'subway-lowtown'],        // watching the subway crowd
      [20, 24, 'copper-pot-tavern'],     // evening drinks at the Copper Pot
    ]
    npc.followSchedule(game, schedule)
  },

  onWait: (game: Game) => {
    // Date approach takes priority
    if (handleDateApproach(game, 'jonny-elric')) return

    const npc = game.getNPC('jonny-elric')
    if (npc.location !== game.currentLocation) return

    // Random "do a round" offer at high affection
    if (npc.affection > 15 && !game.player.hasCard('date') && Math.random() < 0.3) {
      game.run('approach', { npc: 'jonny-elric' })
      // The approach script will handle the round offer
    }
  },

  onApproach: (game: Game) => {
    if (handleDateApproach(game, 'jonny-elric')) return

    const npc = game.npc

    // ── Affection > 15: may offer a round ──
    if (npc.affection > 15 && !game.player.hasCard('date')) {
      // 30% chance of round offer on approach
      if (Math.random() < 0.3) {
        game.add('Jonny adjusts his monocle and gives you an appraising look. Something close to a smile crosses his face.')
        npc.say('Fancy doing a round with me? Could use the company.')
        game.addOption(['interact', { script: 'roundAccept' }], 'Join him')
        game.addOption(['interact', { script: 'roundDecline' }], 'Not right now')
        npc.leaveOption(undefined, 'Suit yourself.')
        return
      }
    }

    // ── Affection > 0: he knows you ──
    if (npc.affection > 0) {
      if (npc.nameKnown <= 0) {
        // First time past the threshold — he introduces himself
        npc.nameKnown = 1
        game.add('The monocled enforcer gives you a second look. This time, he doesn\'t dismiss you outright.')
        npc.say('You\'ve got nerve, I\'ll give you that. Name\'s Jonny. Jonny Elric.')
        game.add('He extends a scarred hand — briefly, formally.')
        // Timmy notices you're on speaking terms with the enforcer
        game.run(addNpcStat('respect', 5, { npc: 'spice-dealer', hidden: true }))
      } else {
        game.add('Jonny Elric adjusts his monocle and fixes you with a flat, assessing stare.')
        npc.say('Something I can help you with?')
      }
      npc.chat()
      return
    }

    // ── Affection 0: cold assessment — charm test ──
    if (npc.nameKnown > 0) {
      game.add('Jonny Elric adjusts his monocle. He doesn\'t look impressed.')
    } else {
      game.add('A monocled figure in a sharp coat sizes you up. His hand rests near the revolver at his hip — not threatening, just habit.')
    }

    if (game.player.skillTest('Charm', 15)) {
      // Passed — you held his attention
      game.run(addNpcStat('affection', 1, { hidden: true }))
      npc.say('Hmm.')
      game.add('His eyes linger on you for a moment longer than necessary. Something registers — not warmth, exactly, but a flicker of interest.')
      npc.say('Not bad. But I\'m busy.')
    } else {
      // Failed — he's unimpressed
      // Only penalise if there's something to lose
      if (npc.affection > 0) {
        game.run(addNpcStat('affection', -1, { min: 0, hidden: true }))
      }
      npc.say('Do I know you?')
      game.add('His gaze slides past you as though you\'ve ceased to exist.')
    }
    npc.leaveOption('You back away slowly.', 'Mind how you go.')
  },

  scripts: {
    // ----------------------------------------------------------------
    // GENERAL CHAT — available once nameKnown
    // ----------------------------------------------------------------
    onGeneralChat: (game: Game) => {
      const npc = game.npc

      if (npc.nameKnown <= 0) {
        game.add('He doesn\'t seem interested in talking.')
        return
      }

      // Charm test on each interaction
      if (game.player.skillTest('Charm', 12)) {
        game.run(addNpcStat('affection', 1, { max: 5, hidden: true }))
        const lines = [
          'He gives you a measured nod. You\'re holding his attention.',
          'Something shifts behind the monocle — a grudging respect.',
          'He tilts his head, considering. You\'ve passed some invisible test.',
        ]
        game.add(lines[Math.floor(Math.random() * lines.length)])
      } else {
        if (npc.affection > 0) {
          game.run(addNpcStat('affection', -1, { min: 0, hidden: true }))
        }
        const lines = [
          'His expression hardens. You\'ve lost him.',
          'He adjusts his monocle with deliberate boredom.',
          'His attention slides away. Whatever you said wasn\'t enough.',
        ]
        game.add(lines[Math.floor(Math.random() * lines.length)])
      }

      // Options vary by affection
      npc.option('You know Elvis?', 'askElvis')
        .option('Who runs these streets?', 'askTerritory')
        .option('I need work.', 'work')

      const tourDone = npc.stats.get('tourDone') ?? 0
      if (npc.affection >= 5 && !tourDone) {
        game.addOption(['interact', { script: 'askWhatHeDoes' }], 'What do you actually do?')
      }
      const cellarsDone = npc.stats.get('cellarsDone') ?? 0
      if (npc.affection > 30 && !cellarsDone) {
        game.addOption(['interact', { script: 'cellarInvite' }], 'You mentioned work...')
      }

      npc.leaveOption('You back away slowly.', 'Mind how you go.')
    },

    askElvis: (game: Game) => {
      const npc = game.npc
      npc.say('Elvis and me go way back. I handle the rough stuff. He does the thinking. You want to talk to the boss, you find him — I\'m not a messenger.')
      game.timeLapse(1)
      npc.chat()
    },

    askTerritory: (game: Game) => {
      const npc = game.npc
      npc.say('Same as always. Elvis\'s word is law down here. I make sure people remember it.')
      game.timeLapse(1)
      npc.chat()
    },

    work: (game: Game) => {
      const npc = game.npc
      npc.say('Maybe. You look like you could hold your own. But I don\'t hire strangers. Earn Elvis\'s nod first — then we\'ll talk.')
      game.timeLapse(1)
      npc.chat()
    },

    // ----------------------------------------------------------------
    // TOUR OFFER — affection ≥ 5
    // ----------------------------------------------------------------
    askWhatHeDoes: (game: Game) => {
      const npc = game.npc

      if (game.player.hasCard('date')) {
        npc.say('Another time. We\'ve got plans already.')
        npc.chat()
        return
      }

      npc.say('What do I do? I keep the peace. My way.')
      game.add('He polishes his monocle on his sleeve, studying you.')
      npc.say('Tell you what — come with me tomorrow evening. I\'ll show you how things work around here. Consider it... an education.')
      game.timeLapse(2)
      game.add('His mouth twitches — almost a smile.')
      game.addOption(['interact', { script: 'tourAccept' }], 'Accept')
      game.addOption(['interact', { script: 'tourDecline' }], 'Decline')
      npc.leaveOption()
    },

    tourAccept: (game: Game) => {
      const npc = game.getNPC('jonny-elric')

      const tomorrow = new Date(game.date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(20, 0, 0, 0) // 8pm — enforcer hours
      const meetTime = Math.floor(tomorrow.getTime() / 1000)

      npc.say('Eight o\'clock. Lowtown. Don\'t be late — I don\'t wait around.')
      game.add('He turns and walks away without looking back.')

      game.addCard('date', 'Date', {
        npc: 'jonny-elric',
        meetTime,
        meetLocation: 'lowtown',
        dateStarted: false,
      })
    },

    tourDecline: (game: Game) => {
      const npc = game.getNPC('jonny-elric')
      npc.say('Your loss.')
      game.add('He turns away, already dismissing you.')
      npc.leaveOption()
    },

    // ----------------------------------------------------------------
    // ROUNDS — affection > 15, random offer
    // ----------------------------------------------------------------
    roundAccept: (game: Game) => {
      const npc = game.getNPC('jonny-elric')

      const tomorrow = new Date(game.date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(20, 0, 0, 0)
      const meetTime = Math.floor(tomorrow.getTime() / 1000)

      npc.say('Good. Same time tomorrow. You know where to find me.')

      game.addCard('date', 'Date', {
        npc: 'jonny-elric',
        meetTime,
        meetLocation: npc.location ?? 'lowtown',
        dateStarted: false,
      })
    },

    roundDecline: (game: Game) => {
      const npc = game.getNPC('jonny-elric')
      npc.say('Suit yourself.')
      npc.leaveOption()
    },

    // ----------------------------------------------------------------
    // CELLAR CONFRONTATION — affection > 30, one-off
    // ----------------------------------------------------------------
    cellarInvite: (game: Game) => {
      const npc = game.npc
      npc.say('You\'ve been around long enough. I think it\'s time you met the boss properly.')
      game.add('He leans in, lowering his voice.')
      npc.say('There\'s something I need to talk about. Both of you. Tonight. The cellars under the Copper Pot.')
      game.add('His expression is unreadable, but there\'s a tension beneath the surface that\'s new.')
      npc.say('Be there at eleven. And keep your mouth shut about it.')
      game.addOption(['interact', { script: 'cellarAccept' }], 'I\'ll be there.')
      game.addOption(['interact', { script: 'cellarDecline' }], 'I don\'t want to get involved.')
      npc.leaveOption()
    },

    cellarAccept: (game: Game) => {
      const npc = game.getNPC('jonny-elric')
      npc.say('Good. Come on. Now.')
      game.add('He doesn\'t wait for a reply. He turns and walks toward the Copper Pot, expecting you to follow.')

      // Move player to the cellars and discover the location
      game.run('discoverLocation', { location: 'tavern-cellars' })
      game.timeLapse(10)
      game.run('move', { location: 'tavern-cellars' })

      // Trigger the scene directly
      game.run('interact', { npc: 'jonny-elric', script: 'cellarScene' })
    },

    cellarDecline: (game: Game) => {
      const npc = game.getNPC('jonny-elric')
      npc.say('Your loss. But this offer doesn\'t come around twice.')
      game.add('He turns and disappears into the crowd.')
      // Mark as done so it's not offered again — player chose not to engage
      npc.stats.set('cellarsDone', 1)
      npc.leaveOption()
    },

    // The cellar scene — Jonny leads you down, Elvis is waiting.
    // Split into three pages to avoid a wall of text.
    cellarScene: (game: Game) => {
      const jonny = game.getNPC('jonny-elric')
      const elvis = game.getNPC('elvis-crowe')

      // Mark as done immediately
      jonny.stats.set('cellarsDone', 1)
      // Timmy hears you attended a gang summit
      game.run(addNpcStat('respect', 15, { npc: 'spice-dealer', hidden: true }))

      // Move both NPCs to the cellars for the scene
      jonny.location = 'tavern-cellars'
      elvis.location = 'tavern-cellars'
      game.updateNPCsPresent()

      // Page 1: Setting the scene
      game.add('The cellar is cold and dim, lit by a single gas lamp that throws long shadows across the stacked barrels.')
      game.add('Elvis Crowe sits on an upturned crate, arms folded, his face carved from stone. Jonny stands opposite, one hand resting on his belt — near the revolver, as always.')

      game.scene.npc = 'jonny-elric'
      game.scene.hideNpcImage = false

      game.add('Elvis looks at you, then at Jonny.')
      game.add({ type: 'text', text: '"What\'s this about, Jonny?"', color: '#8b7355' })

      game.addOption(['interact', { script: 'cellarScene2' }], 'Continue')
    },

    cellarScene2: (game: Game) => {
      const jonny = game.getNPC('jonny-elric')

      // Page 2: The confrontation
      game.add('Jonny takes a breath. The enforcer mask slips, just for a second, and something hungry shows through.')

      jonny.say('It\'s about the future, Elvis. Your way of doing things — collecting pennies from stallholders, leaning on dock workers — it\'s small. We could be running half this city if we had the nerve.')

      game.add('Elvis\'s eyes narrow. The temperature in the cellar seems to drop.')
      game.add({ type: 'text', text: '"Careful, boy. I built this from nothing."', color: '#8b7355' })

      jonny.say('And I respect that. But the world\'s changing. Steam barons, new money, constables getting bolder. We either grow or we get swallowed.')

      game.addOption(['interact', { script: 'cellarScene3' }], 'Continue')
    },

    cellarScene3: (game: Game) => {
      // Page 3: The choice
      game.add('Elvis stands slowly. He\'s taller than you remembered. The silence stretches like a wire about to snap.')
      game.add({ type: 'text', text: '"And where does she fit in?"', color: '#8b7355' })
      game.add('Both men turn to look at you. The weight of the moment settles on your shoulders.')

      game.addOption(['interact', { script: 'cellarBackJonny' }], 'Jonny\'s right. You need to expand.')
      game.addOption(['interact', { script: 'cellarBackElvis' }], 'Elvis built this. Respect that.')
      game.addOption(['interact', { script: 'cellarMediate' }], 'You\'re stronger together than apart.')
    },

    cellarBackJonny: (game: Game) => {
      const jonny = game.getNPC('jonny-elric')
      const elvis = game.getNPC('elvis-crowe')

      game.add('You meet Jonny\'s eye and nod.')
      game.add('"He\'s right, Mr Crowe. The old ways won\'t hold. If you don\'t move forward, someone else will — and they won\'t be as loyal as Jonny."')

      game.add('Elvis stares at you for a long moment. Then he looks at Jonny — really looks at him — and something changes in his expression. Not defeat. Something colder.')

      game.add({ type: 'text', text: '"So that\'s how it is."', color: '#8b7355' })

      game.add('He picks up his coat from the crate and pulls it on with deliberate slowness.')

      game.add({ type: 'text', text: '"You want to run things your way, Jonny? Fine. But remember — I know where every body is buried. Because I put most of them there."', color: '#8b7355' })

      game.add('He walks past you without another glance. The cellar door slams behind him.')

      jonny.say('You just made a very powerful friend. And a very dangerous enemy.')
      game.add('He adjusts his monocle, but his hand is trembling. He didn\'t expect it to go that easily. Maybe it didn\'t.')
      jonny.say('I won\'t forget this.')

      game.run(addNpcStat('affection', 20))
      game.run(addNpcStat('affection', -40, { npc: 'elvis-crowe', min: 0 }))

      // Make Elvis know the player's name now — they've met properly
      elvis.nameKnown = 1
      // Timmy hears you met the boss face-to-face
      game.run(addNpcStat('respect', 10, { npc: 'spice-dealer', hidden: true }))

      // Return NPCs to schedule
      if (jonny.template.onMove) game.run(jonny.template.onMove)
      if (elvis.template.onMove) game.run(elvis.template.onMove)
      game.updateNPCsPresent()

      jonny.leaveOption('You leave the cellars. The air outside feels warmer than it should.')
    },

    cellarBackElvis: (game: Game) => {
      const jonny = game.getNPC('jonny-elric')
      const elvis = game.getNPC('elvis-crowe')

      game.add('You turn to Elvis.')
      game.add('"You built this from nothing, Mr Crowe. That takes something Jonny hasn\'t earned yet. I think he needs to remember who\'s in charge."')

      game.add('Elvis\'s expression doesn\'t change, but something settles behind his eyes — a cold satisfaction.')

      game.add({ type: 'text', text: '"Smart girl."', color: '#8b7355' })

      game.add('He turns to Jonny. The enforcer\'s jaw is tight, his hand white-knuckled on his belt.')

      game.add({ type: 'text', text: '"You\'ve got ambition, Jonny. That\'s useful. But you don\'t get to decide when it\'s your turn. I do. We clear?"', color: '#8b7355' })

      game.add('Jonny says nothing for a long moment. Then he nods — a short, sharp movement.')
      jonny.say('Crystal.')

      game.add('Elvis nods once, then leaves. Jonny stares at the spot where he stood. When he finally looks at you, his expression is unreadable.')
      jonny.say('You made your choice.')
      game.add('He walks out without looking back. The cellar feels very empty.')

      game.run(addNpcStat('affection', 20, { npc: 'elvis-crowe' }))
      game.run(addNpcStat('affection', -40, { min: 0 }))

      // Make Elvis know the player's name now
      elvis.nameKnown = 1
      // Timmy hears you met the boss face-to-face
      game.run(addNpcStat('respect', 10, { npc: 'spice-dealer', hidden: true }))

      // Return NPCs to schedule
      if (jonny.template.onMove) game.run(jonny.template.onMove)
      if (elvis.template.onMove) game.run(elvis.template.onMove)
      game.updateNPCsPresent()

      jonny.leaveOption('You climb the stairs alone. You\'ve picked a side. There\'s no going back.')
    },

    cellarMediate: (game: Game) => {
      const jonny = game.getNPC('jonny-elric')
      const elvis = game.getNPC('elvis-crowe')

      game.add('You hold up your hands, palms out.')
      game.add('"Listen — both of you. Elvis, you built something real. Jonny, you see where it needs to go. You\'re not enemies — you\'re two halves of the same operation."')

      game.add('Both men look at you. The silence stretches.')

      if (game.player.skillTest('Charm', 15)) {
        // Success — you thread the needle
        game.add('Elvis tilts his head, considering. Jonny\'s hand relaxes on his belt.')

        game.add({ type: 'text', text: '"Go on."', color: '#8b7355' })

        game.add('"Elvis runs strategy. Jonny runs expansion. You don\'t step on each other\'s territory. You grow together."')

        game.add('A long pause. Elvis looks at Jonny. Jonny looks at Elvis.')

        game.add({ type: 'text', text: '"The girl\'s got a head on her shoulders. Maybe we should listen."', color: '#8b7355' })

        jonny.say('...Maybe. We\'d need to work out the details.')

        game.add({ type: 'text', text: '"Details are what I do. Come see me tomorrow. Both of you."', color: '#8b7355' })

        game.add('Elvis leaves first. Jonny watches him go, then turns to you.')
        jonny.say('I don\'t know how you did that. But I\'m glad you did.')

        // Make Elvis know the player's name now
        elvis.nameKnown = 1
        // Timmy hears you met the boss face-to-face
        game.run(addNpcStat('respect', 10, { npc: 'spice-dealer', hidden: true }))

        // No affection change — neutrality has its price
      } else {
        // Failure — you overplayed your hand
        game.add('Elvis snorts. Jonny\'s expression darkens.')

        game.add({ type: 'text', text: '"Don\'t waste my time with fairy tales, girl. This isn\'t a negotiation."', color: '#8b7355' })

        jonny.say('You don\'t understand how things work down here. This was a mistake.')

        game.add('Elvis leaves without another word. Jonny follows, pausing at the door.')
        jonny.say('You tried to play both sides. People who do that end up with no sides at all.')

        game.add('The door shuts. You\'re alone in the cellar, and the gas lamp flickers as though even it disapproves.')

        game.run(addNpcStat('affection', -20, { min: 0 }))
        game.run(addNpcStat('affection', -20, { npc: 'elvis-crowe', min: 0 }))

        // Elvis still learns your name
        elvis.nameKnown = 1
        // Timmy hears you met the boss — even a botched meeting counts
        game.run(addNpcStat('respect', 10, { npc: 'spice-dealer', hidden: true }))
      }

      // Return NPCs to schedule
      if (jonny.template.onMove) game.run(jonny.template.onMove)
      if (elvis.template.onMove) game.run(elvis.template.onMove)
      game.updateNPCsPresent()

      jonny.leaveOption('You leave the cellars.')
    },
  },
})

// ============================================================================
// JONNY'S TOUR — "AN EDUCATION"
// ============================================================================

/** The main tour date: Jonny shows you his patch. */
function jonnyTourScene(): Instruction[] {
  return [
    // ── Scene 1: Setting off from Lowtown ──
    scene(
      hideNpcImage(),
      'Jonny nods once — a curt signal to follow — and sets off into the gaslit streets. You fall into step beside him.',
      move('back-alley', 5),
      'The back alleys are his territory. He moves through them like a man who owns every shadow.',
    ),
    // ── Scene 2: The back alley — showing off ──
    scene(
      showNpcImage(),
      say('See that mark on the wall? That\'s mine. Means this stretch is under our protection.'),
      'He traces a crude brass star scratched into the brickwork.',
      say('Anyone causes trouble here, they answer to me. Simple as that.'),
      branch('That must keep people safe.',
        'He glances at you — surprised, then pleased.',
        say('That\'s... exactly right. Someone\'s got to do it.'),
        addNpcStat('affection', 2, { max: 12 }),
      ),
      branch('Isn\'t that just intimidation?',
        'His jaw tightens.',
        say('Call it what you like. People sleep sound because of me. That\'s what matters.'),
      ),
    ),
    // ── Scene 3: The docks — muscle on display ──
    scene(
      hideNpcImage(),
      'He leads you down to the docks. The air turns salt-sharp and cold.',
      move('docks', 10),
      'A pair of dock workers see Jonny and give nervous nods. He returns them with a barely perceptible inclination of his head.',
      showNpcImage(),
      say('This is where the money comes in. Every crate, every shipment — we get our cut. Elvis set it up. I make sure it stays set up.'),
      branch('You\'re good at what you do.',
        say('Damn right I am.'),
        'He straightens his coat, visibly gratified.',
        addNpcStat('affection', 3, { max: 15 }),
      ),
      branch('Doesn\'t anyone push back?',
        say('They try. Once.'),
        'He touches the scars on his knuckles. The conversation moves on.',
      ),
    ),
    // ── Scene 4: The Copper Pot — drinks and a Charm check ──
    scene(
      hideNpcImage(),
      'The tour ends at the Copper Pot Tavern. Jonny pushes through the door like he owns the place. Several heads turn; none meet his eye for long.',
      move('copper-pot-tavern', 10),
      showNpcImage(),
      say('Sit. I\'m buying.'),
      'He signals the barkeep, who delivers two glasses of something amber without being asked.',
      say('To keeping the peace.'),
      'He raises his glass.',
      skillCheck('Charm', 10,
        seq(
          'You raise yours to match, holding his gaze steadily. The corner of his mouth twitches — the closest thing to warmth you\'ve seen from him.',
          say('You know what? You\'re alright. Most people can\'t sit across from me without fidgeting.'),
          addNpcStat('affection', 3, { max: 18 }),
        ),
        seq(
          'You raise your glass. Your hand trembles slightly. He notices — he notices everything.',
          say('Relax. If I wanted to hurt you, you wouldn\'t be sitting here.'),
          'Strangely, that is not reassuring.',
        ),
      ),
    ),
    // ── Scene 5: Tense moment — someone interrupts ──
    scene(
      'A wiry man stumbles over to your table, face flushed with drink and bravado.',
      say('Oi, Elric. Who\'s the girl? Bit pretty for you, isn\'t she—'),
      'Jonny doesn\'t raise his voice. He doesn\'t need to.',
      say('Walk away. Now.'),
      'The man opens his mouth, looks at Jonny\'s face, and closes it again. He retreats to the bar without another word.',
      say('Sorry about that. Some people don\'t know when to shut up.'),
      branch('You handled that well.',
        'He looks at you — really looks at you — and for a moment the enforcer mask slips.',
        say('Most people look away when things get tense. You didn\'t.'),
        addNpcStat('affection', 2, { max: 20 }),
      ),
      branch('That was a bit frightening.',
        say('I know. But you stayed. That counts for something.'),
        'He studies you with something like curiosity.',
      ),
    ),
    // ── Scene 6: Walk home ──
    scene(
      hideNpcImage(),
      'Jonny walks you back through the darkened streets. Nobody bothers you — nobody even comes close.',
      move('lowtown', 15),
      showNpcImage(),
      say('You held up well tonight. Better than most.'),
      'He adjusts his monocle. Under the gaslight, the scars on his hands look almost elegant.',
      say('You know where to find me.'),
      'He turns and walks into the dark — unhurried, in no danger, and entirely alone.',
      endDate(),
    ),
  ]
}

/** Shorter round date — a patrol with Jonny. */
function jonnyRoundScene(): Instruction[] {
  return [
    // ── Scene 1: Setting off ──
    scene(
      hideNpcImage(),
      'Jonny falls into step beside you, scanning the street with practised ease.',
      say('Stay close. I\'m checking in on a few things.'),
      move('back-alley', 5),
      'The back alleys at night are a different world — quieter, more watchful.',
    ),
    // ── Scene 2: A quick stop ──
    scene(
      showNpcImage(),
      'Jonny pauses at a doorway and exchanges a few low words with someone inside. Money changes hands — quickly, discreetly.',
      say('Business. Don\'t worry about it.'),
      branch('I wasn\'t going to ask.',
        say('Good. Smart.'),
        addNpcStat('affection', 2, { max: 25, hidden: true }),
      ),
      branch('Is everything all right?',
        say('Always is when I\'m handling it.'),
        'He gives you a sideways look — not displeased.',
        addNpcStat('affection', 1, { max: 25, hidden: true }),
      ),
    ),
    // ── Scene 3: Quiet moment ──
    scene(
      'You walk in silence for a while. The city hums distantly, but here the only sound is your footsteps.',
      say('People think this job is all violence. It\'s not. Mostly it\'s just... showing up. Being seen. That\'s enough.'),
      'He glances at you.',
      say('Having someone to walk with makes a difference. Not that I\'d admit that to anyone else.'),
      branch('Your secret\'s safe.',
        'Something shifts behind his eyes — not softness, but a guard lowering, just slightly.',
        addNpcStat('affection', 2, { max: 25, hidden: true }),
      ),
      branch('You should tell people more often.',
        say('And ruin my reputation? Not a chance.'),
        'But he almost smiles.',
      ),
    ),
    // ── Scene 4: Return ──
    scene(
      'The round is done. Jonny stops at the corner, adjusting his coat.',
      say('Same time next week?'),
      'He doesn\'t wait for an answer — he already knows.',
      // Timmy notices you've been doing rounds with the enforcer
      addNpcStat('respect', 5, { npc: 'spice-dealer', hidden: true }),
      endDate(),
    ),
  ]
}

// ============================================================================
// JONNY'S DATE PLAN
// ============================================================================

registerDatePlan({
  npcId: 'jonny-elric',
  npcDisplayName: 'Jonny',
  meetLocation: 'lowtown',
  meetLocationName: 'Lowtown',
  waitMinutes: 60, // Jonny doesn't wait as long as Rob

  onGreeting: standardGreeting(
    'You showed. Good.',
    'Walk with him',
  ),
  onCancel: standardCancel('Your call. Don\'t waste my time again.', 10),
  onNoShow: standardNoShow('Jonny', 'Jonny waited in Lowtown for an hour. He won\'t forget that.', 10),
  onComplete: standardComplete(0),

  // The tour is the first date; subsequent dates use the round scene.
  // We check if tourDone is set to pick the right scene.
  dateScene: (game: Game) => {
    const npc = game.getNPC('jonny-elric')
    const tourDone = npc.stats.get('tourDone') ?? 0

    if (tourDone) {
      game.run(scenes(...jonnyRoundScene()))
    } else {
      npc.stats.set('tourDone', 1)
      // Timmy hears you toured Lowtown with the enforcer
      game.run(addNpcStat('respect', 10, { npc: 'spice-dealer', hidden: true }))
      game.run(scenes(...jonnyTourScene()))
    }
  },
})
