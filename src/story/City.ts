import { Game } from '../model/Game'
import type { LocationId, LocationDefinition } from '../model/Location'
import { registerLocation } from '../model/Location'
import { makeScripts } from '../model/Scripts'
import { Item } from '../model/Item'
import { maybeDiscoverLocation } from './Utility'

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
      { dest: 'subway-terminus', time: 2, label: 'Subway' },
    ],
    activities: [
      {
        name: 'Explore',
        script: (g: Game, _params: {}) => {
          // Advance time by 10 minutes (600 seconds)
          g.timeLapse(10)
          
          // Random encounters for the station
          const encounters = [
            {
              text: 'A steam whistle echoes through the air as a train arrives at the platform. Passengers disembark, their luggage clinking with brass fittings and gears.',
            },
            {
              text: 'A ticket vendor with mechanical enhancements calls out destinations, her voice amplified by a small brass mechanism at her throat. Travelers queue patiently before her window.',
            },
            {
              text: 'Through the steam, you notice a group of porters loading luggage onto a train car. Clockwork assistants help with the heavier trunks, their gears whirring as they work.',
            },
            {
              text: 'An announcement automaton clicks to life, its brass voicebox broadcasting the next departure times. The mechanical voice echoes through the station halls.',
            },
            {
              text: 'You watch as a steam-powered baggage cart trundles past, its wheels clicking rhythmically on the platform stones. The driver tips his cap as he passes.',
            },
            {
              text: 'A family with elaborate mechanical travel cases waits on a bench. The children\'s toys—tiny steam-powered contraptions—whir and click as they play.',
            },
            {
              text: 'A station worker adjusts the valves on an overhead steam pipe, releasing a controlled burst of vapour. The warm, oily mist briefly obscures the platform.',
            },
            {
              text: 'The station clock, a massive brass mechanism with visible gears, chimes the hour. Travelers check their own pocket watches, synchronizing time before their journeys.',
            },
            {
              text: 'A conductor in a pressed uniform checks tickets with a mechanical scanner. The device clicks and whirs as it validates each passenger\'s passage.',
            },
            {
              text: 'You spot a news vendor selling papers from a brass-plated cart. Steam rises from a small boiler keeping the papers warm, and mechanical print headlines flash on a tiny display.',
            },
            {
              text: 'You explore the ticket area, looking at the mechanical displays and brass ticket machines. As you examine the area, something catches your eye.',
              item: { item: 'crown', number: 1 },
            },
          ]
          
          const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)]
          
          if (randomEncounter.item) {
            // Special encounter with item gain
            g.add(randomEncounter.text)
            g.run('gainItem', { text: 'You found a coin.', item: randomEncounter.item.item, number: randomEncounter.item.number })
          } else {
            // Regular encounter
            g.add(randomEncounter.text)
          }
        },
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
      { dest: 'market', time: 5 }], // 10 minutes back to station, 5 minutes to backstreets, 5 minutes to school, 3 minutes to market
  },
  backstreets: {
    name: 'Backstreets',
    description: 'The winding alleys and hidden passages of the city, where secrets lurk in the shadows.',
    image: '/images/backstreet.jpg',
    mainLocation: true,
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
        script: (g: Game, _params: {}) => {
          // Advance time by 10 minutes (600 seconds)
          g.timeLapse(10)
          
          // Attempt to discover Lowtown - if discovered, stop exploration
          if (maybeDiscoverLocation(
            g,
            'lowtown',
            0,
            'While exploring the backstreets, you discover a hidden path leading downward. The air grows heavier with the smell of industry and steam. You\'ve found your way to Lowtown.'
          )) {
            return // Stop exploration if location is discovered
          }
          
          // Random encounters for the backstreets
          const encounters = [
            'Shadows shift in the alleys ahead, and you catch a glimpse of someone—or something—ducking around a corner. The sound of mechanical whirring fades quickly into the darkness.',
            'A figure with a mechanical arm emerges from a doorway, casting a wary glance in your direction before melting back into the shadows. The smell of oil and coal hangs heavy in the air.',
            'You notice a stack of discarded gears and brass fittings in a corner, still warm to the touch. Someone has been tinkering here recently, leaving only traces of their work.',
            'A steam pipe hisses from above, releasing a cloud of vapour that obscures the narrow passage ahead. Through the mist, you hear muffled voices and the click of mechanical parts.',
            'An alley cat with a small brass enhancement on its collar watches you from a windowsill. Its mechanical eye gleams in the dim light, tracking your movements with unnerving precision.',
            'You spot a small mechanical device half-hidden in the gutter—a spyglass or listening device, perhaps. It whirs faintly, its gears still turning despite the grime.',
            'The sound of a deal being made echoes from a nearby doorway. The conversation is hushed, punctuated by the clink of brass coins and the whir of a mechanical lock.',
            'A maintenance access panel stands ajar, steam escaping in thin wisps. Someone has clearly tampered with the city\'s infrastructure here, leaving their mark in the machinery.',
            'Graffiti etched into the brickwork shows crude mechanical diagrams—plans or warnings, perhaps. The symbols are mysterious, a language known only to the backstreets\' residents.',
            'You notice a hidden passage between buildings, marked only by a small brass marker. The entrance is obscured by steam and shadow, leading to unknown depths.',
          ]
          
          const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)]
          
          g.add([
            randomEncounter
          ])
        },
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
        script: (g: Game, _params: {}) => {
          // Advance time by 10 minutes (600 seconds)
          g.timeLapse(10)
          
          // Attempt to discover the Lake - if discovered, stop exploration
          if (maybeDiscoverLocation(
            g,
            'lake',
            0,
            'Through the university windows, you catch a glimpse of something serene in the distance—a lake with steam gently rising from its surface. You make a mental note of how to reach it.'
          )) {
            return // Stop exploration if location is discovered
          }
          
          // Random encounters for the University grounds (outside)
          const encounters = [
            'You stroll through the university grounds, admiring the grand brass architecture and mechanical details of the exterior. Students pass by, their footsteps echoing on the stone pathways.',
            'A maintenance worker tends to the steam pipes that run along the building\'s exterior. The warm vapour creates a gentle mist around the university grounds.',
            'You notice the intricate clockwork mechanisms visible through the windows, their gears turning in perfect synchronization. The building itself seems alive with mechanical energy.',
            'The university grounds feature carefully maintained gardens where mechanical flowers bloom alongside natural ones. The contrast between organic and mechanical beauty is striking.',
            'A group of students gathers on the lawn, discussing their studies while a steam-powered device demonstrates a principle nearby. The warm glow of the apparatus illuminates their faces.',
            'You explore the pathways around the university, noticing the brass plaques and mechanical markers that guide visitors. Each detail speaks to the institution\'s dedication to innovation.',
            'The university\'s main entrance stands imposing, its brass doors reflecting the sunlight. Steam gently rises from vents, creating an atmosphere of both tradition and progress.',
            'You notice a small courtyard visible through an archway, where mechanical fountains create intricate patterns with steam and water. The sound of gears and flowing water is soothing.',
            'A professor walks the grounds, examining a small mechanical device. Students approach to ask questions, creating a scene of active learning even outside the classrooms.',
            'The university grounds offer a peaceful respite from the city. You find a bench near a steam-powered clock, its gentle ticking marking the passage of time.',
          ]
          
          const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)]
          g.add(randomEncounter)
        },
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
      g.run('addStat', { stat: 'Mood', change: 2, max: 80 })
      g.run('wait', { minutes: 30 })
    },
    activities: [
      {
        name: 'Relax',
        condition: (g: Game) => {
          const h = g.hourOfDay
          return h >= 7 && h < 19 // 7am to 7pm
        },
        script: (g: Game) => {
          g.run('relaxAtLocation', {})
        },
      },
    ],
  },
  market: {
    name: 'Market',
    image: '/images/market.jpg',
    description: 'A bustling marketplace filled with exotic goods and mechanical wonders.',
    mainLocation: true,
    links: [
      { dest: 'lake', time: 8 }, 
      { dest: 'backstreets', time: 8 }, 
      { dest: 'default', time: 5 }], 
    activities: [
      {
        name: 'Explore',
        script: (g: Game, _params: {}) => {
          // Advance time by 10 minutes (600 seconds)
          g.timeLapse(10)
          
          // Attempt to discover the Lake - if discovered, stop exploration
          if (maybeDiscoverLocation(
            g,
            'lake',
            0,
            'While exploring the market, you overhear a conversation about a peaceful lake nearby. Someone mentions the path that leads to it, and you commit the directions to memory.'
          )) {
            return // Stop exploration if location is discovered
          }
          
          // Random encounters for the Market
          const encounters = [
            'You browse through stalls filled with brass trinkets and mechanical curiosities. Vendors call out their wares, their voices competing with the whir of clockwork displays.',
            'A vendor demonstrates a steam-powered music box, its delicate gears producing a beautiful melody. The intricate mechanism catches your eye.',
            'You notice a stall selling exotic mechanical components from distant lands. The vendor explains the unique properties of each piece with enthusiasm.',
            'A food vendor serves hot meals from a steam-powered cart. The aroma of spiced dishes mingles with the scent of oil and brass.',
            'You explore the textile section, where mechanical looms create intricate patterns. The rhythmic clicking of the machines is almost hypnotic.',
            'A fortune teller with a mechanical crystal ball offers readings. The device glows with an inner light, its gears spinning mysteriously.',
            'You watch as a craftsman repairs a broken automaton. His skilled hands work with precision, adjusting gears and tightening springs.',
            'A stall selling maps and navigational devices catches your attention. The mechanical compasses and brass astrolabes are beautifully crafted.',
            'You discover a hidden corner where rare mechanical books are sold. The vendor speaks in hushed tones about the knowledge contained within.',
            'A group of performers entertains the crowd with mechanical puppets. The intricate movements and synchronized actions are captivating.',
          ]
          
          const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)]
          g.add(randomEncounter)
        },
      },
      {
        name: 'Shopping',
        symbol: 'S',
        condition: (g: Game) => {
          const h = g.hourOfDay
          return h >= 8 && h < 18
        },
        script: (g: Game) => {
          g.run('enterMarketShopping')
        },
      },
      {
        name: 'Lucky Dip',
        script: (g: Game, _params: {}) => {
          // Check if player has at least 5 crowns
          const crownItem = g.player.inventory.find(item => item.id === 'crown')
          const crownCount = crownItem?.number || 0
          
          g.add('A vendor at a colourful stall beckons you over.')
          g.add('"Try your luck at the Lucky Dip!" she calls, gesturing to a large brass barrel filled with mysterious items. "Just 5 Krona for a chance at something special!"')
          
          if (crownCount >= 5) {
            g.addOption('luckyDipPay', {}, 'Pay 5 Krona')
            g.addOption('luckyDipQuit', {}, 'Walk Away')
          } else {
            g.add('Sadly, you don\'t have the coins to play this game. The vendor looks disappointed but smiles understandingly.')
            g.addOption('luckyDipQuit', {}, 'Walk Away')
          }
        },
      },
    ],
  },
}

