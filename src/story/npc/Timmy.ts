/**
 * Timmy Bug — Spice Dealer
 *
 * A wiry, nervous spice dealer who operates out of Lowtown. He's shady
 * but caring in his own way — he genuinely believes spice helps people
 * cope with the harshness of life in Aetheria's underbelly. He has a
 * mechanical hand that clicks and whirs with every movement.
 *
 * Two main stats:
 *
 *   AFFECTION — raised by buying spice, flirting, hanging out.
 *   RESPECT — raised by associating with powerful gang members
 *     (Jonny Elric and Elvis Crowe). Timmy is a bottom-feeder in the
 *     Lowtown hierarchy and is keenly aware of who has connections.
 *
 * Reputation integration (faction: lowtown):
 *
 *   JUNKIE — earned by buying spice (+2 per purchase, +1 for free
 *     samples, max 30). Higher junkie rep makes Timmy warmer — he sees
 *     you as a fellow user and gives hidden affection bonuses.
 *
 *   GANGSTER — checked but not earned here. High gangster rep makes
 *     Timmy more deferential (greeting changes, hidden respect bonuses
 *     on purchases) and stops spice pushing entirely at >= 40.
 *
 *   Both reputations modify approach greetings and buy interactions.
 *   The onWait hook uses random() + when() for ambient reputation-
 *   flavoured text.
 *
 * Interaction model:
 *
 *   FIRST APPROACH (nameKnown = 0):
 *   - Suspicious. Offers spice for sale only. No name given.
 *   - Introduces himself after first purchase or successful flirt.
 *
 *   GENERAL (nameKnown > 0):
 *   - Buy Spice (10 Kr, or 5 Kr if affection >= 10) — easy early affection
 *   - Flirt (Flirtation skill test)
 *   - Hang Out (affection > 10) — reveals backstory
 *   - Drop a Name (affection > 15) — brag about Jonny/Elvis connections
 *     Truthful brag: +5 respect. Lie + Charm DC 12: +3 respect on
 *     success, -5 respect and -5 affection on failure.
 *
 *   SPICE PUSHING (respect < 40 AND gangster rep < 40):
 *   - When the player waits near Timmy, he may offer a free sample.
 *   - Escalates: friendly -> insistent -> guilt trip (tracked by pushCount).
 *   - Stops entirely when respect >= 40 OR gangster rep >= 40 (too
 *     scared of the player's connections to push uninvited).
 *
 *   DATING (affection > respect + 10 AND affection > 30):
 *   - Timmy nervously asks the player out. He's surprised and flustered.
 *   - Only triggers if he sees the player as more of a friend/crush
 *     than someone to fear.
 *   - Scared off if respect is too close to affection — he doesn't
 *     date people who scare him.
 *
 * Affection budget:
 *
 *   EARLY (grinding to ~15):
 *   - Buy spice: +3 (hidden, max 15) — easy early affection
 *   - Flirt (Flirtation DC 0): +5 (max 40)
 *   - First buy/flirt: introduces himself
 *
 *   MID (10-30):
 *   - Hang out option unlocked
 *   - Flirt continues working (+3 per, max 40)
 *   - Discount unlocked at 10
 *
 *   LATE (30+):
 *   - Date invitation possible (if affection > respect + 10)
 *   - Date scenes: +5-10 affection per date
 *
 * Respect sources:
 *   From Jonny.ts (gang events):
 *   - Jonny introduces himself: +5
 *   - Complete Jonny's tour: +10
 *   - Complete a round with Jonny: +5
 *   - Cellar confrontation: +15
 *   - Elvis learns player's name: +10
 *   From bragging (this file):
 *   - Truthful brag about Jonny/Elvis: +5
 *   - Successful lie (Charm DC 12): +3
 *   - Failed lie: -5 respect, -5 affection
 *
 * Schedule: Wed market, Fri docks, evenings Lowtown, late night
 * backstreets, early morning docks.
 */

