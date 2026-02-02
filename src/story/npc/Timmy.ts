/**
 * Timmy Bug — Spice Dealer
 *
 * A wiry, nervous spice dealer with a mechanical hand that clicks and
 * whirs with every movement. Timmy is a bottom-feeder in the Lowtown
 * hierarchy — below Jonny Elric the enforcer, and Elvis Crowe the
 * boss. He genuinely believes spice helps people cope, and he cares
 * in his shambolic, self-justifying way.
 *
 * Schedule: Wed market, Fri docks, evenings Lowtown, late night
 * backstreets, early morning docks.
 *
 * ═══════════════════════════════════════════════════════════════════
 * THREE PATHS
 * ═══════════════════════════════════════════════════════════════════
 *
 * Timmy's story branches based on how the player treats him. They
 * won't choose a path from a menu — they'll drift into one based
 * on how they play. By the time they realise which road they're on,
 * it's hard to turn back.
 *
 * Paths are mutually exclusive. Once one resolves, the others close.
 *
 * ─────────────────────────────────────────────────────────────────
 * GATEWAY TO THE UNDERWORLD
 * ─────────────────────────────────────────────────────────────────
 *
 * The player climbs the Lowtown hierarchy through Jonny and Elvis.
 * Respect grows. Gangster rep grows. And Timmy... shrinks. The
 * easy warmth drains out of him. He stops joking. He starts calling
 * you "miss" instead of your name. One day you realise there's
 * nothing left between you — not because he stopped caring, but
 * because he's too frightened to show it.
 *
 * This isn't dramatic. It's a slow fade. The player outgrows
 * Timmy, and Timmy knows it before they do.
 *
 * (TODO: implement gangster resolution scene)
 *
 * ─────────────────────────────────────────────────────────────────
 * JUNKIE GIRLFRIEND
 * ─────────────────────────────────────────────────────────────────
 *
 * The player keeps buying spice. Junkie rep climbs. Affection
 * climbs with it — Timmy loves having a loyal customer who's also
 * a friend, maybe more. He gives discounts, then freebies, then
 * starts preparing a dose for two whenever he sees you coming.
 *
 * It feels warm. It feels like belonging. It's a trap. Timmy
 * supplies, the player consumes. Neither can leave. The "bad"
 * ending is the one where Timmy is happiest — "us against the
 * world" — and the player is the one who's lost.
 *
 * (TODO: implement junkie resolution scene)
 *
 * ─────────────────────────────────────────────────────────────────
 * REFORM TIMMY
 * ─────────────────────────────────────────────────────────────────
 *
 * The player gets close through genuine connection — flirting,
 * hanging out, dating — without leaning on gangster power or the
 * spice bond. Then, carefully, they start asking the hard questions.
 * "What if you stopped?" "You deserve better." "Come with me."
 *
 * Timmy fights every step. He's rationalised his life. He's
 * terrified of change. But the player who invests the time and
 * the social skill can crack him open. The good ending is watching
 * him drop his spice in the gutter and reach for your hand instead.
 *
 * (TODO: implement reform conversation stages and resolution)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { Game } from '../../model/Game'
import { PRONOUNS, registerNPC } from '../../model/NPC'
import type { ScheduleEntry } from '../../model/NPC'
import {
  type Instruction,
  say, seq, scene, scenes,
  addNpcStat,
  addReputation,
  reputation,
  npcStat,
  random,
  when,
  option, run,
  move,
  hideNpcImage, showNpcImage,
  npcLeaveOption,
  skillCheck,
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
    npc.stats.set('affection', 0)
    npc.stats.set('respect', 0)
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

  maybeApproach: (game: Game) => {
    handleDateApproach(game, 'spice-dealer')
  },

  onWait: (game: Game) => {
    const npc = game.getNPC('spice-dealer')
    if (npc.location !== game.currentLocation) return
    if (npc.nameKnown <= 0) return

    // Reputation-flavoured ambient text (random + when pattern)
    if (Math.random() < 0.15) {
      game.run(random(
        'Timmy is leaning against the wall, turning a packet over in his mechanical hand. He doesn\'t notice you.',
        'Timmy is haggling with someone in a doorway. His mechanical hand jabs the air for emphasis.',
        'You catch a glimpse of Timmy ducking between buildings, coat collar turned up.',
        when(reputation('gangster', { min: 30 }),
          'Timmy glances your way and quickly looks elsewhere. He knows who you run with.',
        ),
        when(reputation('gangster', { min: 30 }),
          'Timmy straightens his coat when he notices you. Word travels fast in Lowtown.',
        ),
        when(npcStat('respect', { min: 30 }),
          'Timmy notices you and finds somewhere else to be. He\'s not avoiding you exactly — he\'s just careful now.',
        ),
        when(reputation('junkie', { min: 15 }),
          'Timmy catches your eye and taps his coat pocket with a knowing look.',
        ),
        when(reputation('junkie', { min: 15 }),
          'Timmy gives you a conspiratorial nod as you pass. Fellow travellers.',
        ),
        when(reputation('junkie', { min: 20 }),
          'Timmy catches your eye and mimes taking a hit. He grins. You grin back. It\'s your thing now.',
        ),
        when(npcStat('affection', { min: 20 }),
          'Timmy is staring at his mechanical hand, turning it over slowly. He looks like he\'s thinking about something.',
        ),
      ))
    }

    // Spice pushing: only when not too respected/feared
    const respect = npc.stats.get('respect') ?? 0
    if (respect < 40 && !game.run(reputation('gangster', { min: 40 }))) {
      const lastPush = npc.stats.get('lastPush') ?? 0
      const hoursSincePush = (game.time - lastPush) / 3600
      if (hoursSincePush >= 24 && Math.random() < 0.2) {
        game.scene.npc = 'spice-dealer'
        game.scene.hideNpcImage = false
        game.run('interact', { script: 'spicePush' })
      }
    }
  },

  onFirstApproach: seq(
    'A shady figure eyes you from the shadows, his mechanical hand twitching at his side. He sizes you up — customer or constable?',
    skillCheck('Perception', 6,
      'You notice the hand is trembling slightly. Brass fingers clicking in an uneven rhythm — not menace, but nerves. He\'s more frightened of you than you are of him.',
    ),
    say('You buying or browsing? I don\'t do browsing.'),
    option('Buy Spice (10 Kr)', run('npc:buySpice')),
    option('Flirt', run('npc:flirt')),
    npcLeaveOption('You step away. He watches you go with a flicker of suspicion.', 'Watch yourself out there.'),
  ),

  onApproach: (game: Game) => {
    const npc = game.npc
    const respect = npc.stats.get('respect') ?? 0

    // Date invitation check
    if (npc.affection > respect + 10 && npc.affection > 30
        && !game.player.hasCard('date')
        && !(npc.stats.get('dateDeclined') ?? 0)) {
      game.add('Timmy shifts his weight from foot to foot, his mechanical hand clicking nervously. He seems to have something on his mind.')
      npc.say('Listen, I... I was thinking. D\'you fancy going for a walk sometime? Just the two of us. I know some spots.')
      game.addOption(['interact', { script: 'dateAccept' }], 'That sounds nice')
      game.addOption(['interact', { script: 'dateDecline' }], 'I don\'t think so')
      return
    }

    // Greeting varies by respect, reputation, and familiarity
    if (respect >= 40) {
      game.run(random(
        seq(
          'Timmy straightens up when he sees you, his mechanical hand still for once. There\'s a wary deference in his eyes.',
          say('Hey. You need anything? Anything at all.'),
        ),
        seq(
          'Timmy takes a step back when he sees you. His mechanical hand is still.',
          say('Miss. What can I do for you?'),
        ),
        seq(
          'Timmy spots you and his whole body tenses. He smooths his coat down with his good hand.',
          say('I heard about — well. You don\'t need to hear what I heard. What do you need?'),
        ),
      ))
    } else if (respect >= 25) {
      game.run(random(
        seq(
          'Timmy clocks you and stands a little straighter. He\'s heard things.',
          say('Hey. You, uh... you need anything?'),
        ),
        seq(
          'Timmy\'s eyes widen when he sees you. He pockets whatever he was holding.',
          say('Didn\'t expect to see you round here. Everything alright?'),
        ),
      ))
    } else if (game.run(reputation('junkie', { min: 15 }))) {
      game.run(random(
        seq(
          'Timmy\'s eyes light up when he sees you. A fellow connoisseur.',
          say('There she is. I was hoping you\'d swing by. Got some good stuff today.'),
        ),
        seq(
          'Timmy grins and pats his coat pocket.',
          say('I saved the good batch for you. Don\'t tell the others.'),
        ),
        seq(
          'Timmy catches sight of you and his whole face changes — relief, warmth, something almost like need.',
          say('I was getting worried you weren\'t coming.'),
        ),
      ))
    } else if (npc.affection >= 15) {
      game.run(random(
        seq(
          'Timmy looks up and gives you a crooked smile.',
          say('Oi oi. How\'s my favourite customer?'),
        ),
        seq(
          'Timmy spots you and his mechanical hand clicks a quick, pleased rhythm.',
          say('Hello, you. Good timing — I was just about to get bored.'),
        ),
      ))
    } else if (npc.nameKnown > 0) {
      game.run(random(
        seq(
          'The spice dealer eyes you warily, his mechanical hand twitching.',
          say('What do you want?'),
        ),
        seq(
          'Timmy glances up from his spot against the wall.',
          say('Back again? What\'s it this time?'),
        ),
      ))
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
      g.run(random(
        say('Pleasure doin\' business. Don\'t say where you got it.'),
        say('There you go. Best in Lowtown — and I\'m not just saying that.'),
        say('Fresh batch. You\'ll feel the difference. Trust me.'),
        when(npcStat('affection', { min: 15 }),
          say('For you? Always the good stuff. Can\'t have my favourite customer going without.'),
        ),
        when(reputation('junkie', { min: 15 }),
          seq(
            say('Same as usual, yeah?'),
            'He gives you a knowing look. No need for the sales pitch any more.',
          ),
        ),
      ))

      // Buying spice builds early affection easily
      g.run('addNpcStat', { stat: 'affection', change: 3, max: 15, hidden: true })

      // Buying spice builds junkie reputation
      g.run(addReputation('junkie', 2, { max: 30 }))

      // Gangster rep: Timmy respects your connections
      if (g.run(reputation('gangster', { min: 20 }))) {
        g.run('addNpcStat', { stat: 'respect', change: 2, max: 40, hidden: true })
      }

      // Junkie rep: Timmy warms to a fellow user
      if (g.run(reputation('junkie', { min: 10 }))) {
        g.run('addNpcStat', { stat: 'affection', change: 2, max: 25, hidden: true })
      }

      g.timeLapse(2)

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
          // Harder to push past 30 — needs Charm
          if (g.player.skillTest('Charm', 10)) {
            g.run('addNpcStat', { stat: 'affection', change: 3, max: 50 })
            g.run(random(
              seq(
                'He goes red under the grime, the corner of his mouth twitching upward.',
                say('You... you really mean that?'),
              ),
              seq(
                'His mechanical hand stops clicking. He stares at you like he\'s solving a puzzle.',
                say('Nobody talks to me like that. Nobody.'),
              ),
              seq(
                'He ducks his head, but you can see the smile spreading.',
                say('You\'re trouble, you know that? The best kind.'),
              ),
            ))
          } else {
            g.run(random(
              seq(
                'He fidgets, pleased but too wary to show it.',
                say('Don\'t mess with me. I mean it.'),
              ),
              seq(
                'He squints at you, suspicious and flattered in equal measure.',
                say('What do you want? Nobody flirts with me for nothing.'),
              ),
            ))
          }
        } else {
          g.run('addNpcStat', { stat: 'affection', change: 5, max: 40 })
          g.run(random(
            seq(
              'He softens slightly, the corner of his mouth quirking.',
              say('You\'re alright, you know that?'),
            ),
            seq(
              'His ears go pink. The mechanical hand clicks twice, fast — the Timmy equivalent of a stammer.',
              say('I — yeah. Cheers. You\'re not so bad yourself.'),
            ),
            seq(
              'He blinks, genuinely surprised. Then a grin cracks through.',
              say('Go on. Say more things like that. I don\'t mind.'),
            ),
          ))
          // Discount reveal on crossing the threshold
          if (npc.affection >= 10 && (npc.stats.get('affection') ?? 0) - 5 < 10) {
            npc.say('Alright. For you? Five Krona. Don\'t spread it around.')
          }
        }
        // Introduce on first successful flirt
        if (npc.nameKnown <= 0) {
          npc.nameKnown = 1
          g.add('"Name\'s Timmy Bug," he says with a slight grin. "You\'re alright."')
        }
      } else {
        g.run(random(
          say('Save it. I\'m not buyin\'.'),
          say('Nice try. Better luck next time.'),
          seq(
            say('Do I look like I was born yesterday?'),
            'He\'s almost amused.',
          ),
        ))
      }
      g.timeLapse(2)
    },

    spicePush: (g: Game) => {
      const npc = g.npc
      const pushCount = npc.stats.get('pushCount') ?? 0

      // Record push time
      npc.stats.set('lastPush', g.time)

      if (pushCount === 0) {
        // First push — friendly freebie
        g.run(random(
          seq(
            'Timmy sidles up to you, glancing around before producing a small paper packet.',
            say('Here. Try this. On the house. Everyone needs a little pick-me-up in Lowtown.'),
          ),
          seq(
            'Timmy appears beside you. His mechanical hand holds out a paper packet, steady despite the rest of him twitching.',
            say('Free sample. No strings. Just see how it makes you feel.'),
          ),
        ))
      } else if (pushCount <= 2) {
        // Insistent
        g.run(random(
          seq(
            'Timmy appears at your elbow, another packet already in his mechanical hand.',
            say('You look like you could use another lift. Fresh batch — good stuff.'),
          ),
          seq(
            'Timmy steps into your path. He\'s trying to look casual.',
            say('Rough day? I\'ve got just the thing. Come on, you know it helps.'),
          ),
          seq(
            'Timmy is suddenly beside you, coat open, packet visible.',
            say('I set this aside for you. Special. Go on.'),
          ),
        ))
      } else {
        // Guilt trip
        g.run(random(
          seq(
            'Timmy catches your arm, packet held out like a peace offering.',
            say('Come on. One more won\'t hurt. I thought we were mates?'),
          ),
          seq(
            'Timmy blocks your way. His eyes are bright and insistent.',
            say('Don\'t be like that. I\'m trying to look after you. That\'s what friends do.'),
          ),
          seq(
            'Timmy grabs your sleeve. His mechanical hand clicks urgently.',
            say('Please. Just take it. You\'re the only one who gets me. Don\'t shut me out.'),
          ),
        ))
      }

      g.addOption(['interact', { script: 'acceptPush' }], 'Take the spice')
      g.addOption(['interact', { script: 'refusePush' }], 'No thanks')
    },

    acceptPush: (g: Game) => {
      const npc = g.npc
      g.run('gainItem', { item: 'spice', number: 1, text: 'You pocket the free spice.' })
      npc.stats.set('pushCount', (npc.stats.get('pushCount') ?? 0) + 1)
      g.run('addNpcStat', { stat: 'affection', change: 2, max: 20, hidden: true })

      // Accepting free spice builds junkie reputation (smaller gain)
      g.run(addReputation('junkie', 1, { max: 30 }))

      g.run(random(
        seq(
          say('There you go. You won\'t regret it.'),
          'His mechanical hand clicks with satisfaction.',
        ),
        seq(
          say('Smart girl. That\'ll sort you right out.'),
          'He taps the side of his nose conspiratorially.',
        ),
        seq(
          'He presses the packet into your hand and squeezes your fingers around it.',
          say('You and me? We understand each other.'),
        ),
      ))
      g.timeLapse(1)
    },

    refusePush: (g: Game) => {
      const npc = g.npc
      npc.stats.set('pushCount', (npc.stats.get('pushCount') ?? 0) + 1)
      g.run(random(
        seq(
          say('Suit yourself. Offer stands.'),
          'He pockets the packet and melts back into the shadows, unbothered.',
        ),
        seq(
          say('Your loss. I\'ll be here when you change your mind.'),
          'He shrugs and drifts back to his spot.',
        ),
        seq(
          'He looks hurt for a second — just a flicker — then his face goes blank.',
          say('Fine. Fine.'),
        ),
      ))
      g.timeLapse(1)
    },

    hangOut: (g: Game) => {
      const npc = g.npc
      const hangCount = npc.stats.get('hangCount') ?? 0

      if (hangCount === 0) {
        // First hang out — backstory: the docks, the hand
        g.add('You lean against the wall beside him. For a while he says nothing, watching the foot traffic.')
        npc.say('You know, I didn\'t always deal. Used to work the docks — honest labour, or what passes for it round here. Then I lost this.')
        g.add('He flexes his mechanical hand, the brass joints whirring softly.')
        npc.say('Couldn\'t lift crates no more. Spice was the only trade that didn\'t need two good hands.')
        g.run('addNpcStat', { stat: 'affection', change: 3, max: 25, hidden: true })
      } else if (hangCount === 1) {
        // Second — his self-justification
        g.add('You find Timmy in his usual spot. He seems pleased to see you.')
        npc.say('People think I\'m just a dealer. But I look after people, you know? The ones who fall through the cracks. Spice takes the edge off. Makes the bad days bearable.')
        g.add('He sounds almost defensive — like he\'s rehearsed this justification many times.')
        npc.say('I\'m not the villain here. I\'m just... the bloke with the medicine.')
        g.run('addNpcStat', { stat: 'affection', change: 3, max: 30, hidden: true })
      } else if (hangCount === 2) {
        // Third — vulnerability, what he's lost
        g.add('You settle in beside Timmy. He\'s quieter today.')
        npc.say('I had a girl, once. Before all this. Before the hand.')
        g.add('He stares at the mechanical fingers.')
        npc.say('She said she\'d stay. She didn\'t. Can\'t blame her, really. Who wants to be with a one-handed spice dealer?')
        g.add('He laughs, but it\'s hollow.')
        g.run('addNpcStat', { stat: 'affection', change: 3, max: 35, hidden: true })
        // Perception: notice what he's not saying
        if (g.player.skillTest('Perception', 8)) {
          g.add('You notice his good hand is clenched. He\'s not over it. Not even close.')
          g.add('You reach over and gently uncurl his fingers. He stares at you.')
          npc.say('Don\'t... I mean... thanks. Nobody\'s done that before.')
          g.run('addNpcStat', { stat: 'affection', change: 2, max: 40, hidden: true })
        }
      } else if (hangCount === 3) {
        // Fourth — Lowtown, the people he looks after
        g.add('Timmy takes you to a narrow alley where three figures huddle around a steam vent. He drops packets into their hands without a word.')
        npc.say('See them? That\'s Meg, Colin, and Little Ratchet. Nobody else feeds them. Nobody else even sees them.')
        g.add('He watches them with something close to tenderness.')
        npc.say('I know what you\'re thinking. "He\'s just making customers." Maybe. But I\'m also the only one who gives a damn.')
        g.run('addNpcStat', { stat: 'affection', change: 2, max: 40, hidden: true })
      } else {
        // Repeatable — mixed companionship
        g.run(random(
          seq(
            'You settle in beside Timmy. The silence is companionable now.',
            say('You\'re the only one who bothers, you know. Just... being here. Most people want something.'),
            'His mechanical hand taps a quiet rhythm against the brickwork.',
          ),
          seq(
            'You lean against the wall together, watching the foot traffic.',
            say('Quiet tonight. I like it when it\'s quiet. Means nobody\'s in trouble.'),
            'He pulls his collar up against the damp.',
          ),
          seq(
            'Timmy produces two mugs of something hot from a hidden alcove. He hands you one without asking.',
            say('It\'s not spice. Just tea. Even dealers drink tea.'),
            'It\'s terrible tea. You drink it anyway.',
          ),
          seq(
            'You find Timmy watching the rooftops. His mechanical hand clicks in a slow, contented rhythm.',
            say('Sometimes I think about just leaving. Going north. Starting fresh.'),
            'He doesn\'t move. Neither of you believes it.',
          ),
          // Respect-conditional: strained hang out
          when(npcStat('respect', { min: 25 }),
            seq(
              'Timmy keeps glancing over his shoulder. He can\'t seem to settle.',
              say('You don\'t have to... I mean, I know you\'ve got bigger fish now. Important people.'),
              'His mechanical hand clicks in a rapid, anxious rhythm.',
            ),
          ),
          // Junkie-conditional: shared ritual
          when(reputation('junkie', { min: 15 }),
            seq(
              'Timmy produces a packet. The ritual is wordless now — he prepares, you wait.',
              say('Better, yeah? Everything\'s better together.'),
              'You sit in warm silence while the spice takes the edge off.',
            ),
          ),
        ))
        g.run('addNpcStat', { stat: 'affection', change: 2, max: 40, hidden: true })
      }

      g.timeLapse(10)
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
      g.timeLapse(2)
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
      g.timeLapse(2)
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
      // Perception: notice something about the rooftop
      skillCheck('Perception', 8,
        seq(
          'You notice a bedroll tucked under a tarpaulin in the corner. A tin cup. A stack of penny dreadfuls.',
          'He\'s not just visiting. He lives up here — or did.',
        ),
      ),
      option('It\'s beautiful',
        'You stand at the edge, taking it all in. Timmy watches you watch the city.',
        say('Yeah. It is. I come up here when things get... you know. Too much.'),
        addNpcStat('affection', 5, { max: 50 }),
      ),
      option('You come here alone?',
        say('Always. Well. Until now.'),
        'He looks away, embarrassed by his own honesty.',
        addNpcStat('affection', 3, { max: 50 }),
      ),
    ),
    scene(
      'You sit on the rooftop edge together, legs dangling over the alley below. The city hums and clanks beneath you.',
      say('I know what people think of me. Shady Timmy, the spice bloke. But I look after people. The ones nobody else gives a toss about.'),
      option('I know you do',
        say('You... you really think so?'),
        'His mechanical hand reaches toward yours, hesitates, then withdraws.',
        addNpcStat('affection', 5, { max: 55 }),
      ),
      option('That\'s what you tell yourself',
        say('Maybe. But it\'s true. You don\'t see what I see down here.'),
        'His expression hardens, but only for a moment.',
        addNpcStat('affection', 2, { max: 55 }),
      ),
      // Charm: push a little deeper
      skillCheck('Charm', 12,
        seq(
          'You tell him you see more than the spice and the coat and the mechanical hand. You see him.',
          say('Don\'t...'),
          'His voice cracks. He stares at the city for a long time.',
          say('Nobody\'s ever said that to me before.'),
          addNpcStat('affection', 3, { max: 55 }),
        ),
      ),
    ),
    scene(
      showNpcImage(),
      'Timmy walks you back down to the street. The gas lamps cast long shadows.',
      random(
        seq(
          say('Thanks for... you know. Coming. I don\'t really do this.'),
          'His mechanical hand clicks softly as he gives an awkward wave.',
        ),
        seq(
          say('I had a good time. Is that weird to say? I had a good time.'),
          'He\'s trying not to smile and failing completely.',
        ),
        seq(
          'He stops under a gas lamp. For a moment he looks like he wants to say something important. Then he shakes his head.',
          say('Night. Just... night. Be careful.'),
        ),
      ),
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
