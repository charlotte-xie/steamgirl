/**
 * Copper Pot Tavern — Location & Ivan Hess (Barkeeper)
 *
 * Ivan is the proprietor of the Copper Pot Tavern, a gruff but observant
 * man with a mechanical arm who's been pouring pints in Lowtown for decades.
 * He hears everything but says little — unless he trusts you. He's nobody's
 * fool and nobody's friend, but regulars earn a grudging warmth over time.
 *
 * Interaction model:
 *
 *   FIRST APPROACH:
 *   - Sizes the player up. Introduces himself. Learns name.
 *
 *   GENERAL CHAT:
 *   - Buy a Drink (10 Kr) — easy early interaction
 *   - Ask for Gossip — varies based on nameKnown status of other NPCs
 *   - Ask for Work — washing glasses, small pay + Lowtown flavour
 *   - Ask about the Regulars (affection ≥ 5) — Ivan talks about Elvis,
 *     Jonny, and Timmy; references them by name if known
 *
 *   NPC-local scripts (for interpolation flavour):
 *   - drinkOfTheDay — random daily special
 *   - barWisdom — gruff bartender one-liners
 *   - regularsComment — observation about whoever's in tonight
 *
 * Affection budget:
 *
 *   Ivan doesn't do romance. Affection here means trust.
 *   - Buy a drink: +1 (hidden, max 10)
 *   - Work shift: +2 (hidden, max 15)
 *   - Ask about regulars: +1 (hidden, max 20)
 *   Very slow build — he's not the warm and fuzzy type.
 *
 * Schedule: 10am–2am at the Copper Pot, every day.
 */

import { Game } from '../model/Game'
import { PRONOUNS, registerNPC } from '../model/NPC'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { consumeAlcohol, freshenUp } from './Effects'
import { makeScripts } from '../model/Scripts'
import {
  say, seq, random, when, cond,
  npcLeaveOption, option,
  addNpcStat, addStat,
  npcStat,
  timeLapse,
  learnNpcName,
  scene, scenes,
  branch, menu, exit,
  run,
} from '../model/ScriptDSL'

// Location definitions for the Copper Pot Tavern
const TAVERN_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  'copper-pot-tavern': {
    name: 'Copper Pot Tavern',
    description: 'A dimly lit establishment where workers and strangers alike seek refuge from the grime of Lowtown.',
    image: '/images/tavern.jpg',
    links: [
      { dest: 'lowtown', time: 2, travel: true, label: 'Exit to Street' }, // 2 minutes back to Lowtown
      { dest: 'tavern-ladies-bathroom', time: 1, label: 'Ladies' },
      {
        dest: 'tavern-gents-bathroom',
        time: 1,
        label: 'Gents',
        onFollow: (g: Game, _p: {}) => {
          g.add("You shouldn't be going in there... are you sure?")
          g.addOption('enterGentsBathroom', {}, 'Enter Gents')
          g.addOption('endScene', { text: 'You turn away.' }, 'Turn Away')
        },
      },
      { dest: 'tavern-cellars', time: 1, label: 'Cellars' },
    ],
    onArrive: (g: Game) => {
      g.getNPC('ivan-hess')
      g.getNPC('elvis-crowe')
      g.getNPC('jonny-elric')
    },
    activities: [
      {
        name: 'Hang at Bar',
        symbol: '🍺',
        script: (g: Game) => {
          g.run('wait', { minutes: 30 })
          // If no scene was triggered, add random flavor text
          if (!g.inScene) {
            g.run(random(
              'You lean against the bar and watch the regulars come and go. The steam from the still fills the air with a warm, yeasty scent.',
              'You find a quiet corner and observe the tavern\'s rhythm. Workers unwind after their shifts, sharing stories over pints.',
              'You sit at the bar, listening to the clink of glasses and the low murmur of conversations. The brass fixtures gleam in the dim light.',
              'You watch {npc(ivan-hess)} work behind the bar, {npc(ivan-hess):his} mechanical precision evident in every pour. The regulars nod in your direction.',
              'You take in the atmosphere — the worn wooden tables, the steam-powered taps, the sense of community among the patrons.',
            ))
          }
        },
        condition: (g: Game) => {
          const hour = g.hourOfDay
          return hour >= 15 || hour < 1 // (wraps around)
        },
      },
    ],
  },
  'tavern-ladies-bathroom': {
    name: 'Ladies Bathroom',
    description: 'A small, private restroom.',
    image: '/images/lowtown/ladies.jpg',
    links: [{ dest: 'copper-pot-tavern', time: 1 }],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
    ],
  },
  'tavern-gents-bathroom': {
    name: 'Gents Bathroom',
    description: 'The men\'s restroom.',
    image: '/images/lowtown/gents.jpg',
    links: [{ dest: 'copper-pot-tavern', time: 1 }],
    activities: [
      {
        name: 'Freshen Up',
        script: (g: Game) => freshenUp(g),
      },
    ],
  },
  'tavern-cellars': {
    name: 'Cellars',
    description: 'The tavern\'s storage cellars, stacked with barrels and crates.',
    image: '/images/lowtown/cellars.jpg',
    secret: true, // Starts as undiscovered
    links: [
      { dest: 'copper-pot-tavern', time: 1 },
      { dest: 'tavern-cupboard', time: 1, label: 'Cupboard' },
    ],
  },
  'tavern-cupboard': {
    name: 'Cupboard',
    description: 'A small storage cupboard.',
    image: '/images/lowtown/cupboard.jpg',
    secret: true, // Starts as undiscovered
    links: [{ dest: 'tavern-cellars', time: 1 }],
  },
}