import { Game } from '../../model/Game'
import { PRONOUNS, registerNPC } from '../../model/NPC'
import type { ScheduleEntry } from '../../model/NPC'
import {
  type Instruction,
  say, scene, scenes,
  addNpcStat,
  addReputation,
  hasReputation,
  random,
  when,
  branch,
  move,
  hideNpcImage, showNpcImage,
  npcLeaveOption,
} from '../../model/ScriptDSL'
import {
  registerDatePlan, endDate,
  handleDateApproach,
  standardGreeting, standardCancel, standardNoShow, standardComplete,
} from '../Dating'

// ============================================================================
// NPC REGISTRATION
// ============================================================================

registerNPC('spice-dealer', {
  name: 'Timmy Bug',
  uname: 'spice dealer',
  faction: 'lowtown',
  description: 'A wiry figure with a mechanical hand that clicks and whirs with every movement. His eyes dart constantly, assessing every passerby for potential customers or threats. The faint scent of exotic compounds clings to his worn coat, and he moves with the practiced caution of someone who knows the value of discretion in Lowtown\'s shadowy economy.',
  image: '/images/npcs/dealer.jpg',
  speechColor: '#7a8b6b',
  pronouns: PRONOUNS.he,

  generate: (_game: Game, npc) => {
    npc.location = 'lowtown'
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('spice-dealer')
    const schedule: ScheduleEntry[] = [
      [10, 13, 'market', [3]],        // Wednesday: sourcing supplies at the market
      [14, 18, 'docks', [5]],         // Friday: collecting a shipment at the docks
      [15, 2, 'lowtown'],             // default: dealing in Lowtown evenings
      [2, 3, 'backstreets'],          // late night: slipping through the backstreets
      [4, 7, 'docks'],               // early morning: checking the docks
    ]
    npc.followSchedule(game, schedule)
  },

  onWait: (game: Game) => {
    if (handleDateApproach(game, 'spice-dealer')) return

    const npc = game.getNPC('spice-dealer')
    if (npc.location !== game.currentLocation) return
    if (npc.nameKnown <= 0) return

    // Reputation-flavoured ambient text (random + when pattern)
    if (Math.random() < 0.15) {
      game.run(random(
        when(hasReputation('gangster', { min: 30 }),
          'Timmy glances your way and quickly looks elsewhere. He knows who you run with.',
        ),
        when(hasReputation('gangster', { min: 30 }),
          'Timmy straightens his coat when he notices you. Word travels fast in Lowtown.',
        ),
        when(hasReputation('junkie', { min: 15 }),
          'Timmy catches your eye and taps his coat pocket with a knowing look.',
        ),
        when(hasReputation('junkie', { min: 15 }),
          'Timmy gives you a conspiratorial nod as you pass. Fellow travellers.',
        ),
      ))
    }

    const respect = npc.stats.get('respect') ?? 0

    // Spice pushing: only when not too respected/feared
    // Stops at respect >= 40 OR gangster reputation >= 40
    if (respect < 40 && !game.run(hasReputation('gangster', { min: 40 }))) {
      const lastPush = npc.stats.get('lastPush') ?? 0
      const hoursSincePush = (game.time - lastPush) / 3600
      if (hoursSincePush >= 24 && Math.random() < 0.2) {
        game.scene.npc = 'spice-dealer'
        game.scene.hideNpcImage = false
        game.run('interact', { script: 'spicePush' })
      }
    }
  },

  onFirstApproach: (game: Game) => {
    game.add('A shady figure eyes you from the shadows, his mechanical hand twitching at his side. He sizes you up — customer or constable?')
    const npc = game.npc
    npc.say('You buying or browsing? I don\'t do browsing.')
    npc.option('Buy Spice (10 Kr)', 'buySpice')
      .option('Flirt', 'flirt')
      .leaveOption('You step away. He watches you go with a flicker of suspicion.', 'Watch yourself out there.')
  },

  onApproach: (game: Game) => {
    if (handleDateApproach(game, 'spice-dealer')) return

    const npc = game.npc
    const respect = npc.stats.get('respect') ?? 0

    // Date invitation check
    if (npc.affection > respect + 10 && npc.affection > 30
        && !game.player.hasCard('date')
        && !(npc.stats.get('dateDeclined') ?? 0)) {
      game.add('Timmy shifts his weight from foot to foot, his mechanical hand clicking nervously. He seems to have something on his mind.')
      npc.say('Listen, I... I was thinking. D\'you fancy going for a walk sometime? Just the two of us. I know some spots.')
      game.addOption('interact', { script: 'dateAccept' }, 'That sounds nice')
      game.addOption('interact', { script: 'dateDecline' }, 'I don\'t think so')
      return
    }

    // Reputation- and respect-based greeting variation
    if (respect >= 40) {
      game.add('Timmy straightens up when he sees you, his mechanical hand still for once. There\'s a wary deference in his eyes.')
      npc.say('Hey. You need anything? Anything at all.')
    } else if (game.run(hasReputation('gangster', { min: 20 }))) {
      game.add('Timmy clocks you from across the street. He stands a little straighter — he\'s heard things.')
      npc.say('Hey. You, uh... you need anything?')
    } else if (game.run(hasReputation('junkie', { min: 15 }))) {
      game.add('Timmy\'s eyes light up when he sees you. A fellow connoisseur.')
      npc.say('There she is. I was hoping you\'d swing by. Got some good stuff today.')
    } else if (npc.nameKnown > 0) {
      game.add('The spice dealer eyes you warily, his mechanical hand twitching.')
      npc.say('What do you want?')
    } else {
      game.add('A shady figure eyes you warily, his mechanical hand twitching.')
      npc.say('What do you want?')
    }

    npc.chat()
  },

  scripts: {
    onGeneralChat: (g: Game) => {
      const npc = g.npc
      if (npc.nameKnown <= 0) {
        // Before introduction — only business
        npc.option('Buy Spice (10 Kr)', 'buySpice')
          .option('Flirt', 'flirt')
          .leaveOption('You step away.', 'Watch yourself out there.')
        return
      }

      // Chat options open up as affection rises
      const price = npc.affection >= 10 ? 5 : 10
      npc.option(`Buy Spice (${price} Kr)`, 'buySpice')
        .option('Flirt', 'flirt')
      if (npc.affection > 10) {
        npc.option('Hang out', 'hangOut')
      }
      if (npc.affection > 15) {
        const jonny = g.npcs.get('jonny-elric')
        const elvis = g.npcs.get('elvis-crowe')
        if ((jonny?.nameKnown ?? 0) > 0 || (elvis?.nameKnown ?? 0) > 0) {
          npc.option('Drop a name...', 'bragMenu')
        }
      }
      npc.leaveOption('You step away.', 'Watch yourself out there.')
    },

    buySpice: (g: Game) => {
      const npc = g.npc
      const price = npc.affection >= 10 ? 5 : 10
      const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
      if (crown < price) {
        npc.say(`You need ${price} Krona. Come back when you've got it.`)
        return
      }
      g.player.removeItem('crown', price)
      g.run('gainItem', { item: 'spice', number: 1, text: 'You receive a small packet of Spice.' })
      npc.say('Pleasure doin\' business. Don\'t say where you got it.')

      // Buying spice builds early affection easily
      g.run('addNpcStat', { stat: 'affection', change: 3, max: 15, hidden: true })

      // Buying spice builds junkie reputation
      g.run(addReputation('junkie', 2, { max: 30 }))

      // Gangster rep: Timmy respects your connections
      if (g.run(hasReputation('gangster', { min: 20 }))) {
        g.run('addNpcStat', { stat: 'respect', change: 2, max: 40, hidden: true })
      }

      // Junkie rep: Timmy warms to a fellow user
      if (g.run(hasReputation('junkie', { min: 10 }))) {
        g.run('addNpcStat', { stat: 'affection', change: 2, max: 25, hidden: true })
      }

      // Introduce on first purchase
      if (npc.nameKnown <= 0) {
        npc.nameKnown = 1
        g.add('"Name\'s Timmy Bug," he says, extending his mechanical hand. "You\'re alright."')
        npc.chat()
      }
    },

    flirt: (g: Game) => {
      const npc = g.npc
      const ok = g.player.skillTest('Flirtation', 0)
      if (ok) {
        if (npc.affection >= 30) {
          // Harder to push past 30
          const charm = g.player.skillTest('Charm', 10)
          if (charm) {
            g.run('addNpcStat', { stat: 'affection', change: 3, max: 50 })
            g.add('He goes red under the grime, the corner of his mouth twitching upward.')
            npc.say('You... you really mean that?')
          } else {
            g.add('He fidgets, pleased but too wary to show it.')
            npc.say('Don\'t mess with me. I mean it.')
          }
        } else {
          g.run('addNpcStat', { stat: 'affection', change: 5, max: 40 })
          g.add('He softens slightly, the corner of his mouth quirking. After a pause, he nods.')
          if (npc.affection >= 10 && (npc.stats.get('affection') ?? 0) - 5 < 10) {
            npc.say('Alright. For you? Five. Don\'t spread it around.')
          } else {
            npc.say('You\'re alright.')
          }
        }
        // Introduce on first successful flirt
        if (npc.nameKnown <= 0) {
          npc.nameKnown = 1
          g.add('"Name\'s Timmy Bug," he says with a slight grin. "You\'re alright."')
        }
      } else {
        npc.say('Save it. I\'m not buyin\'.')
      }
    },

    spicePush: (g: Game) => {
      const npc = g.npc
      const pushCount = npc.stats.get('pushCount') ?? 0

      // Record push time
      npc.stats.set('lastPush', g.time)

      if (pushCount === 0) {
        // First push — friendly freebie
        g.add('Timmy sidles up to you, glancing around before producing a small paper packet.')
        npc.say('Here. Try this. On the house. Everyone needs a little pick-me-up in Lowtown.')
      } else if (pushCount === 1) {
        // Second push — more insistent
        g.add('Timmy appears at your elbow, another packet already in his mechanical hand.')
        npc.say('You look like you could use another lift. Fresh batch — good stuff.')
      } else {
        // Third+ — guilt trip
        g.add('Timmy catches your arm, packet held out like a peace offering.')
        npc.say('Come on. One more won\'t hurt. I thought we were mates?')
      }

      g.addOption('interact', { script: 'acceptPush' }, 'Take the spice')
      g.addOption('interact', { script: 'refusePush' }, 'No thanks')
    },

    acceptPush: (g: Game) => {
      const npc = g.npc
      g.run('gainItem', { item: 'spice', number: 1, text: 'You pocket the free spice.' })
      npc.stats.set('pushCount', (npc.stats.get('pushCount') ?? 0) + 1)
      g.run('addNpcStat', { stat: 'affection', change: 2, max: 20, hidden: true })

      // Accepting free spice builds junkie reputation (smaller gain)
      g.run(addReputation('junkie', 1, { max: 30 }))

      npc.say('There you go. You won\'t regret it.')
      g.add('His mechanical hand clicks with satisfaction.')
    },

    refusePush: (g: Game) => {
      const npc = g.npc
      npc.stats.set('pushCount', (npc.stats.get('pushCount') ?? 0) + 1)
      npc.say('Suit yourself. Offer stands.')
      g.add('He pockets the packet and melts back into the shadows, unbothered.')
    },

    hangOut: (g: Game) => {
      const npc = g.npc
      const hangCount = npc.stats.get('hangCount') ?? 0

      if (hangCount === 0) {
        g.add('You lean against the wall beside him. For a while he says nothing, watching the foot traffic.')
        npc.say('You know, I didn\'t always deal. Used to work the docks — honest labour, or what passes for it round here. Then I lost this.')
        g.add('He flexes his mechanical hand, the brass joints whirring softly.')
        npc.say('Couldn\'t lift crates no more. Spice was the only trade that didn\'t need two good hands.')
        g.run('addNpcStat', { stat: 'affection', change: 3, max: 25, hidden: true })
      } else if (hangCount === 1) {
        g.add('You find Timmy in his usual spot. He seems pleased to see you.')
        npc.say('People think I\'m just a dealer. But I look after people, you know? The ones who fall through the cracks. Spice takes the edge off. Makes the bad days bearable.')
        g.add('He sounds almost defensive — like he\'s rehearsed this justification many times.')
        npc.say('I\'m not the villain here. I\'m just... the bloke with the medicine.')
        g.run('addNpcStat', { stat: 'affection', change: 3, max: 30, hidden: true })
      } else {
        g.add('You settle in beside Timmy. The silence is companionable now.')
        npc.say('You\'re the only one who bothers, you know. Just... being here. Most people want something.')
        g.add('His mechanical hand taps a quiet rhythm against the brickwork.')
        g.run('addNpcStat', { stat: 'affection', change: 2, max: 35, hidden: true })
      }

      npc.stats.set('hangCount', hangCount + 1)
      npc.chat()
    },

    // ----------------------------------------------------------------
    // BRAGGING — drop names to build respect (or get caught lying)
    // ----------------------------------------------------------------

    bragMenu: (g: Game) => {
      const jonny = g.npcs.get('jonny-elric')
      const elvis = g.npcs.get('elvis-crowe')
      g.add('You lean in conspiratorially.')
      if ((jonny?.nameKnown ?? 0) > 0) {
        g.npc.option('Mention Jonny Elric', 'bragJonny')
      }
      if ((elvis?.nameKnown ?? 0) > 0) {
        g.npc.option('Mention Elvis Crowe', 'bragElvis')
      }
      g.npc.leaveOption('You think better of it.')
    },

    bragJonny: (g: Game) => {
      const npc = g.npc
      const jonny = g.npcs.get('jonny-elric')
      const jonnyAffection = jonny?.affection ?? 0

      if (jonnyAffection > 15) {
        // Truthful — player actually knows Jonny
        g.add('"I\'ve been doing rounds with Jonny Elric. We go way back."')
        g.add('Timmy\'s eyes widen. His mechanical hand stops clicking.')
        npc.say('You... you run with Jonny? Right. Right. I didn\'t know that.')
        g.run('addNpcStat', { stat: 'respect', change: 5, hidden: true })
      } else {
        // Lying — Charm test
        g.add('"I\'ve been doing rounds with Jonny Elric. We go way back."')
        if (g.player.skillTest('Charm', 12)) {
          g.add('Timmy looks shaken. He buys it.')
          npc.say('Blimey. I had no idea. Look, if there\'s anything you need...')
          g.run('addNpcStat', { stat: 'respect', change: 3, hidden: true })
        } else {
          g.add('Timmy narrows his eyes. Something doesn\'t add up.')
          npc.say('Pull the other one. Jonny doesn\'t run with people like you. Don\'t lie to me.')
          g.run('addNpcStat', { stat: 'respect', change: -5, hidden: true, min: 0 })
          g.run('addNpcStat', { stat: 'affection', change: -5, min: 0 })
        }
      }
      npc.chat()
    },

    bragElvis: (g: Game) => {
      const npc = g.npc
      const elvis = g.npcs.get('elvis-crowe')
      const elvisKnown = elvis?.nameKnown ?? 0

      if (elvisKnown > 0) {
        // Truthful — player has actually met Elvis
        g.add('"Elvis Crowe and I have an understanding. He knows my name."')
        g.add('Timmy goes very still. When he speaks, his voice is careful.')
        npc.say('Elvis Crowe. Right. You\'re... you\'re connected. I hear you.')
        g.run('addNpcStat', { stat: 'respect', change: 5, hidden: true })
      } else {
        // Lying — Charm test
        g.add('"Elvis Crowe and I have an understanding. He knows my name."')
        if (g.player.skillTest('Charm', 12)) {
          g.add('Timmy swallows hard. He believes you.')
          npc.say('Christ. I didn\'t realise you were... look, forget the prices. Whatever you need.')
          g.run('addNpcStat', { stat: 'respect', change: 3, hidden: true })
        } else {
          g.add('Timmy snorts, though there\'s a nervous edge to it.')
          npc.say('Sure you do. And I\'m the Lord Mayor. Don\'t waste my time with fairy tales.')
          g.run('addNpcStat', { stat: 'respect', change: -5, hidden: true, min: 0 })
          g.run('addNpcStat', { stat: 'affection', change: -5, min: 0 })
        }
      }
      npc.chat()
    },

    dateAccept: (g: Game) => {
      const npc = g.getNPC('spice-dealer')

      const tomorrow = new Date(g.date)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(21, 0, 0, 0) // 9pm — he's a night creature
      const meetTime = Math.floor(tomorrow.getTime() / 1000)

      npc.say('Really? I mean — yeah. Course. Tomorrow night. Nine. Lowtown. I\'ll be here.')
      g.add('He\'s trying very hard to look casual, but his mechanical hand is clicking like a telegraph.')

      g.addCard('date', 'Date', {
        npc: 'spice-dealer',
        meetTime,
        meetLocation: 'lowtown',
        dateStarted: false,
      })
    },

    dateDecline: (g: Game) => {
      const npc = g.getNPC('spice-dealer')
      npc.say('Yeah. No. Course. Stupid idea. Forget I said anything.')
      g.add('He looks away quickly, his jaw tight. The mechanical hand clenches and unclenches.')
      npc.stats.set('dateDeclined', 1)
      npc.leaveOption()
    },
  },
})

