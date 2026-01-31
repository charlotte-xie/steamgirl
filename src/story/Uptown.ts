import { Game } from '../model/Game'
import { makeScripts } from '../model/Scripts'
import type { Hairstyle } from '../model/Player'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { script, seq, scenes, random, text, time, cond, not, and, hourBetween, locationDiscovered, skillCheck, discoverLocation, run, indecent, ejectPlayer } from '../model/ScriptDSL'
import { applyRelaxation } from './Effects'
import { publicChecks, staffDecencyGate } from './Public'

// -- Salon scripts ----------------------------------------------------------

const STYLE_COST = 100

type StyleOption = {
  id: Hairstyle
  label: string
  description: string
  result: string
  quote: string
  refresh: string
}

const STYLES: StyleOption[] = [
  {
    id: 'buns',
    label: 'Buns',
    description: 'A pair of neat buns, pinned high — classic and refined.',
    result: 'Madame Voss works your hair into a pair of neat buns, pinned high and secured with tiny brass clasps. She tilts your chin toward the mirror with one finger.',
    quote: '"Classic. Refined. You could walk into any drawing room in Aetheria and turn heads."',
    refresh: 'Madame Voss unpins your buns, brushes your hair through with long, careful strokes, and pins them up again — tighter, neater, every strand in its place. "There. Good as new, dear."',
  },
  {
    id: 'ponytail',
    label: 'Ponytail',
    description: 'A long, smooth ponytail secured with dark silk — simple and modern.',
    result: 'Madame Voss unpins your hair with practised fingers and draws it back into a long, smooth ponytail, secured with a ribbon of dark silk. She turns you to face the mirror.',
    quote: '"There. Simple, elegant, modern. You look like a different girl."',
    refresh: 'Madame Voss loosens your ponytail, works a scented oil through the length of your hair, and draws it back smooth and gleaming. She ties it off with a fresh ribbon. "Silk makes all the difference."',
  },
]

function addSalonOptions(g: Game) {
  const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
  const canAfford = crown >= STYLE_COST
  g.add(`Madame Voss gestures to a chart of styles on the wall. "A hundred crowns for any style, dear. What takes your fancy?"`)
  for (const style of STYLES) {
    const current = style.id === g.player.hairstyle
    const label = current
      ? `${style.label} — refresh (${STYLE_COST} Kr)`
      : `${style.label} (${STYLE_COST} Kr)`
    if (canAfford) {
      g.addOption(['salonStyle', { style: style.id }], label)
    } else {
      g.scene.options.push({ type: 'button', action: '', label, disabled: true })
    }
  }
  g.addOption('salonBrowse', 'Just browsing')
}

