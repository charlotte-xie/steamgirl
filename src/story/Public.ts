import { Game } from '../model/Game'
import { makeScripts, type Script } from '../model/Scripts'
import { calcBaseImpression } from '../model/Impression'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import {
  text, random, seq, scenes, scene, move,
  ejectPlayer, addStat, time,
  branch, choice, skillCheck,
} from '../model/ScriptDSL'

// ── Generic indecency helpers ────────────────────────────────────────────

/**
 * Returns a `checkAccess` function that blocks access when decency is below
 * the given threshold. Use on links or activities.
 */
export function decencyCheck(threshold: number, message: string) {
  return (game: Game): string | null => {
    const d = calcBaseImpression(game, 'decency')
    return d < threshold ? message : null
  }
}

/**
 * Returns an `onArrive` script for upscale venues. If decency is below
 * the threshold, shows a random refusal text and ejects the player.
 */
export function staffDecencyGate(threshold: number, ejectTo: string, texts: string[]) {
  return (game: Game) => {
    const d = calcBaseImpression(game, 'decency')
    if (d >= threshold) return
    game.run(seq(random(...texts.map(t => text(t))), ejectPlayer(ejectTo)))
  }
}

/**
 * Returns an `onTick` script for dangerous areas (no police presence).
 * If the player is indecent during active hours, there is a chance of
 * attracting unwanted attention from bad characters.
 */
export function dangerousIndecency(startHour: number, endHour: number): Script {
  return (game: Game) => {
    const hour = game.hourOfDay
    if (hour < startHour || hour >= endHour) return

    const decency = calcBaseImpression(game, 'decency')
    if (decency >= 40) return

    // ~30% chance per 10-minute chunk
    if (Math.random() > 0.3) return

    game.run('dangerousApproach')
  }
}

// ── Police station locations ─────────────────────────────────────────────

const POLICE_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  'police-station': {
    name: 'Police Station',
    description: 'The front desk of the Aetheria constabulary. A long wooden counter separates you from the officers. Wanted posters and duty rosters plaster the walls.',
    image: '/images/police/station.webp',
    private: true,
    secret: true,
  },
  'police-cell': {
    name: 'Holding Cell',
    description: 'A small, cold cell with a hard bench and a barred window too high to see out of. The walls are scratched with the marks of previous occupants.',
    image: '/images/police/cell.webp',
    private: true,
    secret: true,
  },
  'police-interrogation': {
    name: 'Interrogation Room',
    description: 'A bare room with a single table and two chairs. A gas lamp hangs low overhead, casting harsh shadows. The door has no handle on the inside.',
    image: '/images/police/interrogation.webp',
    private: true,
    secret: true,
  },
  'sergeants-office': {
    name: 'Sergeant\'s Office',
    description: 'A cramped office piled with case files and carbon-copied forms. A brass nameplate on the desk reads SGT. HARGREAVES. Tea stains ring the blotter.',
    image: '/images/police/sergeant.webp',
    private: true,
    secret: true,
  },
  'constables-office': {
    name: 'Chief Constable\'s Office',
    description: 'A large, imposing office with dark wood panelling and a portrait of the King above the mantelpiece. The desk is immaculate. You are not welcome here.',
    image: '/images/police/office.webp',
    private: true,
    secret: true,
  },
}

Object.entries(POLICE_DEFINITIONS).forEach(([id, def]) => registerLocation(id, def))

// ── Public area checks ───────────────────────────────────────────────────

// -- Warning tier (decency 30–39): constable tells you off ----------------

const warningApproach = random(
  text('A constable appears from around the corner and fixes you with a stern look. He plants himself in your path, one hand raised. "Now then. What do you think you\'re doing out here like that?"'),
  text('A beat constable blows his whistle sharply and marches over, truncheon swinging at his hip. "Oi! You can\'t go about like that. This is a public street, not a bathhouse."'),
  text('A policeman steps out of a doorway and blocks your way. His moustache bristles with disapproval. "Right. I don\'t know what you think you\'re playing at, miss, but this isn\'t acceptable."'),
  text('You hear heavy boots behind you. A constable falls into step beside you and clears his throat pointedly. "I\'m going to have to ask you to sort yourself out, miss. You\'re causing a disturbance."'),
)

const warningApologise = random(
  text('You hurry away, face burning. Behind you, the constable shakes his head and resumes his patrol.'),
  text('You duck around the nearest corner, heart hammering. A few passers-by glance your way with raised eyebrows.'),
  text('You mumble an apology and retreat. The constable watches you go, arms folded, until you\'re out of sight.'),
)

const warningCharmSuccess = random(
  text('The constable narrows his eyes, but something in your manner gives him pause. He sighs. "Just... sort yourself out, miss. I don\'t want to see you like this again." He tips his hat stiffly and moves on.'),
  text('He studies you for a long moment, then exhales through his nose. "You\'ve got some nerve, I\'ll give you that. But I\'m letting you off with a warning. Don\'t push your luck."'),
  text('"Hmph." The constable tugs at his collar, looking uncomfortable. "Well. See that you do something about it. Quickly." He turns on his heel and walks away, muttering to himself.'),
)