// ============================================================================
// IVAN HESS — BARKEEPER
// ============================================================================

registerNPC('ivan-hess', {
  name: 'Ivan Hess',
  uname: 'barkeeper',
  description: 'The proprietor of the Copper Pot Tavern, a man who\'s seen decades of Lowtown\'s comings and goings. His mechanical arm moves with practiced precision as he polishes glasses and draws pints from the steam-powered taps. He keeps his own counsel but hears everything, and his guarded expression suggests he knows more about the neighborhood\'s secrets than he\'ll ever let on.',
  image: '/images/npcs/barkeep.jpg',
  speechColor: '#c4a35a',
  pronouns: PRONOUNS.he,
  faction: 'lowtown',

  onMove: (game: Game) => {
    const npc = game.getNPC('ivan-hess')
    npc.followSchedule(game, [[10, 2, 'copper-pot-tavern']])
  },

  onFirstApproach: seq(
    'A man with a huge moustache looks up from behind the bar, sizing you up with practised eyes. His mechanical arm whirs softly as he sets down a polished glass.',
    say('New in town, are you? After a drink? Or looking for something else?'),
    say("Either way, I'm your man. Ivan Hess at your service."),
    learnNpcName(),
    option('Buy a Drink (10 Kr)', 'buyDrink'),
    option('Just looking', 'onGeneralChat'),
    npcLeaveOption('You nod politely and step away from the bar.', 'Come back whenever you\'re thirsty.'),
  ),

  onApproach: (game: Game) => {
    const npc = game.npc

    // Greeting varies with trust
    game.run(cond(
      npcStat('affection', { min: 10 }),
      seq(
        'Ivan looks up as you approach and gives a small nod — the closest thing to warmth you\'ll get from him.',
        say('{pc}. The usual?'),
      ),
      npcStat('affection', { min: 5 }),
      seq(
        '{npc} wipes down the bar with a rag, then looks up. His expression is guarded but not unfriendly.',
        say('Ah, {pc}. What\'ll it be?'),
      ),
      seq(
        '{npc} wipes down the bar with a rag, then looks up.',
        say('What\'ll it be?'),
      ),
    ))

    npc.chat()
  },

  scripts: {
    // ----------------------------------------------------------------
    // NPC-LOCAL SCRIPTS — for {npc:scriptName} interpolation
    // ----------------------------------------------------------------

    /** Today's drink special — random flavour for atmosphere. */
    drinkOfTheDay: () => random(
      'a pint of Ironside Bitter',
      'a glass of Cogwheel Red',
      'a measure of Old Lowtown Reserve',
      'a mug of the house stout',
      'something amber he calls Steamblast',
    ),

    /** Gruff bartender wisdom — one-liners from behind the bar. */
    barWisdom: () => random(
      'Trust is earned one pint at a time.',
      'Everyone talks. The trick is knowing when to listen.',
      'Lowtown sorts itself out. Always has.',
      'A clean glass and a steady hand — that\'s all anyone can ask for.',
      'I\'ve outlasted every constable who\'s walked through that door.',
    ),

    /** Comment about whoever's in tonight — references other NPCs. */
    regularsComment: (game: Game) => {
      const elvis = game.npcs.get('elvis-crowe')
      const jonny = game.npcs.get('jonny-elric')
      const timmy = game.npcs.get('spice-dealer')
      const elvisHere = elvis?.location === 'copper-pot-tavern'
      const jonnyHere = jonny?.location === 'copper-pot-tavern'
      const timmyHere = timmy?.location === 'copper-pot-tavern'

      if (elvisHere && jonnyHere) {
        return `${elvis!.nameKnown > 0 ? 'Elvis' : 'The boss'} and ${jonny!.nameKnown > 0 ? 'Jonny' : 'his man'} are both in tonight. Best behaviour.`
      }
      if (elvisHere) {
        return `${elvis!.nameKnown > 0 ? 'Elvis Crowe' : 'That gangster'} is holding court in the corner. The usual crowd keeping their distance.`
      }
      if (jonnyHere) {
        return `${jonny!.nameKnown > 0 ? 'Jonny Elric' : 'That enforcer'} is drinking alone tonight. Don't stare.`
      }
      if (timmyHere) {
        return `${timmy!.nameKnown > 0 ? 'Timmy' : 'That dealer'} slipped in earlier. He thinks I don't notice, but I notice everything.`
      }
      return 'Quiet tonight. Just the regulars.'
    },

    // ----------------------------------------------------------------
    // CHAT MENU
    // ----------------------------------------------------------------

    onGeneralChat: seq(
      option('Buy a Drink (10 Kr)', 'buyDrink'),
      option('Ask for gossip', 'gossip'),
      option('Ask for work', 'work'),
      when(npcStat('affection', { min: 5 }),
        option('Ask about the regulars', 'askRegulars'),
      ),
      option('Leave', 'farewell'),
    ),

    farewell: seq(
      'You step away from the bar.',
      random(
        say("Don't be a stranger, {pc}."),
        say("Come back whenever you're thirsty."),
        say("Watch yourself out there."),
        when(npcStat('affection', { min: 20 }),
          say("Take care of yourself, {pc}. Lowtown's not kind after dark."),
        ),
        when(npcStat('affection', { min: 5 }),
          say("You're alright, {pc}. For a newcomer."),
        ),
      ),
    ),

    // ----------------------------------------------------------------
    // BUY A DRINK
    // ----------------------------------------------------------------

    buyDrink: (g: Game) => {
      const npc = g.npc
      const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
      if (crown < 10) {
        npc.say("You're short of krona, {pc}. Ten for a pint.")
        npc.chat()
        return
      }
      g.player.removeItem('crown', 10)
      consumeAlcohol(g, 35)
      g.run(addNpcStat('affection', 1, { max: 20, hidden: true }))

      g.run(cond(
        npcStat('affection', { min: 20 }),
        seq(
          '{npc} draws you a foaming pint without being asked — he already knows what you drink.',
          say("There you go, {pc}. Mind the fumes from the still — we like our ale strong here."),
        ),
        seq(
          'You hand over ten krona. Ivan draws you a foaming pint and slides it across the bar. You take a long drink.',
          say("There you go. Mind the fumes from the still — we like our ale strong here."),
        ),
      ))

      npc.chat()
    },

    // ----------------------------------------------------------------
    // GOSSIP — varies based on which NPCs the player knows
    // ----------------------------------------------------------------

    gossip: (g: Game) => {
      const npc = g.npc
      const elvis = g.npcs.get('elvis-crowe')
      const jonny = g.npcs.get('jonny-elric')
      const timmy = g.npcs.get('spice-dealer')

      // Build gossip from what Ivan's heard, referencing NPCs the player knows
      g.run(random(
        // Constables — always available
        seq(
          say('Word is the constables have been poking around the old mill again. Third time this month.'),
          say("They won't find anything. They never do."),
        ),
        // Elvis — by name if known
        seq(
          say(`${elvis && elvis.nameKnown > 0
            ? '{npc(elvis-crowe)} has been in a foul mood lately'
            : 'That gangster who drinks in the corner has been in a foul mood lately'
          }. I'd steer clear if I were you, {pc}.`),
        ),
        // Timmy — by name if known
        seq(
          say(`${timmy && timmy.nameKnown > 0
            ? '{npc(spice-dealer)} has been in twice this week'
            : 'That dealer has been in twice this week'
          }, which always means someone's looking for something.`),
          say("Beyond that, I keep my ears open and my mouth shut."),
        ),
        // Jonny — by name if known
        when(npcStat('affection', { min: 3 }),
          seq(
            say(`Between you and me, ${jonny && jonny.nameKnown > 0
              ? '{npc(jonny-elric)}'
              : 'that enforcer chap'
            } has been asking questions about the cellars. Don't know what {npc(jonny-elric):he}'s after.`),
          ),
        ),
      ))

      npc.chat()
    },

    // ----------------------------------------------------------------
    // WORK — washing glasses, a few krona, and Lowtown colour
    // ----------------------------------------------------------------

    work: (g: Game) => {
      const npc = g.npc
      const workCount = npc.stats.get('workCount') ?? 0

      if (workCount === 0) {
        // First time — Ivan sizes you up
        npc.say("I could use someone to wash glasses and help when it gets busy. Pays a few krona, and you'll hear things. Interested?")
        g.addOption('interact', { script: 'doWork' }, 'Roll up your sleeves')
        npc.leaveOption('You tell him you\'ll think about it.', "Fair enough. Offer stands.")
      } else {
        // Returning worker
        npc.say("Back for another shift, {pc}? Good. The glasses won't wash themselves.")
        g.addOption('interact', { script: 'doWork' }, 'Get to work')
        npc.leaveOption('You tell him not today.', "Suit yourself.")
      }
    },

    doWork: (g: Game) => {
      g.npc.stats.set('workCount', (g.npc.stats.get('workCount') ?? 0) + 1)

      g.run(scenes(
        // ── Stage 1: Getting started ──
        scene(
          'Ivan tosses you a rag and nods toward the stack of dirty glasses behind the bar.',
          say("Start with those. Hot water's in the copper — mind the valve, it sticks."),
          timeLapse(20),
          random(
            'You roll up your sleeves and get to work. The water is scalding, the soap smells of lye, and the glasses are sticky with spilt ale.',
            'You settle into a rhythm — dunk, scrub, rinse, rack. The hot water turns your hands red. Ivan nods approvingly.',
            'The first glass comes up gleaming. Ivan inspects it, grunts, and sets it on the shelf. High praise.',
          ),
        ),

        // ── Stage 2: The rush ──
        scene(
          timeLapse(30),
          'The door swings open and a crowd of dockworkers pours in, still grimy from the shift. The tavern fills up fast.',
          say("Here we go. Keep the glasses coming, {pc}."),
          random(
            seq(
              'A burly woman slams her fist on the bar and demands two pints. You pour them without spilling a drop.',
              say("Not bad. You might be useful after all."),
            ),
            seq(
              'Someone orders six ales at once. You line up the glasses while Ivan works the taps, his mechanical arm a blur of brass.',
              'For a moment you fall into perfect sync — pour, slide, pour, slide. Ivan almost smiles.',
            ),
            seq(
              'A young man tries to order something complicated. Ivan cuts him off.',
              say("We have ale, stout, and Steamblast. Pick one or get out."),
              'The man picks ale. Wise choice.',
            ),
            seq(
              'A woman with oil-stained hands waves you over. She wants to know what\'s good tonight.',
              'You glance at Ivan. He holds up a dark bottle.',
              say("Old Lowtown Reserve. Tell her it's on the house — she fixed my arm last week."),
            ),
          ),
          addStat('Perception', 1, { max: 20, chance: 0.3, hidden: true }),
        ),

        // ── Stage 3: Overheard at the bar ──
        scene(
          timeLapse(30),
          'The rush settles into a steady hum. You wipe down tables and collect empties, ears open.',
          random(
            // Gossip about other NPCs
            seq(
              'Two men in the corner are talking in low voices about a shipment coming in at the docks.',
              '"Elvis wants his cut by Friday," one mutters. "Or there\'ll be trouble."',
              'Ivan catches your eye from across the bar and gives the faintest shake of his head. Don\'t get involved.',
            ),
            seq(
              'A woman leans over to her companion. "Saw that enforcer — the one with the monocle — roughing up a stallholder at the market yesterday."',
              '"That\'s just how things work round here," her companion replies with a shrug.',
            ),
            seq(
              'A nervous-looking man slides onto a bar stool and glances around.',
              '"You selling?" he whispers to you.',
              'Before you can answer, Ivan appears at your shoulder.',
              say("She works here. You want that, try the alleys."),
              'The man leaves quickly.',
            ),
            seq(
              'A pair of regulars are arguing about whether the constables are getting bolder or just more desperate.',
              '"Raided the old mill again," one says. "Found nothing, as usual."',
              '"They never do," the other replies. "The real business is underground."',
            ),
            seq(
              'An old woman in the corner is telling a younger one about the city\'s golden age. "Before the machines took everything," she says. "When a person could earn a living with their hands."',
              'She catches you looking and raises her glass with a wry smile.',
            ),
          ),
        ),

        // ── Stage 4: Quiet spell ──
        scene(
          timeLapse(20),
          random(
            seq(
              'The crowd thins out. Ivan polishes a glass with slow, deliberate strokes.',
              say("You hear a lot, working a bar. Most of it's nonsense. The trick is knowing which bit isn't."),
            ),
            seq(
              'During a quiet moment, Ivan adjusts something in his mechanical arm with a small screwdriver. The joints click and settle.',
              say("Lost the real one in a press accident, twenty years back. This one's better. Doesn't complain, doesn't tire."),
              'He flexes the brass fingers. They move like the real thing, only smoother.',
            ),
            seq(
              'A lull. Ivan leans against the bar, staring at nothing in particular.',
              say("I've been behind this bar longer than most of these people have been alive. Seen Lowtown at its worst. This isn't it, not yet."),
              'He straightens up and starts wiping the taps. The moment passes.',
            ),
            seq(
              'The tavern is nearly empty. Somewhere the still gurgles to itself.',
              say("Most barkeepers talk too much. Fill the silence, make the customer feel welcome. I never saw the point."),
              'He glances at you.',
              say("You're alright, though, {pc}. You know when to keep quiet."),
            ),
          ),
          timeLapse(20),
        ),

        // ── Stage 5: End of shift ──
        scene(
          say("That'll do. Here."),
          run('gainItem', { item: 'crown', number: 8, text: 'Ivan counts out eight krona and slides them across the bar.' }),
          addNpcStat('affection', 2, { max: 15, hidden: true }),
          cond(
            npcStat('affection', { min: 10 }),
            seq(
              say("Good work tonight, {pc}. You're not bad company, either."),
              'He pours two short measures of something dark and pushes one toward you.',
              say("On the house. Don't tell anyone I'm going soft."),
            ),
            npcStat('affection', { min: 5 }),
            say("Decent work. You're picking it up. Come back whenever you need the krona."),
            say("You'll do. Same time next week if you want it."),
          ),
          npcLeaveOption('You dry your hands and step out from behind the bar.'),
        ),
      ))
    },

    // ----------------------------------------------------------------
    // ASK ABOUT THE REGULARS — unlocked at affection ≥ 5
    // Ivan talks about the tavern's notable patrons. References other
    // NPCs by name (via interpolation) if the player has met them.
    // ----------------------------------------------------------------

    askRegulars: (g: Game) => {
      g.run(addNpcStat('affection', 1, { max: 20, hidden: true }))

      g.add('You lean on the bar and ask Ivan about the people who drink here.')

      g.run(menu(
        branch('The boss in the corner',
          ...ivanOnElvis(g),
        ),
        branch('The enforcer',
          ...ivanOnJonny(g),
        ),
        branch('The dealer',
          ...ivanOnTimmy(g),
        ),
        exit('That\'s enough gossip',
          say("I've said too much already. Forget you heard any of it."),
          'He picks up a glass and starts polishing — conversation over.',
        ),
      ))
    },
  },
})