makeScripts({
  salonDecencyCheck: (g: Game) => {
    g.run(cond(
      indecent(40),
      scenes(
        random(
          text('Every head in the salon turns. Madame Voss takes one look at you and her expression hardens. "Out. Now. I will not have this establishment made a spectacle." She steps from behind the counter and physically steers you toward the door. "Come back when you are dressed like a civilised person."'),
          text('Madame Voss spots you from across the salon. Her face goes white with outrage. "Absolutely not. Get out of my salon this instant." She snaps her fingers and her apprentice hurries to hold the door open. "You are not setting foot in here dressed like that. Have you no shame?"'),
        ),
        seq(ejectPlayer('uptown'), text('You stand on the pavement outside, the salon door firmly shut behind you. A passing couple give you a wide berth.')),
      ),
      indecent(60),
      scenes(
        random(
          text('Madame Voss looks you over from behind the counter. Her gaze lingers on your attire, and her lips thin. "I\'m afraid I cannot receive you like this, dear. This is a respectable establishment. Do come back when you are properly dressed."'),
          text('Madame Voss glances up as you enter, and her welcoming smile fades. She sets down her hairpins and approaches you quietly. "I\'m sorry, dear, but I really can\'t have you in the salon like this. My clients expect a certain standard. Come back when you\'ve sorted yourself out, hmm?"'),
        ),
        seq(ejectPlayer('uptown'), text('You find yourself back on the street, the salon\'s frosted glass door closing quietly behind you.')),
      ),
    ))
  },
  salonMenu: (g: Game) => {
    addSalonOptions(g)
  },
  salonBrowse: (g: Game) => {
    g.run(random(
      text('You browse the salon\'s display of hairpins, combs, and ornamental clips. Some are set with tiny gems that catch the lamplight. Madame Voss watches you with quiet amusement.'),
      text('A chart on the wall shows a dozen hairstyles, each illustrated in meticulous detail with names like "The Empress" and "The Aviatrix". Some are marked as requiring appointments.'),
      text('You examine a shelf of bottled tonics and tinctures — hair oil, rosewater rinse, something labelled "Voss\'s Patent Volumiser" in elegant script.'),
    ))
    g.timeLapse(5)
  },
  salonStyle: (g: Game, params: { style?: string }) => {
    const style = STYLES.find(s => s.id === params.style)
    if (!style) return
    const refresh = g.player.hairstyle === style.id
    g.player.removeItem('crown', STYLE_COST)
    g.player.hairstyle = style.id
    g.player.setTimer('lastHairstyle', g.time)
    g.timeLapse(120)
    if (refresh) {
      g.add(style.refresh)
    } else {
      g.add(style.result)
      g.add(style.quote)
    }
    g.run('addStat', { stat: 'Mood', change: 5, max: 90 })
  },
})

// -- Indecency gates for upscale venues ------------------------------------

const cafeGate = staffDecencyGate(50, 'uptown', [
  'The café hostess takes one look at you and positions herself squarely in the doorway. "I\'m sorry, but The Gilt Lily has a dress code. You\'ll need to come back properly attired."',
  'A waiter intercepts you before you can take a seat. "I\'m afraid we can\'t have you in here like that, miss. Our clientele expect a certain standard."',
])

const arcadeGate = staffDecencyGate(40, 'uptown', [
  'A shopkeeper steps out from behind her counter as you enter the arcade. "Excuse me, miss — you can\'t walk around in here like that. You\'re disturbing the customers."',
  'The arcade\'s uniformed attendant hurries over, looking pained. "I\'m going to have to ask you to leave, miss. We have a reputation to maintain."',
])

