/**
 * Gerald Moss — Landlord
 *
 * A weathered property manager in the backstreets. Gruff but not unkind.
 * He's seen countless tenants come and go, and he knows the building
 * and the neighbourhood better than anyone. His office is a cramped
 * room off the stairwell, piled with ledgers and rent receipts.
 *
 * Schedule: weekdays 9-12 and 16-18 in his office. Otherwise absent.
 *
 * ═══════════════════════════════════════════════════════════════════
 * STORYLINE
 * ═══════════════════════════════════════════════════════════════════
 *
 * Gerald's story is shaped by two stats: affection and lust.
 *
 * He's a widower. His wife died years ago and he never recovered.
 * The building is all he has — that and the routines that keep him
 * from thinking too hard about how empty his evenings are. He doesn't
 * talk about it, but it's there in the way he lingers over a cup of
 * tea, the way he keeps her photograph on his desk, the way he's
 * kinder to his tenants than a landlord in the backstreets has any
 * right to be.
 *
 * ─────────────────────────────────────────────────────────────────
 * JUST A TENANT (affection < 25)
 * ─────────────────────────────────────────────────────────────────
 *
 * At low affection Gerald treats the player like any other tenant.
 * Polite, professional, distant. He'll answer questions about the
 * building and handle repairs when he gets round to it. Nothing
 * more. He's had dozens of tenants and most of them leave without
 * him learning their name. The player has to make an effort to
 * become anything other than a rent cheque.
 *
 * ─────────────────────────────────────────────────────────────────
 * THE LONELY WIDOWER (affection >= 25, affection > lust)
 * ─────────────────────────────────────────────────────────────────
 *
 * If the player is kind to Gerald — talks to him, asks about the
 * building, shows interest in his life — affection grows. He opens
 * up slowly. First about the building, then the neighbourhood, then
 * eventually about his wife. He doesn't want anything from the
 * player except company. Someone to have a cup of tea with. Someone
 * who listens.
 *
 * At higher affection he becomes a genuine friend and ally — fixes
 * things faster, warns the player about trouble in the backstreets,
 * maybe helps out in small ways. The warmth is real. He's a decent
 * man who got dealt a hard hand.
 *
 * ─────────────────────────────────────────────────────────────────
 * THE CREEP (lust > affection)
 * ─────────────────────────────────────────────────────────────────
 *
 * If the player flirts with Gerald, dresses provocatively around
 * him, or otherwise stokes his attention without building genuine
 * warmth — lust outpaces affection. He starts looking too long.
 * Making excuses to visit the player's room. Standing too close.
 * Comments that could be innocent but aren't.
 *
 * He won't force anything. He's not a monster. But he has power —
 * he controls the rent, the repairs, the hot water — and loneliness
 * and desire make people rationalise things they shouldn't.
 *
 * ─────────────────────────────────────────────────────────────────
 * THE DEAL (player exploits lust)
 * ─────────────────────────────────────────────────────────────────
 *
 * If the player recognises Gerald's weakness they can lean into it.
 * Flirt deliberately. Let him look. Accept gifts. Push for rent
 * reductions. Each step gives the player something tangible — money,
 * comfort, security — but costs something harder to measure.
 *
 * It's not forced on either side. The player chooses each step with
 * open eyes, and Gerald convinces himself it's mutual. The question
 * the game asks isn't "is this wrong?" but "how far will you go,
 * and what does it cost you to get there?" Composure, self-respect,
 * the quiet knowledge of what you're doing — these are the currency.
 *
 * The player can stop at any point. Pull back, build affection
 * instead, and Gerald will follow gratefully. Or they can push
 * further and see what happens when a lonely man with a little
 * power is given a reason to use it.
 *
 * ═══════════════════════════════════════════════════════════════════
 * TODO
 * ═══════════════════════════════════════════════════════════════════
 *
 * - Chat / tea scenes that build affection
 * - Wife backstory reveals at affection thresholds
 * - Lust accumulation from flirting / exposure / deliberate provocation
 * - Gerald's behaviour shifts when lust > affection (lingering, comments)
 * - Gift / rent reduction scenes gated on lust
 * - Composure / Mood costs for the player when exploiting
 * - Pullback path: affection can overtake lust, resetting to friendship
 * - Rent payment system (prerequisite for rent reduction to matter)
 */

import { Game } from '../../model/Game'
import { registerNPC } from '../../model/NPC'
import {
  say, npcLeaveOption,
  seq, random, when, cond, and,
  text, time, move,
  scene, scenes, option,
  hideNpcImage,
  learnNpcName, discoverLocation,
  addItem, addQuest,
  npcStat, addNpcStat,
  stat, skillCheck,
  chance,
} from '../../model/ScriptDSL'

const WEEKDAYS = [1, 2, 3, 4, 5]