// ----------------------------------------------------------------
// IVAN'S COMMENTARY ON OTHER NPCS
// These return SceneElement arrays for spreading into branches.
// ----------------------------------------------------------------

function ivanOnElvis(g: Game) {
  const elvis = g.npcs.get('elvis-crowe')
  const known = elvis && elvis.nameKnown > 0
  return [
    say(known
      ? '{npc(elvis-crowe)}? {npc(elvis-crowe):He} owns this place. Well — {npc(elvis-crowe):he} owns everything in Lowtown, if you ask the right people.'
      : "The big man in the corner? He owns this place. Well — he owns everything in Lowtown, if you ask the right people."
    ),
    say("I pour his drinks and keep my opinions to myself. That's the arrangement."),
    cond(
      npcStat('affection', { min: 10 }),
      say("Between you and me, {pc} — he's not as untouchable as he thinks. But you didn't hear that from me."),
      say("Best you do the same."),
    ),
  ]
}

function ivanOnJonny(g: Game) {
  const jonny = g.npcs.get('jonny-elric')
  const known = jonny && jonny.nameKnown > 0
  return [
    say(known
      ? "{npc(jonny-elric)}. Sharp dresser. Sharper temper. {npc(jonny-elric):He}'s the muscle around here."
      : "That one with the monocle? He's the muscle around here."
    ),
    say("Comes in most evenings, drinks alone, watches the room. The kind of man who counts exits."),
    cond(
      npcStat('affection', { min: 10 }),
      say("{npc(jonny-elric):He}'s ambitious, that one. Loyalty only runs so deep when you think you could do the job better. Watch yourself around {npc(jonny-elric):him}, {pc}."),
      say("I'd tread carefully, if I were you."),
    ),
  ]
}

