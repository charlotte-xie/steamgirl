import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { script, seq, random, text, time, cond, not, and, hourBetween, locationDiscovered, skillCheck, discoverLocation, run } from '../model/ScriptDSL'
import { applyRelaxation } from './Effects'

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
      g.add('The café is all polished wood, etched glass, and the rich smell of coffee. Small brass tables crowd the floor, each occupied by someone who looks like they belong. A mechanical coffee engine hisses and gurgles behind the counter, tended by a woman with sharp eyes and a sharper smile.')
    },
    onArrive: (g: Game) => {
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
      g.add('The arcade is a cathedral of commerce — a long gallery of iron and glass, with shops lining both sides and a vaulted roof that lets in pale, filtered light. Brass railings and ornamental clockwork decorate every surface. The air smells of leather, perfume, and new money.')
    },
    onArrive: (g: Game) => {
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
}

Object.entries(UPTOWN_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})