const UPTOWN_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  uptown: {
    name: 'Uptown',
    description: 'The fashionable quarter of Aetheria, where brass gleams brighter and the air smells of perfume and polished leather.',
    image: '/images/uptown/uptown.webp',
    mainLocation: true,
    secret: true,
    links: [
      { dest: 'default', time: 10 },
      { dest: 'school', time: 10 },
      { dest: 'uptown-cafe', time: 2, label: 'Café' },
      { dest: 'uptown-arcade', time: 2, label: 'Arcade' },
      { dest: 'uptown-salon', time: 2, label: 'Salon' },
      { dest: 'uptown-clinic', time: 2, label: 'Clinic' },
    ],
    onFirstArrive: (g: Game) => {
      g.add('The streets are wider here, the buildings taller and better kept. Brass lanterns line the pavements, and the shop windows display things you\'ve never seen before — or never thought you could afford. The people walk differently in Uptown. Unhurried. Certain.')
    },
    onArrive: (g: Game) => {
      g.run(random(
        text('The broad avenues of Uptown hum with quiet prosperity. Well-dressed citizens stroll past boutiques and tea rooms.'),
        text('A steam-carriage glides past, its brass fittings polished to a mirror finish. The driver tips his hat to no one in particular.'),
        text('The air is different here — cleaner, scented with something floral. Gas lamps burn with a steady, expensive flame.'),
      ))
    },
    activities: [
      {
        name: 'Explore',
        script: script(
          time(8),
          cond(
            and(not(locationDiscovered('uptown-cafe')), skillCheck('Perception', 0)),
            discoverLocation('uptown-cafe', 'You notice a charming café tucked behind a row of ornamental steam-trees, its windows fogged with warmth. A brass sign reads: The Gilt Lily.', '#3b82f6'),
            and(not(locationDiscovered('uptown-arcade')), skillCheck('Perception', 0)),
            discoverLocation('uptown-arcade', 'A grand glass-roofed arcade stretches between two boulevards, its ironwork arches glinting in the light. Inside, boutiques and curiosity shops beckon.', '#3b82f6'),
            and(not(locationDiscovered('uptown-salon')), skillCheck('Perception', 0)),
            discoverLocation('uptown-salon', 'A discreet brass plaque beside an elegant doorway reads: Madame Voss — Coiffure & Beautification. Through the frosted glass, you glimpse velvet chairs and gleaming mirrors.', '#3b82f6'),
            and(not(locationDiscovered('uptown-clinic')), skillCheck('Perception', 0)),
            discoverLocation('uptown-clinic', 'A polished door of dark wood bears a small engraved sign: Dr. Harland — Physician & Surgeon. The windows are spotless, the curtains drawn.', '#3b82f6'),
            // Morning
            hourBetween(6, 12),
            random(
              text('Morning light catches the brass guttering and turns the rooftops gold. Servants polish doorsteps and shake out rugs from upper windows.'),
              text('A florist arranges hothouse blooms in a window display. The mechanical watering system behind her mists the air with fine droplets.'),
              text('A pair of university students hurry past with leather satchels, cutting through Uptown on their way to lectures.'),
            ),
            // Afternoon
            hourBetween(12, 18),
            random(
              text('The afternoon promenade is in full swing. Ladies with parasols and gentlemen in top hats make a slow circuit of the boulevard.'),
              text('A clockwork street musician plays a passable waltz on a brass violin. A small crowd has gathered, more out of curiosity than appreciation.'),
              text('You pass a tailor\'s window where a mechanical mannequin turns slowly, displaying a coat that probably costs more than a month\'s rent.'),
            ),
            // Evening
            hourBetween(18, 22),
            random(
              text('The gas lamps of Uptown glow warm amber, casting long shadows across the clean pavements. Laughter and the clink of glasses drift from open windows.'),
              text('A horse-drawn carriage rattles past, its occupants heading to some soirée or another. The horses wear brass blinkers that gleam in the lamplight.'),
              text('The evening air carries the scent of roasting coffee and expensive tobacco. Somewhere nearby, a piano plays.'),
            ),
            // Night
            seq(
              random(
                text('Uptown at night is quiet but not deserted. A constable walks his beat with measured tread, nodding to the occasional late stroller.'),
                text('The boulevard is empty save for the glow of gas lamps and the distant clatter of a steam-carriage. Even the silence here feels expensive.'),
                text('A cat with a brass collar watches you from a windowsill. In Uptown, even the strays have standards.'),
              ),
              run('wait', { minutes: 15 }),
            ),
          ),
        ),
      },
    ],
    onTick: publicChecks(8, 22),
  },

  'uptown-cafe': {
    name: 'The Gilt Lily',
    description: 'A fashionable café where the city\'s well-to-do gather over expensive coffee and small talk.',
    image: '/images/uptown/cafe.webp',
    secret: true,
    links: [
      { dest: 'uptown', time: 2 },
    ],
    onFirstArrive: (g: Game) => {
      cafeGate(g)
      if (g.currentLocation !== 'uptown-cafe') return
      g.add('The café is all polished wood, etched glass, and the rich smell of coffee. Small brass tables crowd the floor, each occupied by someone who looks like they belong. A mechanical coffee engine hisses and gurgles behind the counter, tended by a woman with sharp eyes and a sharper smile.')
    },
    onArrive: (g: Game) => {
      cafeGate(g)
      if (g.currentLocation !== 'uptown-cafe') return
      g.run(random(
        text('The Gilt Lily is busy today. Conversation hums beneath the clink of porcelain and the steady hiss of the coffee engine.'),
        text('A waiter navigates the crowded tables with mechanical precision, balancing a brass tray of tiny pastries.'),
        text('The café smells of coffee, cardamom, and ambition. Everyone here is watching everyone else.'),
      ))
    },
    activities: [
      {
        name: 'Have Coffee (3 Kr)',
        script: (g: Game) => {
          const crown = g.player.inventory.find((i) => i.id === 'crown')?.number ?? 0
          if (crown < 3) {
            g.add('You can\'t afford the coffee here. The waiter gives you a look that suggests loitering is not appreciated.')
            return
          }
          g.player.removeItem('crown', 3)
          g.add('You order a coffee. It arrives in a brass-rimmed cup, dark and strong and impossibly smooth. This is not the watered-down stuff they serve in Lowtown.')
          g.run('addStat', { stat: 'Mood', change: 3, max: 85 })
          g.timeLapse(15)
        },
      },
      {
        name: 'Relax',
        script: (g: Game) => {
          g.add('You settle into a corner seat and let the warmth and chatter wash over you. Nobody bothers you. In the Gilt Lily, minding your own business is an art form.')
          g.run('wait', { minutes: 30 })
          g.run('addStat', { stat: 'Mood', change: 2, max: 80 })
          applyRelaxation(g, 30, 1.0)
        },
      },
    ],
  },

  'uptown-arcade': {
    name: 'The Brass Arcade',
    description: 'A glass-roofed shopping arcade lined with boutiques, curiosity shops, and the occasional fortune teller.',
    image: '/images/uptown/arcade.webp',
    secret: true,
    links: [
      { dest: 'uptown', time: 2 },
    ],
    onFirstArrive: (g: Game) => {
      arcadeGate(g)
      if (g.currentLocation !== 'uptown-arcade') return
      g.add('The arcade is a cathedral of commerce — a long gallery of iron and glass, with shops lining both sides and a vaulted roof that lets in pale, filtered light. Brass railings and ornamental clockwork decorate every surface. The air smells of leather, perfume, and new money.')
    },
    onArrive: (g: Game) => {
      arcadeGate(g)
      if (g.currentLocation !== 'uptown-arcade') return
      g.run(random(
        text('The Brass Arcade is alive with shoppers, browsers, and idlers. Mechanical window displays rotate and whir, competing for attention.'),
        text('A fortune-telling automaton beckons from a glass booth, its brass hand crooked invitingly. A small queue has formed.'),
        text('Sunlight filters through the glass roof, catching dust motes and making the whole arcade shimmer like the inside of a jewellery box.'),
      ))
    },
    activities: [
      {
        name: 'Window Shop',
        script: (g: Game) => {
          g.run(random(
            text('You browse the boutiques. The prices are eye-watering, but the craftsmanship is exquisite. A mechanical music box plays a tinkling melody as you pass.'),
            text('A milliner\'s window displays hats so elaborate they border on architectural. One has a functioning miniature steam engine on the brim.'),
            text('You linger at a jeweller\'s display. Brass and copper filigree, set with tiny crystals that catch the light. Beautiful and completely out of reach.'),
            text('A bookshop catches your eye. The volumes in the window are leather-bound and gold-stamped, nothing like the dog-eared penny dreadfuls in Lowtown.'),
          ))
          g.timeLapse(10)
        },
      },
      {
        name: 'Explore',
        script: script(
          time(10),
          random(
            text('You wander the length of the arcade, taking in the sights. A perfumier offers you a sample — something floral and sharp that makes your head swim.'),
            text('You stop to watch a clockmaker at work through his shop window. His hands move with mesmerising precision among the tiny gears.'),
            text('A portrait photographer has set up a mechanical camera in the arcade. For a fee, he\'ll capture your likeness on a brass-backed plate.'),
            text('You pass a curiosity shop crammed with oddities — a preserved coelacanth, a compass that points to the nearest source of aether, a jar of something that glows faintly blue.'),
          ),
        ),
      },
    ],
  },

  'uptown-salon': {
    name: 'Madame Voss\'s Salon',
    description: 'An elegant salon where Uptown\'s fashionable set come to be coiffed, curled, and made presentable.',
    image: '/images/uptown/salon.webp',
    secret: true,
    links: [
      { dest: 'uptown', time: 2 },
    ],
    onFirstArrive: (g: Game) => {
      g.run('salonDecencyCheck')
      if (g.inScene) return
      g.add('The salon is a haven of velvet and vanity. Gilt-framed mirrors line the walls, reflecting a dozen versions of yourself back at you. The air is thick with the scent of rosewater and heated tongs. A woman with silver-streaked hair and immaculate posture looks you over from behind the counter.')
      g.add('"Welcome, dear. I am Madame Voss. Sit — let me see what we have to work with."')
    },
    onArrive: (g: Game) => {
      g.run('salonDecencyCheck')
      if (g.inScene) return
      g.run(random(
        text('Madame Voss is attending to a client, pinning an elaborate updo into place with brass clips. She acknowledges you with a nod.'),
        text('The salon hums with quiet conversation. A mechanical hair-dryer whirs softly in the corner, its brass nozzle shaped like a swan\'s neck.'),
        text('A young apprentice sweeps clippings from the chequered floor while Madame Voss examines a tray of ornamental hairpins.'),
      ))
    },
    activities: [
      {
        name: 'See Madame Voss',
        script: 'salonMenu',
      },
    ],
  },

  'uptown-clinic': {
    name: 'Dr. Harland\'s Clinic',
    description: 'A private medical practice with spotless floors and the faint smell of antiseptic.',
    image: '/images/uptown/clinic.webp',
    secret: true,
    links: [
      { dest: 'uptown', time: 2 },
    ],
    onFirstArrive: (g: Game) => {
      g.add('The clinic is immaculate — white tile, polished brass fittings, and the sharp scent of carbolic soap. A reception desk of dark wood dominates the entrance. Behind it sits a young woman in a starched collar, writing in a leather-bound ledger.')
      g.add('"Good day. I\'m afraid Dr. Harland is away on business at present. I can take your name if you\'d like to be notified when he returns."')
    },
    onArrive: (g: Game) => {
      g.run(random(
        text('The receptionist looks up from her ledger. "I\'m afraid the doctor is still away. We expect him back soon, but I couldn\'t say exactly when."'),
        text('The waiting room is empty. A mechanical clock on the wall ticks with surgical precision. The receptionist offers you a polite, practised smile.'),
        text('A brass plaque on the wall lists Dr. Harland\'s qualifications in small, precise lettering. The receptionist is sorting correspondence.'),
      ))
    },
    activities: [
      {
        name: 'Ask at Reception',
        script: (g: Game) => {
          g.run(random(
            text('"Dr. Harland is attending a medical conference on the continent," the receptionist explains. "He\'s expected back before long. Shall I make a note?"'),
            text('"The doctor sends his apologies. He was called away rather suddenly — a colleague in need of consultation. These things happen." She smiles thinly.'),
            text('"I\'m afraid there\'s no one else who can see you at present. The doctor is very particular about who practises under his name." She straightens a stack of papers.'),
          ))
          g.timeLapse(5)  
        },
      },
      {
        name: 'Wait',
        script: (g: Game) => {
          g.add('You take a seat in the waiting room. The chair is uncomfortable in a way that suggests it was chosen deliberately. The clock ticks. Nothing happens.')
          g.run('wait', { minutes: 15 })
        },
      },
    ],
  },
}

Object.entries(UPTOWN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