// Market scripts
export const marketScripts = {
  luckyDipPay: (g: Game, _params: {}) => {
    // Check if player still has enough crowns (in case they spent some
    if (g.player.removeItem('crown', 5)) {
      g.add('You check your pockets, but you don\'t have enough Krona. The vendor looks disappointed.')
      return
    }

    
    // List of possible items from the lucky dip
    const luckyDipItems: Array<{ id: string; number?: number }> = [
      { id: 'brass-trinket' },
      { id: 'clockwork-toy' },
      { id: 'steam-whistle' },
      { id: 'sweet-wine' },
      { id: 'lucky-charm' },
      { id: 'mysterious-gear' },
      { id: 'glowing-crystal' }
    ]
    
    // Select a random item
    const selectedItemData = luckyDipItems[Math.floor(Math.random() * luckyDipItems.length)]
    const quantity = selectedItemData.number ?? 1
    
    // Create Item object to get the proper display name
    const item = new Item(selectedItemData.id, quantity)
    const displayName = item.getAName()
    
    // Display the result
    g.add('You hand over 5 Krona to the vendor, who smiles and reaches into the brass barrel.')
    g.add('After a moment of rummaging, she pulls out a wrapped item and hands it to you.')
    g.run('gainItem', { text: `You received: ${displayName}!`, item: selectedItemData.id, number: quantity })
    g.run('addStat', { stat: 'Mood', change: 1, max: 60 })
  },
  
  luckyDipQuit: (g: Game, _params: {}) => {
    g.add('You politely decline and walk away from the stall. The vendor waves cheerfully as you leave.')
  },
}

// Register market scripts when module loads
makeScripts(marketScripts)

// Register all location definitions when module loads
Object.entries(LOCATION_DEFINITIONS).forEach(([id, definition]) => {
  registerLocation(id, definition)
})