registerNPC('landlord', {
  name: 'Gerald Moss',
  uname: 'landlord',
  description: 'A weathered man with the tired eyes of someone who\'s managed properties in the backstreets for too long. His clothes are serviceable but worn, and he moves with the deliberate pace of someone conserving energy. Despite his gruff exterior, there\'s a hint of kindness in his manner — he\'s seen countless tenants come and go, and he knows how to spot the ones who\'ll cause trouble versus those who just need a place to rest their head.',
  image: '/images/npcs/Landlord.jpg',
  speechColor: '#b895ae',

  generate: (_game: Game, npc) => {
    npc.location = null
  },

  onMove: (game: Game) => {
    const npc = game.getNPC('landlord')
    npc.followSchedule(game, [
      [9, 12, 'landlord-office', WEEKDAYS],
      [16, 18, 'landlord-office', WEEKDAYS],
    ])
  },

  onApproach: seq(
    // First meeting handled by showAround, so this is for repeat encounters
    // Greetings vary by affection level
    cond(
      npcStat('affection', { min: 25 }),
      random(
        seq(
          text('Gerald looks up from his desk and his face softens.'),
          say('Ah, it\'s you. Come in. I was just putting the kettle on.'),
        ),
        seq(
          text('Gerald sets down his pen when he sees you and leans back in his chair.'),
          say('Always nice to see a friendly face. What can I do for you?'),
        ),
        seq(
          text('Gerald is reading something, but folds it away when you appear.'),
          say('Hello, love. Sit down, sit down. How are you getting on?'),
        ),
      ),
      npcStat('affection', { min: 10 }),
      random(
        seq(
          text('Gerald is at his desk, half-buried behind a stack of ledgers. He glances up.'),
          say('Afternoon. Something I can help you with?'),
        ),
        seq(
          text('Gerald is sorting through a pile of receipts, muttering numbers under his breath. He notices you in the doorway.'),
          say('Come in, come in. Don\'t stand on ceremony.'),
        ),
      ),
      // Default: low affection, purely professional
      random(
        seq(
          text('Gerald is at his desk. He glances up briefly.'),
          say('Yes?'),
        ),
        seq(
          text('Gerald looks up from his paperwork with the practised patience of a man who deals with tenant complaints for a living.'),
          say('What is it?'),
        ),
        seq(
          text('Gerald is leaning back in his chair with a cup of tea, staring at the ceiling as though it owes him money.'),
          say('Ah. Hello. Take a seat if you can find one.'),
        ),
      ),
    ),
    // Options
    option('Chat', 'npc:onChat'),
    when(stat('Flirtation', 20),
      option('Flirt', 'npc:onFlirt'),
    ),
    npcLeaveOption('You leave Gerald to his paperwork.', 'Right then. You know where I am.', 'Leave'),
  ),

  onWait: when(chance(0.2),
    random(
      text('Gerald turns a page in his ledger and sighs.'),
      text('Gerald sips his tea and stares at a damp patch on the wall with evident resignation.'),
      text('Gerald scratches something out in his ledger and rewrites it, shaking his head.'),
    ),
  ),

  scripts: {
    // ── Chat ────────────────────────────────────────────────────────
    // Builds affection at low levels, capped at 30. Flavour shifts as
    // he warms to the player.
    onChat: seq(
      cond(
        npcStat('affection', { min: 20 }),
        // Warmer — he's starting to enjoy the company
        random(
          seq(
            text('You ask about the building. Gerald leans forward, warming to the subject.'),
            say('Built in 1867, this place. Same year as the Great Aether Surge. Half the pipes are original — can you believe that? They don\'t make brass like they used to.'),
            addNpcStat('affection', 2, { max: 30 }),
          ),
          seq(
            text('Gerald makes you a cup of tea without being asked. It\'s strong and sweet.'),
            say('My wife always said I made tea like a builder. Suppose she was right.'),
            text('He goes quiet for a moment, then changes the subject.'),
            addNpcStat('affection', 2, { max: 30 }),
          ),
          seq(
            say('You know, most tenants just come to complain. Nice to have someone who actually talks to me.'),
            text('He sounds surprised by his own honesty.'),
            addNpcStat('affection', 3, { max: 30 }),
          ),
        ),
        npcStat('affection', { min: 10 }),
        // Thawing — polite but opening up
        random(
          seq(
            text('You make small talk about the neighbourhood. Gerald is cautious but not unfriendly.'),
            say('The backstreets aren\'t much to look at, but they\'re honest. More than you can say for Uptown.'),
            addNpcStat('affection', 2, { max: 30 }),
          ),
          seq(
            text('You ask if he\'s been the landlord here long.'),
            say('Fifteen years. Feels longer. The building was my father-in-law\'s before me.'),
            addNpcStat('affection', 2, { max: 30 }),
          ),
          seq(
            text('You comment on the weather. Gerald makes a noise that might be agreement.'),
            say('Rain\'s good for the guttering. Keeps the rust honest.'),
            text('Not the most sparkling conversation, but he seems to appreciate the effort.'),
            addNpcStat('affection', 1, { max: 30 }),
          ),
        ),
        // Default: cold, professional
        random(
          seq(
            text('You try to make conversation. Gerald gives you a look that says he has ledgers to attend to.'),
            say('Everything all right with the room?'),
            text('It\'s clear that\'s the extent of his interest.'),
            addNpcStat('affection', 1, { max: 30 }),
          ),
          seq(
            text('You ask about the building. Gerald answers in as few words as possible.'),
            say('It\'s old. It works. Don\'t touch the boiler.'),
            addNpcStat('affection', 1, { max: 30 }),
          ),
        ),
      ),
      time(10),
    ),

    // ── Flirt ───────────────────────────────────────────────────────
    // Requires Flirtation 20+. Builds lust quickly (+5 on success),
    // capped at 50. If affection is high, Gerald resists — he likes
    // the player and doesn't want to ruin it. If affection is low,
    // he's just flattered and flustered.
    onFlirt: seq(
      cond(
        // High affection — he sees the player as a friend and is conflicted
        and(npcStat('affection', { min: 20 }), skillCheck('Flirtation', 14)),
        random(
          seq(
            text('You lean on the edge of his desk and smile. Gerald goes still.'),
            say('Now, don\'t... don\'t do that. You\'re a good kid. Don\'t make this into something it shouldn\'t be.'),
            text('His voice is firm, but he hasn\'t looked away.'),
            addNpcStat('lust', 5, { max: 50 }),
          ),
          seq(
            text('You let your hand brush his as you take the offered cup of tea. Gerald\'s breath catches.'),
            say('Are you sure you should be... I mean. That\'s not... we\'re not...'),
            text('He trails off. His ears are red.'),
            addNpcStat('lust', 5, { max: 50 }),
          ),
          seq(
            text('You hold his gaze a beat too long and smile. Gerald clears his throat.'),
            say('You remind me of— no. Never mind. Forget I said anything.'),
            text('He busies himself with paperwork, but his hands aren\'t steady.'),
            addNpcStat('lust', 5, { max: 50 }),
          ),
        ),
        // Low affection, successful flirt — he's just flattered
        skillCheck('Flirtation', 10),
        random(
          seq(
            text('You compliment his waistcoat. Gerald blinks, caught off guard.'),
            say('This old thing? It\'s... well. Thank you. Nobody\'s said that in a long time.'),
            text('He adjusts the waistcoat self-consciously, trying not to look pleased.'),
            addNpcStat('lust', 5, { max: 50 }),
          ),
          seq(
            text('You give him a warm smile as you lean in the doorway. Gerald fidgets with his pen.'),
            say('Is there something you... needed? Only you\'re looking at me a bit...'),
            text('He doesn\'t finish the sentence. He doesn\'t need to.'),
            addNpcStat('lust', 5, { max: 50 }),
          ),
          seq(
            text('You tuck a strand of hair behind your ear and ask if he\'s eaten today. Gerald goes pink.'),
            say('That\'s... very kind of you to ask. I manage. I manage fine.'),
            addNpcStat('lust', 5, { max: 50 }),
          ),
        ),
        // Failed flirt — it doesn't land
        random(
          seq(
            text('You try a playful remark, but Gerald just looks confused.'),
            say('Sorry, what was that? I was miles away.'),
            text('The moment passes. He goes back to his ledger.'),
          ),
          seq(
            text('You lean on his desk with what you hope is a winning smile. Gerald frowns.'),
            say('Mind the paperwork, please.'),
          ),
        ),
      ),
      time(5),
    ),

    showAround: scenes(
      // Scene 1: Landlord greets on backstreet and introduces himself
      scene(
        text('A weathered figure steps out from a doorway.'),
        say("{pc}, I presume? Gerald Moss\u2014I'm your landlord. Pleasure to meet you. You're all paid up for two weeks. Let me show you around."),
        learnNpcName(),
        time(5),
      ),
      // Scene 2: Landlord leads you into the building
      scene(
        hideNpcImage(),
        time(1),
        move('stairwell'),
        discoverLocation('stairwell'),
        text('He leads you through a narrow doorway and into the building. The stairwell is dimly lit by gas lamps, the walls lined with faded wallpaper. The smell of coal smoke and old wood fills the air.'),
        say('Mind your step on these stairs. The third one creaks something awful.'),
      ),
      // Scene 3: Landlord shows bathroom
      scene(
        time(2),
        text('He leads you down the hallway on the first floor.'),
        say("This is the bathroom - it's shared with the other tenants. Keep it clean, won't you?"),
        move('bathroom'),
      ),
      // Scene 4: Landlord shows bedroom and hands over key
      scene(
        time(3),
        move('bedroom'),
        text("You follow your landlord to your room. It's a small room, but nice enough and all you need right now. He produces a brass key from his pocket and hands it to you."),
        say("Here's your key. Enjoy your stay."),
        addItem('room-key'),
        addQuest('attend-university', { silent: true }),
      ),
    ),
  },
})
