import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { script, seq, random, text, time, wait, cond, not, and, hourBetween, locationDiscovered, skillCheck, discoverLocation, run } from '../model/ScriptDSL'
import { applyRelaxation } from './Effects'

// Location definitions for the city of Aetheria
// These are the standard locations. Others might be added elsewhere
const LOCATION_DEFINITIONS: Record<LocationId, LocationDefinition> = {
  station: {
    name: 'Ironspark Terminus',
    description: 'The bustling main railway station, filled with travelers.',
    image: '/images/station.jpg',
    mainLocation: true,
    links: [
      { dest: 'default', time: 8 }, // 10 minutes to city
      { dest: 'subway-terminus', time: 2, label: 'Subway'},
    ],
    onArrive: (g: Game) => {
      g.getNPC('automaton-greeter')
      g.getNPC('tour-guide')
      g.getNPC('commuter')
    },
    activities: [
      {
        name: 'Explore',
        script: script(
          time(10),
          cond(
            // Discover the Subway
            and(not(locationDiscovered('subway-terminus')), skillCheck('Perception', 0)),
            discoverLocation('subway-terminus', 'While exploring the station, you notice a stairwell leading downward, marked with a faded brass sign: Underground Railway. You could take the subway from here.', '#3b82f6'),
            // Morning rush (6am–10am)
            hourBetween(6, 10),
            random(
              text('The morning rush is in full swing. Commuters jostle for position on the platform, their breath mingling with the steam in the cold air.'),
              text('A ticket vendor with mechanical enhancements calls out destinations, her voice amplified by a small brass mechanism at her throat. Travellers queue patiently before her window.'),
              text('Through the steam, you notice a group of porters loading luggage onto a train car. Clockwork assistants help with the heavier trunks, their gears whirring as they work.'),
              text('A conductor in a pressed uniform checks tickets with a mechanical scanner. The device clicks and whirs as it validates each passenger\'s passage.'),
            ),
            // Daytime (10am–6pm)
            hourBetween(10, 18),
            random(
              text('An announcement automaton clicks to life, its brass voicebox broadcasting the next departure times. The mechanical voice echoes through the station halls.'),
              text('You watch as a steam-powered baggage cart trundles past, its wheels clicking rhythmically on the platform stones. The driver tips his cap as he passes.'),
              seq(text('A family with elaborate mechanical travel cases waits on a bench. The children\'s toys—tiny steam-powered contraptions—whir and click as they play.'), wait(1)),
              text('You spot a news vendor selling papers from a brass-plated cart. Steam rises from a small boiler keeping the papers warm, and mechanical print headlines flash on a tiny display.'),
              seq(
                text('You explore the ticket area, looking at the mechanical displays and brass ticket machines. As you examine the area, something catches your eye.'),
                run('gainItem', { text: 'You found a coin.', item: 'crown', number: 1 }),
              ),
            ),
            // Evening (6pm–10pm)
            hourBetween(18, 22),
            random(
              text('A steam whistle echoes through the air as a train arrives at the platform. Passengers disembark, their luggage clinking with brass fittings and gears.'),
              seq(text('The station clock, a massive brass mechanism with visible gears, chimes the hour. Travellers check their own pocket watches, synchronising time before their journeys.'), wait(1)),
              text('A station worker adjusts the valves on an overhead steam pipe, releasing a controlled burst of vapour. The warm, oily mist briefly obscures the platform.'),
              text('The evening crowd thins as the last commuters hurry to catch their trains. The station settles into a quieter rhythm, steam pipes hissing softly overhead.'),
            ),
            // Night (10pm–6am)
            seq(
              random(
                text('The station is deserted. Your footsteps echo unnervingly through the empty halls. The gas lamps flicker, casting long shadows between the silent platforms.'),
                text('A lone automaton sweeps the platform with mechanical precision, its brush arms clicking in the silence. It pays you no mind, but the sound is unsettling in the emptiness.'),
                text('The station feels cavernous at this hour. Steam escapes from pipes overhead with a ghostly hiss, and somewhere in the distance a door creaks on its hinges.'),
              ),
              run('wait', { minutes: 20 }),
            ),
          ),
        ),
      },
    ],
  },
  default: {
    name: 'City Centre',
    description: 'The heart of the city, where commerce and culture meet.',
    image: '/images/city.jpg',
    mainLocation: true,
    links: [
      { dest: 'station', time: 8 },
      { dest: 'backstreets', time: 8 },
      { dest: 'school', time: 8 },
      { dest: 'market', time: 5 },
      { dest: 'hotel', time: 3 },
    ],
    activities: [
      {
        name: 'Explore',
        script: script(
          time(8),
          cond(
            // Discover the Market
            and(not(locationDiscovered('market')), skillCheck('Perception', 0)),
            discoverLocation('market', 'Following the sound of haggling and the clink of brass, you discover a bustling marketplace tucked behind the main thoroughfare. Vendors display exotic mechanical trinkets and clockwork wonders.', '#3b82f6'),
            // Discover the University
            and(not(locationDiscovered('school')), skillCheck('Perception', 0)),
            discoverLocation('school', 'Through a grand archway, you catch sight of imposing brass buildings and manicured grounds. A sign reads: University of Aetheria. You note the way for future reference.', '#3b82f6'),
            // Discover the Backstreets
            and(not(locationDiscovered('backstreets')), skillCheck('Perception', 0)),
            discoverLocation('backstreets', 'You notice a narrow alley branching off from the main street. The air grows thick with coal smoke and the smell of oil. This must be the way to the backstreets.', '#3b82f6'),
            // Discover the Hotel
            and(not(locationDiscovered('hotel')), skillCheck('Perception', 0)),
            discoverLocation('hotel', 'Turning a corner on the main boulevard, you spot a grand brass-and-marble facade: the Imperial Hotel. Its revolving doors gleam invitingly.', '#3b82f6'),
            // Morning (6am–12pm)
            hourBetween(6, 12),
            random(
              text('The city centre bustles with morning commerce. Steam-powered carriages rattle past on cobblestone streets, while brass-fitted shopfronts gleam in the early light.'),
              text('A clockwork street sweeper trundles along the pavement, its brushes whirring industriously. Citizens step neatly aside without breaking stride—a well-practised dance.'),
              text('A newspaper vendor cranks his mechanical press, spitting out freshly printed broadsheets. Headlines about the latest inventions flash on a rotating brass display.'),
              text('You watch as a team of engineers adjusts the great steam pipes that run beneath the streets. Plumes of vapour rise from open manholes, wreathing the buildings in mist.'),
            ),
            // Afternoon (12pm–6pm)
            hourBetween(12, 18),
            random(
              text('The afternoon sun glints off a thousand brass surfaces. The city centre hums with activity—merchants, students, and automatons all going about their business.'),
              text('A street performer operates a mechanical puppet theatre, drawing a crowd of onlookers. The tiny brass figures act out a drama with surprising grace.'),
              text('You pass a grand clocktower at the centre of the square. Its exposed gears turn with hypnotic precision, each cog interlocking in a ballet of brass and steel.'),
              text('A steam tram glides through the square, its brass bell clanging. Passengers peer out through fogged windows at the bustle of the city below.'),
            ),
            // Evening (6pm–10pm)
            hourBetween(18, 22),
            random(
              text('Gas lamps flicker to life along the main streets, casting warm amber pools across the cobblestones. The city takes on a golden glow as the evening crowds emerge.'),
              text('The evening brings a different energy to the city centre. Well-dressed couples stroll arm in arm, while the hiss of steam from nearby restaurants fills the air.'),
              text('A lamplighter makes his rounds with a long brass pole, igniting each gas lamp in turn. The mechanical flames catch and hold, pushing back the gathering dusk.'),
              text('The great clocktower chimes the hour, its resonant tones echoing across the rooftops. Pigeons with brass leg-bands scatter from the eaves.'),
            ),
            // Night (10pm–6am)
            seq(
              random(
                text('The city centre is eerily quiet. The grand buildings loom like sleeping giants, their brass fittings catching stray moonlight. Your footsteps echo too loudly on the empty cobblestones.'),
                text('A lone automaton constable patrols the square, its lantern-eye sweeping the darkness in measured arcs. You keep to the shadows, not wanting to attract its attention.'),
                text('The steam pipes hiss and groan in the silence, as though the city itself is breathing. A distant clock strikes the hour, the sound hollow and lonely.'),
              ),
              run('wait', { minutes: 15 }),
            ),
          ),
        ),
      },
    ],
  },
  backstreets: {
    name: 'Backstreets',
    description: 'The winding alleys and hidden passages of the city, where secrets lurk in the shadows.',
    image: '/images/backstreet.jpg',
    mainLocation: true,
    secret: true,
    links: [
      { dest: 'default', time: 8 },
      { dest: 'market', time: 5 },
      { dest: 'lowtown', time: 8 },
      { dest: 'stairwell', time: 1, label: 'Enter Lodgings' },
    ], // 5 to city, 5 to market, 5 to lowtown; 1 to lodgings (shown in Places once discovered)
    activities: [
      {
        name: 'Find Lodgings',
        symbol: 'H',
        condition: (g: Game) => !g.getLocation('bedroom').discovered,
        script: (g: Game, _params: {}) => {
          g.run('enterLodgings')
        },
      },
      {
        name: 'Explore',
        script: script(
          time(5),
          cond(
            // Discover Lowtown
            and(not(locationDiscovered('lowtown')), skillCheck('Perception', 0)),
            discoverLocation('lowtown', 'While exploring the backstreets, you discover a hidden path leading downward. The air grows heavier with the smell of industry and steam. You\'ve found your way to Lowtown.', '#3b82f6'),
            // Daytime (6am–2pm)
            hourBetween(6, 14),
            random(
              text('You notice a stack of discarded gears and brass fittings in a corner, still warm to the touch. Someone has been tinkering here recently, leaving only traces of their work.'),
              text('A steam pipe hisses from above, releasing a cloud of vapour that obscures the narrow passage ahead. Through the mist, you hear muffled voices and the click of mechanical parts.'),
              text('An alley cat with a small brass enhancement on its collar watches you from a windowsill. Its mechanical eye gleams in the dim light, tracking your movements with unnerving precision.'),
              text('A maintenance access panel stands ajar, steam escaping in thin wisps. Someone has clearly tampered with the city\'s infrastructure here, leaving their mark in the machinery.'),
              text('Graffiti etched into the brickwork shows crude mechanical diagrams—plans or warnings, perhaps. The symbols are mysterious, a language known only to the backstreets\' residents.'),
            ),
            // Afternoon and evening (2pm–10pm)
            hourBetween(14, 22),
            random(
              text('Shadows shift in the alleys ahead, and you catch a glimpse of someone—or something—ducking around a corner. The sound of mechanical whirring fades quickly into the darkness.'),
              text('A figure with a mechanical arm emerges from a doorway, casting a wary glance in your direction before melting back into the shadows. The smell of oil and coal hangs heavy in the air.'),
              text('You spot a small mechanical device half-hidden in the gutter—a spyglass or listening device, perhaps. It whirs faintly, its gears still turning despite the grime.'),
              text('The sound of a deal being made echoes from a nearby doorway. The conversation is hushed, punctuated by the clink of brass coins and the whir of a mechanical lock.'),
              text('You notice a hidden passage between buildings, marked only by a small brass marker. The entrance is obscured by steam and shadow, leading to unknown depths.'),
            ),
            // Night (10pm–6am)
            seq(
              random(
                text('The backstreets are pitch dark and utterly still. Every creak and distant clank sets your nerves on edge. You feel very exposed out here alone.'),
                text('A rat scurries across your path, its brass-capped teeth glinting in the faint glow of a distant gas lamp. The alleys feel alive with unseen things.'),
                text('The shadows here seem to move of their own accord. You hear a low mechanical whirring from somewhere above — a surveillance device, or something worse.'),
              ),
              
            ),
          ),
          run('wait', { minutes: 5 }), /* Possibly get an encounter */
        ),
      },
    ],
    onFirstArrive: (g: Game) => {
      g.add('You arrive in the backstreets. The air is thick with the smell of coal and oil. You can hear the sound of steam engines in the distance.')
    },
    onArrive: (g: Game) => {
      g.getNPC('jonny-elric')
    },
  },
  school: {
    name: 'University',
    description: 'The precinct of the University of Aetheria, a grand educational institution where knowledge flows like steam through pipes.',
    image: '/images/school.jpg',
    mainLocation: true,
    secret: true,
    links: [
      { dest: 'default', time: 8 }, 
      { dest: 'lake', time: 8 }, 
      { dest: 'subway-university', time: 2, label: 'Subway' },
      { 
        dest: 'hallway', 
        label: 'Enter University',
        time: 2,
        checkAccess: (game: Game) => {
          // Check if access is allowed: 7am-9pm (7-21) on weekdays (Mon-Fri, day 1-5)
          const currentDate = game.date
          const currentHour = Math.floor(game.hourOfDay)
          const currentDay = currentDate.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
          
          // Check if it's a weekday (Monday=1 to Friday=5)
          const isWeekday = currentDay >= 1 && currentDay <= 5
          
          // Check if it's within school hours (7am-9pm, i.e., 7-21 inclusive)
          const isSchoolHours = currentHour >= 7 && currentHour <= 21
          
          if (!isWeekday) {
            return 'The university is closed on weekends. Access is only available Monday through Friday, 7am to 9pm.'
          }
          
          if (!isSchoolHours) {
            return 'The university is closed. Access is only available Monday through Friday, 7am to 9pm.'
          }
          
          return null // Access allowed
        }
      }
    ], // 5 minutes to city centre, 8 minutes to lake, 2 minutes to enter the university
    activities: [
      {
        name: 'Enroll in University',
        condition: (game: Game) => {
          // Only available between 8-10am on Jan 6th, 1902
          const currentDate = game.date
          const inductionStart = new Date(1902, 0, 6, 8, 0, 0) // Jan 6, 1902, 8:00am
          const inductionEnd = new Date(1902, 0, 6, 10, 0, 0) // Jan 6, 1902, 10:00am
          
          // Check if current time is within induction window
          return currentDate >= inductionStart && currentDate < inductionEnd
        },
        script: (game: Game) => {
          game.run('universityInduction', {})
        },
      },
      {
        name: 'Explore',
        script: script(
          time(3),
          cond(
            // Discover the Lake
            and(not(locationDiscovered('lake')), skillCheck('Perception', 0)),
            discoverLocation('lake', 'Through the university windows, you catch a glimpse of something serene in the distance—a lake with steam gently rising from its surface. You make a mental note of how to reach it.', '#3b82f6'),
            // Discover the Subway
            and(not(locationDiscovered('subway-university')), skillCheck('Perception', 0)),
            discoverLocation('subway-university', 'You notice a brass-railed staircase descending beneath the university grounds, marked with a sign: Underground Railway. A convenient way to travel the city.', '#3b82f6'),
            // Morning (6am–12pm)
            hourBetween(6, 12),
            random(
              text('You stroll through the university grounds, admiring the grand brass architecture and mechanical details of the exterior. Students pass by, their footsteps echoing on the stone pathways.'),
              text('A group of students gathers on the lawn, discussing their studies while a steam-powered device demonstrates a principle nearby. The warm glow of the apparatus illuminates their faces.'),
              text('A professor walks the grounds, examining a small mechanical device. Students approach to ask questions, creating a scene of active learning even outside the classrooms.'),
              text('The university\'s main entrance stands imposing, its brass doors reflecting the sunlight. Steam gently rises from vents, creating an atmosphere of both tradition and progress.'),
            ),
            // Afternoon (12pm–6pm)
            hourBetween(12, 18),
            random(
              text('A maintenance worker tends to the steam pipes that run along the building\'s exterior. The warm vapour creates a gentle mist around the university grounds.'),
              text('You notice the intricate clockwork mechanisms visible through the windows, their gears turning in perfect synchronisation. The building itself seems alive with mechanical energy.'),
              text('The university grounds feature carefully maintained gardens where mechanical flowers bloom alongside natural ones. The contrast between organic and mechanical beauty is striking.'),
              text('You explore the pathways around the university, noticing the brass plaques and mechanical markers that guide visitors. Each detail speaks to the institution\'s dedication to innovation.'),
            ),
            // Evening (6pm–10pm)
            hourBetween(18, 22),
            random(
              text('You notice a small courtyard visible through an archway, where mechanical fountains create intricate patterns with steam and water. The sound of gears and flowing water is soothing.'),
              text('The university grounds offer a peaceful respite from the city. You find a bench near a steam-powered clock, its gentle ticking marking the passage of time.'),
              text('The lamplighters make their rounds, igniting the gas lamps that line the university paths. The warm glow casts long shadows across the grand brass facades.'),
              text('With lectures finished for the day, the grounds grow quiet. A lone scholar reads on a bench, their face lit by the amber glow of a portable steam lantern.'),
            ),
            // Night (10pm–6am)
            seq(
              random(
                text('The university grounds are eerily silent. Moonlight gleams off brass fixtures and the mechanical flowers have folded shut for the night. You feel quite alone.'),
                text('A security automaton patrols the perimeter, its lantern-eye sweeping the grounds in measured arcs. You keep your distance, unsure if it would welcome your presence.'),
                text('The grand brass doors of the university are firmly locked. Steam still escapes from the building\'s vents, as though the institution breathes in its sleep.'),
              ),
              run('wait', { minutes: 7 }),
            ),
          ),
        ),
      },
    ],
  },
  lake: {
    name: 'The Lake',
    description: 'A serene city lake, where steam gently rises from the surface.',
    image: '/images/lake.jpg',
    mainLocation: true,
    links: [
      { dest: 'school', time: 8 },
      { dest: 'market', time: 8 },
      { dest: 'pier', time: 10 },
    ],
    secret: true, // Starts as undiscovered - must be found through exploration
    onRelax: (g: Game) => {
      g.add('You find a quiet spot by the water and let the peaceful atmosphere wash over you.')
      g.run('wait', { minutes: 30 })
      g.run('addStat', { stat: 'Mood', change: 2, max: 80 })
      applyRelaxation(g, 30, 1.0)
    },
    activities: [
      {
        name: 'Relax',
        condition: hourBetween(7, 19),
        script: (g: Game) => {
          g.run('relaxAtLocation', {quality: 1.5})
        },
      },
    ],
  },
}

// Register all location definitions when module loads
Object.entries(LOCATION_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})