function ivanOnTimmy(g: Game) {
  const timmy = g.npcs.get('spice-dealer')
  const known = timmy && timmy.nameKnown > 0
  return [
    say(known
      ? '{npc(spice-dealer)}. Poor sod. Lost his dock job, lost his hand, ended up dealing spice to make ends meet.'
      : "That twitchy fellow with the mechanical hand? He's a dealer. Spice, mostly."
    ),
    say("He's not a bad lad, just got dealt a bad hand. No pun intended."),
    cond(
      npcStat('affection', { min: 10 }),
      seq(
        say("He looks after people, in his way. The ones who fall through the cracks."),
        say("I keep a tab for him when he can't pay. Don't tell anyone I said that."),
      ),
      say("I don't judge. Not my place."),
    ),
  ]
}

// Tavern scripts
const tavernScripts = {
  enterGentsBathroom: (g: Game, _params: {}) => {
    // Clear the scene first
    g.clearScene()
    // Move directly using move (bypasses onFollow) and handle time/discovery manually
    g.timeLapse(1)
    const gentsLocation = g.getLocation('tavern-gents-bathroom')
    g.run('move', { location: 'tavern-gents-bathroom' })
    gentsLocation.discovered = true
    // Run onArrive if it exists
    const def = gentsLocation.template
    if (def.onArrive) {
      g.run(def.onArrive)
    }
  },
}
makeScripts(tavernScripts)

// Register all location definitions when module loads
Object.entries(TAVERN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
