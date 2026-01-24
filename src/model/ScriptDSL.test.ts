import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Game } from './Game'
import '../story/World' // Load all story content

import {
  // Core type
  type Instruction,
  // Generic builder
  run,
  // Predicates
  hasItem,
  hasStat,
  inLocation,
  inScene,
  hasCard,
  cardCompleted,
  npcStat,
  timeElapsed,
  not,
  and,
  or,
  // Instructions
  text,
  paragraph,
  hl,
  say,
  playerName,
  npcName,
  option,
  npcLeaveOption,
  when,
  unless,
  cond,
  seq,
  random,
  skillCheck,
  move,
  addItem,
  removeItem,
  addStat,
  timeLapse,
  addQuest,
  completeQuest,
  addEffect,
  recordTime,
  // Execution
  exec,
  execAll,
  registerDslScript,
} from './ScriptDSL'

describe('ScriptDSL', () => {
  // ============================================================================
  // DSL BUILDER OUTPUT TESTS
  // These verify that builder functions produce the correct [scriptName, params] tuples
  // ============================================================================

  describe('Builder Output', () => {
    describe('run() - generic builder', () => {
      it('produces [scriptName, params] tuple', () => {
        const result = run('myScript', { foo: 'bar', count: 5 })
        expect(result).toEqual(['myScript', { foo: 'bar', count: 5 }])
      })

      it('defaults to empty params', () => {
        const result = run('myScript')
        expect(result).toEqual(['myScript', {}])
      })
    })

    describe('content builders', () => {
      it('text() produces text instruction with parts array', () => {
        const result = text('Hello world')
        expect(result).toEqual(['text', { parts: ['Hello world'] }])
      })

      it('text() accepts multiple parts', () => {
        const result = text('Hello ', 'world', '!')
        expect(result).toEqual(['text', { parts: ['Hello ', 'world', '!'] }])
      })

      it('text() accepts Instructions as parts', () => {
        const result = text('Hello ', playerName(), '!')
        expect(result).toEqual(['text', { parts: ['Hello ', ['playerName', {}], '!'] }])
      })

      it('paragraph() produces paragraph instruction', () => {
        const result = paragraph('Hello ', hl('world', '#ff0000'), '!')
        expect(result).toEqual(['paragraph', {
          content: ['Hello ', { text: 'world', color: '#ff0000' }, '!']
        }])
      })

      it('hl() produces highlight object (not instruction)', () => {
        const result = hl('important', '#ff0000', 'Hover text')
        expect(result).toEqual({ text: 'important', color: '#ff0000', hoverText: 'Hover text' })
      })

      it('say() produces say instruction with parts array', () => {
        expect(say('Hello!')).toEqual(['say', { parts: ['Hello!'] }])
      })

      it('say() accepts multiple parts including Instructions', () => {
        expect(say(npcName(), ' says "Welcome!"')).toEqual(['say', { parts: [['npcName', { npc: undefined }], ' says "Welcome!"'] }])
      })

      it('playerName() produces playerName instruction', () => {
        expect(playerName()).toEqual(['playerName', {}])
      })

      it('npcName() produces npcName instruction', () => {
        expect(npcName()).toEqual(['npcName', { npc: undefined }])
        expect(npcName('barkeeper')).toEqual(['npcName', { npc: 'barkeeper' }])
      })

      it('option() produces option instruction', () => {
        expect(option('Click me', 'nextScript', { x: 1 })).toEqual(['option', { label: 'Click me', script: 'nextScript', params: { x: 1 } }])
        expect(option('Next')).toEqual(['option', { label: 'Next', script: undefined, params: {} }])
      })

      it('npcLeaveOption() produces npcLeaveOption instruction', () => {
        expect(npcLeaveOption('Goodbye', 'See you!')).toEqual(['npcLeaveOption', { text: 'Goodbye', reply: 'See you!', label: 'Leave' }])
        expect(npcLeaveOption()).toEqual(['npcLeaveOption', { text: undefined, reply: undefined, label: 'Leave' }])
      })
    })

    describe('control flow builders', () => {
      it('seq() produces seq instruction with nested instructions', () => {
        const result = seq(text('A'), text('B'))
        expect(result).toEqual(['seq', {
          instructions: [
            ['text', { parts: ['A'] }],
            ['text', { parts: ['B'] }]
          ]
        }])
      })

      it('when() produces when instruction', () => {
        const result = when(hasItem('gold'), text('Rich!'))
        expect(result).toEqual(['when', {
          condition: ['hasItem', { item: 'gold', count: 1 }],
          then: [['text', { parts: ['Rich!'] }]]
        }])
      })

      it('when() supports multiple then instructions (variadic)', () => {
        const result = when(hasItem('gold'), text('A'), text('B'), text('C'))
        expect(result).toEqual(['when', {
          condition: ['hasItem', { item: 'gold', count: 1 }],
          then: [
            ['text', { parts: ['A'] }],
            ['text', { parts: ['B'] }],
            ['text', { parts: ['C'] }]
          ]
        }])
      })

      it('unless() produces when with negated condition', () => {
        const result = unless(hasItem('gold'), text('Poor!'))
        expect(result).toEqual(['when', {
          condition: ['not', { predicate: ['hasItem', { item: 'gold', count: 1 }] }],
          then: [['text', { parts: ['Poor!'] }]]
        }])
      })

      it('cond() with 3 args produces if/else branches', () => {
        const result = cond(hasItem('gold'), text('Rich!'), text('Poor!'))
        expect(result).toEqual(['cond', {
          branches: [{ condition: ['hasItem', { item: 'gold', count: 1 }], then: ['text', { parts: ['Rich!'] }] }],
          default: ['text', { parts: ['Poor!'] }]
        }])
      })

      it('cond() with multiple branches', () => {
        const result = cond(
          hasItem('gold'), text('Gold!'),
          hasItem('silver'), text('Silver!'),
          text('Nothing!')
        )
        expect(result).toEqual(['cond', {
          branches: [
            { condition: ['hasItem', { item: 'gold', count: 1 }], then: ['text', { parts: ['Gold!'] }] },
            { condition: ['hasItem', { item: 'silver', count: 1 }], then: ['text', { parts: ['Silver!'] }] }
          ],
          default: ['text', { parts: ['Nothing!'] }]
        }])
      })

      it('random() produces random instruction', () => {
        const result = random(text('A'), text('B'), text('C'))
        expect(result).toEqual(['random', {
          children: [
            ['text', { parts: ['A'] }],
            ['text', { parts: ['B'] }],
            ['text', { parts: ['C'] }]
          ]
        }])
      })

      it('skillCheck() produces skillCheck instruction (predicate mode)', () => {
        expect(skillCheck('Flirtation', 10)).toEqual(['skillCheck', {
          skill: 'Flirtation',
          difficulty: 10,
          onSuccess: undefined,
          onFailure: undefined
        }])
      })

      it('skillCheck() produces skillCheck instruction (callback mode)', () => {
        expect(skillCheck('Flirtation', 10, [text('Success!')], [text('Fail!')])).toEqual(['skillCheck', {
          skill: 'Flirtation',
          difficulty: 10,
          onSuccess: [['text', { parts: ['Success!'] }]],
          onFailure: [['text', { parts: ['Fail!'] }]]
        }])
      })
    })

    describe('game action builders', () => {
      it('addItem() produces gainItem instruction', () => {
        expect(addItem('gold', 10)).toEqual(['gainItem', { item: 'gold', number: 10 }])
        expect(addItem('sword')).toEqual(['gainItem', { item: 'sword', number: 1 }])
      })

      it('removeItem() produces loseItem instruction', () => {
        expect(removeItem('gold', 5)).toEqual(['loseItem', { item: 'gold', number: 5 }])
      })

      it('move() produces move instruction', () => {
        expect(move('tavern')).toEqual(['move', { location: 'tavern' }])
      })

      it('timeLapse() produces timeLapse instruction', () => {
        expect(timeLapse(30)).toEqual(['timeLapse', { minutes: 30 }])
      })

      it('addStat() produces addStat instruction', () => {
        expect(addStat('Agility', 5)).toEqual(['addStat', { stat: 'Agility', change: 5 }])
      })

      it('addQuest() produces addQuest instruction', () => {
        expect(addQuest('find-lodgings', { silent: true })).toEqual(['addQuest', { questId: 'find-lodgings', args: { silent: true } }])
      })

      it('completeQuest() produces completeQuest instruction', () => {
        expect(completeQuest('find-lodgings')).toEqual(['completeQuest', { questId: 'find-lodgings' }])
      })

      it('addEffect() produces addEffect instruction', () => {
        expect(addEffect('tired', { level: 2 })).toEqual(['addEffect', { effectId: 'tired', args: { level: 2 } }])
      })

      it('recordTime() produces recordTime instruction', () => {
        expect(recordTime('lastEat')).toEqual(['recordTime', { timer: 'lastEat' }])
      })
    })

    describe('predicate builders', () => {
      it('hasItem() produces hasItem instruction', () => {
        expect(hasItem('gold')).toEqual(['hasItem', { item: 'gold', count: 1 }])
        expect(hasItem('gold', 100)).toEqual(['hasItem', { item: 'gold', count: 100 }])
      })

      it('hasStat() produces hasStat instruction', () => {
        expect(hasStat('Agility', 30)).toEqual(['hasStat', { stat: 'Agility', min: 30, max: undefined }])
        expect(hasStat('Agility', 10, 50)).toEqual(['hasStat', { stat: 'Agility', min: 10, max: 50 }])
      })

      it('inLocation() produces inLocation instruction', () => {
        expect(inLocation('tavern')).toEqual(['inLocation', { location: 'tavern' }])
      })

      it('inScene() produces inScene instruction', () => {
        expect(inScene()).toEqual(['inScene', {}])
      })

      it('npcStat() produces npcStat instruction', () => {
        expect(npcStat('barkeeper', 'trust', 50)).toEqual(['npcStat', { npc: 'barkeeper', stat: 'trust', min: 50, max: undefined }])
      })

      it('hasCard() produces hasCard instruction', () => {
        expect(hasCard('find-lodgings')).toEqual(['hasCard', { cardId: 'find-lodgings' }])
      })

      it('cardCompleted() produces cardCompleted instruction', () => {
        expect(cardCompleted('find-lodgings')).toEqual(['cardCompleted', { cardId: 'find-lodgings' }])
      })

      it('timeElapsed() produces timeElapsed instruction', () => {
        expect(timeElapsed('lastEat', 60)).toEqual(['timeElapsed', { timer: 'lastEat', minutes: 60 }])
      })

      it('not() produces not instruction', () => {
        expect(not(hasItem('gold'))).toEqual(['not', { predicate: ['hasItem', { item: 'gold', count: 1 }] }])
      })

      it('and() produces and instruction', () => {
        expect(and(hasItem('gold'), inLocation('tavern'))).toEqual(['and', {
          predicates: [
            ['hasItem', { item: 'gold', count: 1 }],
            ['inLocation', { location: 'tavern' }]
          ]
        }])
      })

      it('or() produces or instruction', () => {
        expect(or(hasItem('gold'), hasItem('silver'))).toEqual(['or', {
          predicates: [
            ['hasItem', { item: 'gold', count: 1 }],
            ['hasItem', { item: 'silver', count: 1 }]
          ]
        }])
      })
    })

    describe('JSON serialization', () => {
      it('instructions are fully JSON-serializable', () => {
        const instructions: Instruction[] = [
          text('Hello'),
          when(and(hasItem('gold'), not(inScene())),
            say('Rich!'),
            option('Next', 'next', { x: 1 })
          ),
          text(npcName(), ' greets ', playerName())
        ]

        const json = JSON.stringify(instructions)
        const parsed = JSON.parse(json)

        expect(parsed).toEqual(instructions)
      })

      it('cond serializes and deserializes correctly', () => {
        const instruction = cond(
          hasItem('a'), text('A'),
          hasItem('b'), text('B'),
          text('Default')
        )

        const json = JSON.stringify(instruction)
        const parsed = JSON.parse(json)

        expect(parsed).toEqual(instruction)
      })
    })
  })

  // ============================================================================
  // EXECUTION TESTS
  // These verify that instructions execute correctly against game state
  // ============================================================================

  describe('Execution', () => {
    let game: Game

    beforeEach(() => {
      game = new Game()
      // Run init to set up game state properly
      game.run('init', {})
      // Don't clear scene - we'll clear it in tests that need a clean scene
    })

    describe('Predicates', () => {
      it('hasItem checks inventory', () => {
        // Player starts with crown (120 from init)
        expect(exec(game, hasItem('crown'))).toBe(true)
        expect(exec(game, hasItem('crown', 100))).toBe(true)
        expect(exec(game, hasItem('crown', 200))).toBe(false)
        expect(exec(game, hasItem('nonexistent'))).toBe(false)
      })

      it('hasStat checks player stats', () => {
        // Player starts with Agility 30
        expect(exec(game, hasStat('Agility', 30))).toBe(true)
        expect(exec(game, hasStat('Agility', 50))).toBe(false)
        expect(exec(game, hasStat('Agility', 0, 50))).toBe(true)
        expect(exec(game, hasStat('Agility', 0, 20))).toBe(false)
      })

      it('inLocation checks current location', () => {
        expect(exec(game, inLocation('station'))).toBe(true)
        expect(exec(game, inLocation('tavern'))).toBe(false)
      })

      it('inScene checks if scene has options', () => {
        // After init, scene has options
        expect(exec(game, inScene())).toBe(true)
        game.clearScene()
        expect(exec(game, inScene())).toBe(false)
        game.addOption('test', {}, 'Test')
        expect(exec(game, inScene())).toBe(true)
      })

      it('hasCard checks player cards', () => {
        // Add a quest manually for testing
        game.addQuest('find-lodgings', { silent: true })
        expect(exec(game, hasCard('find-lodgings'))).toBe(true)
        expect(exec(game, hasCard('nonexistent'))).toBe(false)
      })

      it('not inverts predicates', () => {
        expect(exec(game, not(hasItem('crown')))).toBe(false)
        expect(exec(game, not(hasItem('nonexistent')))).toBe(true)
      })

      it('and combines predicates', () => {
        expect(exec(game, and(hasItem('crown'), inLocation('station')))).toBe(true)
        expect(exec(game, and(hasItem('crown'), inLocation('tavern')))).toBe(false)
      })

      it('or combines predicates', () => {
        expect(exec(game, or(hasItem('nonexistent'), inLocation('station')))).toBe(true)
        expect(exec(game, or(hasItem('nonexistent'), inLocation('tavern')))).toBe(false)
      })
    })

    describe('Instructions', () => {
      beforeEach(() => {
        game.clearScene()
      })

      it('text adds to scene content', () => {
        execAll(game, [text('Hello world')])
        expect(game.scene.content.length).toBe(1)
        expect(game.scene.content[0]).toEqual({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }]
        })
      })

      it('paragraph adds formatted paragraph', () => {
        execAll(game, [
          paragraph('Hello ', hl('world', '#ff0000', 'Earth'), '!')
        ])
        expect(game.scene.content.length).toBe(1)
        const para = game.scene.content[0]
        expect(para.type).toBe('paragraph')
      })

      it('say adds speech content', () => {
        execAll(game, [say('Welcome!')])
        expect(game.scene.content.length).toBe(1)
        expect(game.scene.content[0]).toEqual({
          type: 'speech',
          text: 'Welcome!',
          color: undefined
        })
      })

      it('option adds scene option', () => {
        execAll(game, [option('Click me', 'testScript', { foo: 'bar' })])
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0]).toEqual({
          type: 'button',
          script: ['testScript', { foo: 'bar' }],
          label: 'Click me'
        })
      })

      it('when executes conditionally - true', () => {
        execAll(game, [
          when(hasItem('crown'), text('You have gold!'))
        ])
        expect(game.scene.content.length).toBe(1)
      })

      it('when executes conditionally - false', () => {
        execAll(game, [
          when(hasItem('nonexistent'), text('You have something'))
        ])
        expect(game.scene.content.length).toBe(0)
      })

      it('when with multiple expressions (variadic)', () => {
        execAll(game, [
          when(hasItem('crown'),
            text('Line 1'),
            text('Line 2'),
            text('Line 3')
          )
        ])
        expect(game.scene.content.length).toBe(3)
      })

      it('unless executes when condition is false', () => {
        execAll(game, [
          unless(hasItem('nonexistent'), text('You do not have it'))
        ])
        expect(game.scene.content.length).toBe(1)

        game.clearScene()

        execAll(game, [
          unless(hasItem('crown'), text('Missing crown'))
        ])
        expect(game.scene.content.length).toBe(0)
      })

      it('unless with multiple expressions', () => {
        execAll(game, [
          unless(hasItem('nonexistent'),
            text('Line 1'),
            text('Line 2')
          )
        ])
        expect(game.scene.content.length).toBe(2)
      })

      it('cond with 3 args is if/else', () => {
        // True branch
        execAll(game, [
          cond(hasItem('crown'), text('Rich!'), text('Poor!'))
        ])
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Rich!')

        game.clearScene()

        // False branch
        execAll(game, [
          cond(hasItem('nonexistent'), text('Rich!'), text('Poor!'))
        ])
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Poor!')
      })

      it('cond with multiple branches', () => {
        // First branch matches
        execAll(game, [
          cond(
            hasItem('crown'), text('Has crown'),
            hasItem('sword'), text('Has sword'),
            text('Has nothing')
          )
        ])
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Has crown')

        game.clearScene()

        // No branch matches, uses default
        execAll(game, [
          cond(
            hasItem('nonexistent1'), text('Has 1'),
            hasItem('nonexistent2'), text('Has 2'),
            text('Default')
          )
        ])
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Default')
      })

      it('seq runs instructions in sequence', () => {
        execAll(game, [
          seq(text('A'), text('B'), text('C'))
        ])
        expect(game.scene.content.length).toBe(3)
      })

      it('random executes one random child', () => {
        // Run multiple times to verify it picks one
        for (let i = 0; i < 10; i++) {
          game.clearScene()
          execAll(game, [random(text('A'), text('B'), text('C'))])
          expect(game.scene.content.length).toBe(1)
          const txt = (game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text
          expect(['A', 'B', 'C']).toContain(txt)
        }
      })

      it('skillCheck as predicate returns boolean', () => {
        // With no callbacks, returns boolean
        const result = exec(game, skillCheck('Flirtation', 0))
        expect(typeof result).toBe('boolean')
      })

      it('skillCheck with callbacks executes appropriate branch', () => {
        // Mock Math.random to return a value that results in roll 50 (not 100, which always fails)
        vi.spyOn(Math, 'random').mockReturnValue(0.49)
        try {
          execAll(game, [
            skillCheck('Flirtation', -100, [text('Success!')], [text('Failure!')])
          ])
          expect(game.scene.content.length).toBe(1)
          // With difficulty -100 and roll 50, should succeed (threshold = stat + skill + 100 > 50)
          const txt = (game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text
          expect(txt).toBe('Success!')
        } finally {
          vi.restoreAllMocks()
        }
      })

      it('move changes location', () => {
        execAll(game, [move('default')])
        expect(game.currentLocation).toBe('default')
      })

      it('addItem adds to inventory', () => {
        const initialCount = game.player.inventory.find(i => i.id === 'crown')?.number ?? 0
        execAll(game, [addItem('crown', 10)])
        const newCount = game.player.inventory.find(i => i.id === 'crown')?.number ?? 0
        expect(newCount).toBe(initialCount + 10)
      })

      it('addStat modifies player stats', () => {
        const initial = game.player.basestats.get('Agility') ?? 0
        execAll(game, [addStat('Agility', 5)])
        expect(game.player.basestats.get('Agility')).toBe(initial + 5)
      })

      it('recordTime records current time to a timer', () => {
        const currentTime = game.time
        execAll(game, [recordTime('lastEat')])
        expect(game.player.timers.get('lastEat')).toBe(currentTime)
      })

      it('timeElapsed returns true when no timer recorded', () => {
        // Unrecorded timer should return true (long enough ago)
        const result = exec(game, timeElapsed('unrecorded', 60))
        expect(result).toBe(true)
      })

      it('timeElapsed returns false when not enough time passed', () => {
        execAll(game, [recordTime('testTimer')])
        // Just recorded, so 60 minutes hasn't passed
        const result = exec(game, timeElapsed('testTimer', 60))
        expect(result).toBe(false)
      })

      it('timeElapsed returns true when enough time passed', () => {
        execAll(game, [recordTime('testTimer')])
        // Advance time by 61 minutes (3660 seconds)
        game.time += 3660
        const result = exec(game, timeElapsed('testTimer', 60))
        expect(result).toBe(true)
      })

      it('recordTime throws on missing timer name', () => {
        expect(() => exec(game, ['recordTime', {}])).toThrow('recordTime requires a timer parameter')
      })

      it('timeElapsed throws on missing parameters', () => {
        expect(() => exec(game, ['timeElapsed', {}])).toThrow('timeElapsed requires a timer parameter')
        expect(() => exec(game, ['timeElapsed', { timer: 'test' }])).toThrow('timeElapsed requires a minutes parameter')
      })
    })

    describe('registerDslScript', () => {
      it('registers and executes declarative script', () => {
        const testScript: Instruction[] = [
          text('This is a declarative script'),
          when(hasItem('crown'),
            text('You are rich!'),
            option('Spend money', 'spend')
          ),
          option('Leave', 'leave')
        ]

        registerDslScript('testDeclarative', testScript)

        game.clearScene()
        game.run('testDeclarative', {})

        expect(game.scene.content.length).toBe(2) // text + "You are rich!"
        expect(game.scene.options.length).toBe(2) // "Spend money" + "Leave"
      })
    })

    describe('Complex script example', () => {
      it('handles realistic tavern entry scenario', () => {
        const enterTavern: Instruction[] = [
          text('You push open the heavy oak door.'),
          paragraph(
            'The air is thick with ',
            hl('pipe smoke', '#888888', 'Tobacco blend'),
            '.'
          ),
          say('Welcome, traveler!'),
          cond(
            hasItem('crown', 5), seq(
              say('What can I get you?'),
              option('Buy an ale', 'buyAle', { price: 2 }),
              option('Buy wine', 'buyWine', { price: 5 })
            ),
            say('Come back when you have coin.')
          ),
          option('Look around', 'lookAround'),
          npcLeaveOption('You nod and head out.', 'Safe travels!', 'Leave')
        ]

        registerDslScript('enterTavern', enterTavern)
        game.clearScene()
        game.run('enterTavern', {})

        // Content: text, paragraph, speech("Welcome"), speech("What can I get you?")
        expect(game.scene.content.length).toBe(4)
        // Options: buyAle, buyWine, lookAround, leave
        expect(game.scene.options.length).toBe(4)
      })
    })
  })
})