const warningCharmFailure = seq(
  random(
    text('"Don\'t try that with me, miss." The constable\'s expression hardens. "I\'ve heard every excuse in the book. Move along before I change my mind about that caution."'),
    text('"Save your breath." He takes you firmly by the elbow and steers you toward the edge of the street. "I said move along. Now."'),
    text('His face doesn\'t flicker. "I\'m not interested. You can either leave under your own steam or I can escort you. Your choice — and you\'ve got about three seconds."'),
  ),
  addStat('Mood', -3),
)

// -- Severe tier (decency 0–29): serious consequences --------------------

const severeApproach = random(
  text('A sharp whistle blast cuts through the air. Two constables converge on you from opposite directions, faces rigid with outrage. The senior one seizes your arm. "Public indecency is a criminal offence, miss."'),
  text('A policeman rounds the corner and stops dead. His mouth falls open for a moment before professional instinct takes over. He grabs your wrist. "You\'re coming with me. Right now."'),
  text('You hear running footsteps. A red-faced constable pushes through the gathering crowd, his whistle still clenched between his teeth. "Don\'t move! Stay right there!" He catches your arm. "Disgraceful. Absolutely disgraceful."'),
  text('A constable appears so suddenly you nearly walk into him. He takes one look at you and his hand closes around your upper arm like a vice. "Right. That\'s quite enough of that."'),
)

// Path A: Police station
const stationScene = scenes(
  scene(
    random(
      text('The constable marches you through the streets. People stop and stare. A woman covers her child\'s eyes. You have never wanted the ground to swallow you more.'),
      text('You are frogmarched down the pavement, the constable\'s grip unyielding. Passers-by part like water. Someone laughs. Someone else gasps. You keep your eyes on the cobblestones.'),
    ),
  ),
  scene(
    move('police-station'),
    random(
      text('The desk sergeant looks up, takes in the situation, and reaches for a form without a word. "Name?" He doesn\'t wait for you to answer before writing something down. "Public indecency. Section fourteen." A younger officer is sent to fetch a blanket.'),
      text('Inside the station, a sergeant writes your name in a ledger with excruciating slowness. "Public indecency. Section fourteen." He looks at you over his spectacles. "You\'ll be here a while." He nods to an officer who leads you away.'),
    ),
  ),
  scene(
    move('police-cell'),
    random(
      text('The cell door clangs shut behind you. The bench is hard and cold. Through the bars you can hear officers talking, a typewriter clacking, someone else being booked. Time passes with agonising slowness.'),
      text('You sit on the hard bench, a scratchy blanket around your shoulders. The cell smells of disinfectant and misery. Somewhere down the corridor, a drunk is singing. The gas lamp flickers overhead.'),
    ),
    time(60),
    addStat('Mood', -5),
  ),
  scene(
    move('sergeants-office'),
    random(
      text('A sergeant sits you down across from his cluttered desk. He lectures you at length about public decency, civic responsibility, and the penalties for a second offence. You stare at the tea stains on his blotter and try to disappear.'),
      text('"Do you understand the seriousness of what you\'ve done?" The sergeant peers at you over a stack of case files. He makes you sign a caution form, then a carbon copy, then another copy. The pen scratches loudly in the silence.'),
    ),
    time(60),
    addStat('Mood', -5),
  ),
  scene(
    random(
      text('Eventually they let you go. The desk sergeant hands you a carbon-copied form. "Next time it\'s a court summons." The door closes behind you and you are back on the street, rattled and humiliated.'),
      text('"Consider yourself lucky," the constable says, holding the station door open. "I could have had you before a magistrate." You step out into the daylight, the caution form crumpling in your fist.'),
    ),
    ejectPlayer('stairwell'),
  ),
)

// Path B: Coat and escort home
const escortScene = scenes(
  scene(
    random(
      text('The constable pauses, then sighs heavily. He unbuttons his coat and drapes it around your shoulders. It smells of wool and tobacco. "Come on, miss. Let\'s get you home before this gets any worse."'),
      text('Something in your expression gives the constable pause. He looks around at the gathering onlookers, then shrugs off his overcoat and wraps it around you. "Right. Where do you live? And don\'t try anything clever."'),
    ),
  ),
  scene(
    random(
      text('He walks you through the streets in silence, one hand on your shoulder, steering you like a wayward child. People stare. A newspaper seller nudges his companion and points. The walk feels endless.'),
      text('The constable escorts you at a brisk pace, his coat engulfing you. Every face you pass seems to be watching. A woman tuts loudly. A man in a top hat averts his gaze. You have never been so aware of every pair of eyes in the city.'),
    ),
    time(30),
    addStat('Mood', -5),
    ejectPlayer('stairwell'),
  ),
  scene(
    random(
      text('At the door of your lodgings, the constable takes his coat back and buttons it up. "Sort yourself out, miss. I won\'t be so understanding next time." He touches his helmet and walks away.'),
      text('The constable retrieves his coat with a stiff nod. "I don\'t want to see you out like that again. Next time, it\'s the station. No arguments." He turns on his heel and you are left standing in the stairwell, shaking.'),
    ),
  ),
)