// ============================================================================
// DATE SCENE
// ============================================================================

function timmyDateScene(): Instruction[] {
  return [
    scene(
      hideNpcImage(),
      'Timmy is waiting under a guttering gas lamp, hands shoved in his pockets. When he sees you, he straightens up and almost smiles.',
      move('lowtown', 5),
    ),
    scene(
      showNpcImage(),
      say('Right. So. I thought I\'d show you my Lowtown. The real one — not the version the constables see.'),
      'He leads you down a narrow passage between two leaning buildings. The brickwork is damp and the air smells of iron and old smoke.',
      say('This is where I started. Slept rough here for three months after I lost the docks job. Cold as anything, but nobody bothers you.'),
    ),
    scene(
      hideNpcImage(),
      'He takes you up a rusted fire escape, moving with surprising agility for someone with a mechanical hand. The metal groans under your weight.',
      move('back-alley', 10),
    ),
    scene(
      showNpcImage(),
      'You emerge onto a flat rooftop. The city stretches out below — smokestacks and spires, gaslight and shadow. It\'s beautiful in a broken kind of way.',
      say('Best view in Lowtown. Nobody comes up here but me.'),
      branch('It\'s beautiful',
        'You stand at the edge, taking it all in. Timmy watches you watch the city.',
        say('Yeah. It is. I come up here when things get... you know. Too much.'),
        addNpcStat('affection', 5, { max: 50 }),
      ),
      branch('You come here alone?',
        say('Always. Well. Until now.'),
        'He looks away, embarrassed by his own honesty.',
        addNpcStat('affection', 3, { max: 50 }),
      ),
    ),
    scene(
      'You sit on the rooftop edge together, legs dangling over the alley below. The city hums and clanks beneath you.',
      say('I know what people think of me. Shady Timmy, the spice bloke. But I look after people. The ones nobody else gives a toss about.'),
      branch('I know you do',
        say('You... you really think so?'),
        'His mechanical hand reaches toward yours, hesitates, then withdraws.',
        addNpcStat('affection', 5, { max: 55 }),
      ),
      branch('That\'s what you tell yourself',
        say('Maybe. But it\'s true. You don\'t see what I see down here.'),
        'His expression hardens, but only for a moment.',
        addNpcStat('affection', 2, { max: 55 }),
      ),
    ),
    scene(
      showNpcImage(),
      'Timmy walks you back down to the street. The gas lamps cast long shadows.',
      say('Thanks for... you know. Coming. I don\'t really do this.'),
      'His mechanical hand clicks softly as he gives an awkward wave.',
      npcLeaveOption('Night. Be safe out there.'),
      endDate(),
    ),
  ]
}

registerDatePlan({
  npcId: 'spice-dealer',
  npcDisplayName: 'Timmy',
  meetLocation: 'lowtown',
  meetLocationName: 'Lowtown',
  waitMinutes: 60,
  dateScene: scenes(...timmyDateScene()),
  onGreeting: standardGreeting(
    'You came. I wasn\'t sure you would.',
    'Walk with him',
  ),
  onCancel: standardCancel(
    'Right. Yeah. Course. No worries.',
    15,
  ),
  onNoShow: standardNoShow(
    'Timmy',
    'Timmy waited in Lowtown for an hour, shifting nervously, but you never showed.',
    10,
  ),
  onComplete: standardComplete(10),
})