// ── Dangerous area encounter ─────────────────────────────────────────────

const dangerousApproachText = random(
  text('A rough-looking man detaches himself from a doorway and saunters toward you, eyes travelling up and down with undisguised interest. "Well, well. What have we here?"'),
  text('Two men loitering by a lamp post nudge each other and start walking your way. The taller one grins unpleasantly. "You lost, sweetheart? Dressed like that round here?"'),
  text('A figure steps out of the shadows ahead of you, blocking the narrow street. He cracks his knuckles slowly. "Bit bold, aren\'t you? Walking around like that in this part of town."'),
  text('You catch movement in the corner of your eye. A wiry man with a scarred lip falls into step beside you, too close. "Interesting look you\'ve got there. Brave choice for these streets."'),
)

const dangerousEscape = random(
  text('You quicken your pace and duck around a corner. Footsteps follow for a moment, then fade. Your heart is hammering.'),
  text('You turn sharply and walk the other way, fast. A coarse laugh follows you but no one gives chase. This time.'),
  text('You break into a run. Behind you, someone shouts something crude, but the footsteps don\'t follow. You don\'t stop until you\'re well clear.'),
)

const dangerousEscapeFail = seq(
  random(
    text('A hand catches your sleeve and yanks you back. "Not so fast." Rough fingers dig into your arm. By the time you wrench free, your coin purse feels lighter.'),
    text('You try to slip away but someone grabs your shoulder from behind. There\'s a brief, ugly struggle before they shove you against a wall and you feel a hand in your pocket. Then they\'re gone.'),
  ),
  addStat('Mood', -5),
)

const dangerousStandSuccess = random(
  text('You meet his gaze steadily and don\'t flinch. Something in your expression gives him pause. He holds up his hands with a mocking smile. "All right, all right. No harm meant." He backs off, but his eyes linger.'),
  text('"I\'d think carefully about your next move," you say, keeping your voice level. He blinks, reassesses, then shrugs. "Suit yourself." He melts back into the shadows.'),
)

const dangerousStandFail = seq(
  random(
    text('"Oh, she\'s got spirit." He laughs and moves closer. You stand your ground but there\'s nowhere to go. By the time he loses interest and swaggers away, you\'re shaking and your purse is gone.'),
    text('Your bravado doesn\'t impress him. He crowds you against the wall, breath hot and sour on your face. "Brave little thing." When he finally leaves, your pockets are empty and your nerves are shot.'),
  ),
  addStat('Mood', -8),
)

makeScripts({
  dangerousApproach: (g: Game) => {
    g.run(dangerousApproachText)
    g.run(choice(
      branch('Try to get away',
        skillCheck('Agility', 20,
          dangerousEscape,
          dangerousEscapeFail,
        ),
      ),
      branch('Stand your ground',
        skillCheck('Charm', 30,
          dangerousStandSuccess,
          dangerousStandFail,
        ),
      ),
    ))
  },

  policemanWarning: (g: Game) => {
    g.run(warningApproach)
    g.run(choice(
      branch('Apologise and hurry away',
        warningApologise,
        addStat('Mood', -2),
      ),
      branch('Try to talk your way out',
        skillCheck('Charm', 30,
          warningCharmSuccess,
          warningCharmFailure,
        ),
      ),
    ))
  },

  policemanSevere: (g: Game) => {
    g.run(severeApproach)
    if (Math.random() < 0.5) {
      g.run(stationScene)
    } else {
      g.run(escortScene)
    }
  },

  policemanIndecency: (g: Game) => {
    const decency = calcBaseImpression(g, 'decency')
    if (decency < 30) {
      g.run('policemanSevere')
    } else {
      g.run('policemanWarning')
    }
  },
})

/**
 * Returns an onTick script for public locations. Checks for indecency during
 * busy hours and triggers a policeman encounter.
 *
 * @param startHour - Hour when the area becomes busy (e.g. 8)
 * @param endHour - Hour when the area empties out (e.g. 20)
 */
export function publicChecks(startHour: number, endHour: number): Script {
  return (game: Game) => {
    const hour = game.hourOfDay
    if (hour < startHour || hour >= endHour) return

    // Indecency: decency < 40 in a public place during busy hours
    const decency = calcBaseImpression(game, 'decency')
    if (decency >= 40) return

    // ~50% chance per 10-minute chunk
    if (Math.random() > 0.5) return

    game.run('policemanIndecency')
  }
}
