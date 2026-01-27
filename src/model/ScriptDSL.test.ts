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
  scenes,
  scene,
  branch,
  choice,
  gatedBranch,
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

      it('branch() with inline instructions wraps in single-scene push', () => {
        const result = branch('Kiss him', text('You kiss.'), addStat('Charm', 5))
        expect(result).toEqual(['option', {
          label: 'Kiss him',
          script: 'global:advanceScene',
          params: {
            push: [[
              ['text', { parts: ['You kiss.'] }],
              ['addStat', { stat: 'Charm', change: 5 }],
            ]],
          },
        }])
      })

      it('branch() with Instruction[][] uses multi-scene push', () => {
        const result = branch('Go to garden', [
          [text('Scene 1')],
          [text('Scene 2')],
        ])
        expect(result).toEqual(['option', {
          label: 'Go to garden',
          script: 'global:advanceScene',
          params: {
            push: [
              [['text', { parts: ['Scene 1'] }]],
              [['text', { parts: ['Scene 2'] }]],
            ],
          },
        }])
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

    describe('scene(), choice(), gatedBranch() builders', () => {
      it('scene() returns instructions array, discarding name', () => {
        const result = scene('My scene', text('A'), text('B'))
        expect(result).toEqual([
          ['text', { parts: ['A'] }],
          ['text', { parts: ['B'] }],
        ])
      })

      it('scene() works inside scenes()', () => {
        const withScene = scenes(
          scene('Page 1', text('A')),
          scene('Page 2', text('B')),
        )
        const withoutScene = scenes(
          [text('A')],
          [text('B')],
        )
        expect(withScene).toEqual(withoutScene)
      })

      it('choice() with branches only returns seq of branches unchanged', () => {
        const b1 = branch('A', text('Path A'))
        const b2 = branch('B', text('Path B'))
        expect(choice(b1, b2)).toEqual(seq(b1, b2))
      })

      it('choice() with epilogue merges into last page of each branch', () => {
        const result = choice(
          branch('Kiss', text('You kiss.')),
          branch('Leave', text('You leave.')),
          addStat('Charm', 5),
        )

        // Both branches should have the epilogue merged into their single scene page
        const [, params] = result
        const instructions = (params as { instructions: Instruction[] }).instructions

        // First branch (Kiss): push = [[text('You kiss.'), addStat(...)]]
        const [, kissParams] = instructions[0]
        const kissPush = (kissParams as any).params.push
        expect(kissPush).toEqual([[
          text('You kiss.'),
          addStat('Charm', 5),
        ]])

        // Second branch (Leave): push = [[text('You leave.'), addStat(...)]]
        const [, leaveParams] = instructions[1]
        const leavePush = (leaveParams as any).params.push
        expect(leavePush).toEqual([[
          text('You leave.'),
          addStat('Charm', 5),
        ]])
      })

      it('choice() with multi-scene branch appends epilogue to last page only', () => {
        const result = choice(
          branch('Garden', [
            [text('Scene 1')],
            [text('Scene 2')],
          ]),
          text('Epilogue text'),
        )

        const [, params] = result
        const instructions = (params as { instructions: Instruction[] }).instructions
        const [, branchParams] = instructions[0]
        const push = (branchParams as any).params.push

        // Scene 1 unchanged
        expect(push[0]).toEqual([text('Scene 1')])
        // Scene 2 has epilogue appended
        expect(push[1]).toEqual([text('Scene 2'), text('Epilogue text')])
      })

      it('gatedBranch() produces when(condition, branch(...))', () => {
        const result = gatedBranch(
          hasItem('gold'),
          'Secret path',
          text('You found it!'),
        )
        expect(result).toEqual(
          when(hasItem('gold'), branch('Secret path', text('You found it!')))
        )
      })

      it('gatedBranch() with multi-scene produces when(condition, branch(scenes))', () => {
        const sceneArrays: Instruction[][] = [
          [text('Scene 1')],
          [text('Scene 2')],
        ]
        const result = gatedBranch(
          npcStat('npc', 'affection', 35),
          'Hidden path',
          sceneArrays,
        )
        expect(result).toEqual(
          when(npcStat('npc', 'affection', 35), branch('Hidden path', sceneArrays))
        )
      })

      it('choice() with gatedBranch() merges epilogue into inner branch', () => {
        const result = choice(
          gatedBranch(hasItem('gold'), 'Rich path', text('Gold!')),
          branch('Default', text('Normal.')),
          addStat('Charm', 1),
        )

        const [, params] = result
        const instructions = (params as { instructions: Instruction[] }).instructions

        // First instruction is the gated branch (when)
        const [whenName, whenParams] = instructions[0]
        expect(whenName).toBe('when')
        // Inside the when, the branch should have epilogue merged
        const innerBranch = (whenParams as { then: Instruction[] }).then[0]
        const innerPush = (innerBranch as any)[1].params.push
        expect(innerPush).toEqual([[text('Gold!'), addStat('Charm', 1)]])

        // Second instruction is the plain branch
        const [, defaultParams] = instructions[1]
        const defaultPush = (defaultParams as any).params.push
        expect(defaultPush).toEqual([[text('Normal.'), addStat('Charm', 1)]])
      })

      it('choice() is JSON-serializable', () => {
        const instruction = choice(
          branch('A', text('Path A')),
          branch('B', text('Path B')),
          addStat('Charm', 5),
        )
        const json = JSON.stringify(instruction)
        const parsed = JSON.parse(json)
        expect(parsed).toEqual(instruction)
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

    describe('scenes() and scene stack', () => {
      it('scenes with single scene runs immediately with no Continue button', () => {
        game.clearScene()
        execAll(game, [scenes([text('Only scene')])])
        expect(game.scene.content.length).toBe(1)
        expect(game.scene.options.length).toBe(0)
        expect(game.scene.stack.length).toBe(0)
      })

      it('scenes with multiple scenes pushes remaining onto stack', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [text('Scene 2')],
          [text('Scene 3')],
        )])
        // Scene 1 content shown
        expect(game.scene.content.length).toBe(1)
        // Continue button (via pushScenePages)
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Continue')
        // Stack has remaining pages
        expect(game.scene.stack.length).toBe(1) // one frame
      })

      it('Continue button advances through all scenes via stack', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [text('Scene 2')],
          [text('Scene 3')],
        )])

        // Click Continue → Scene 2
        const continueBtn1 = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn1.script)
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 2')
        expect(game.scene.options.length).toBe(1) // Continue to Scene 3

        // Click Continue → Scene 3
        const continueBtn2 = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn2.script)
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3')
        expect(game.scene.options.length).toBe(0) // No more scenes
        expect(game.scene.stack.length).toBe(0) // Stack fully drained
      })

      it('branch within scenes resumes outer continuation from stack', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [
            text('Choose a path'),
            branch('Path A', text('Branch A content')),
            branch('Path B', text('Branch B content')),
          ],
          [text('Scene 3 — after branch')],
          [text('Scene 4 — finale')],
        )])

        // Click Continue → Scene 2 (the branching scene)
        const continueBtn = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn.script)

        // Scene 2 shows its content and two branch options
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Choose a path')
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Path A')
        expect(game.scene.options[1].label).toBe('Path B')

        // Click Path A → branch pushes its pages, then pops and runs
        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.script)
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A content')
        // Continue to Scene 3 (outer continuation on stack)
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Continue')

        // Click Continue → Scene 3
        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
        expect(game.scene.options.length).toBe(1) // Continue to Scene 4

        // Click Continue → Scene 4
        const cont4 = game.scene.options[0]
        game.clearScene()
        game.run(cont4.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 4 — finale')
        expect(game.scene.options.length).toBe(0)
      })

      it('Path B also reaches outer continuation via stack', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [
            branch('Path A', text('Branch A')),
            branch('Path B', text('Branch B')),
          ],
          [text('After branch')],
        )])

        // Click Continue → Scene 2
        const continueBtn = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn.script)
        expect(game.scene.options.length).toBe(2)

        // Click Path B
        const pathB = game.scene.options[1]
        game.clearScene()
        game.run(pathB.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch B')
        expect(game.scene.options.length).toBe(1) // Continue

        const cont = game.scene.options[0]
        game.clearScene()
        game.run(cont.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('After branch')
        expect(game.scene.options.length).toBe(0)
      })

      it('non-advanceScene options are left untouched', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [
            option('Custom action', 'someOtherScript', { foo: 'bar' }),
          ],
          [text('Scene 3')],
        )])

        // Click Continue → Scene 2
        const continueBtn = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn.script)

        // Scene 2 has only the custom option — no Continue injected
        expect(game.scene.options.length).toBe(1)
        const opt = game.scene.options[0]
        expect(opt.script).toEqual(['someOtherScript', { foo: 'bar' }])
      })

      it('non-stack action clears the stack via takeAction', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [text('Scene 2')],
        )])
        expect(game.scene.stack.length).toBe(1) // pages on stack

        // takeAction with a non-advanceScene script clears the stack
        game.takeAction('endScene', {})
        expect(game.scene.stack.length).toBe(0)
      })

      it('does not mutate shared DSL objects across playthroughs', () => {
        // Build scenes once (simulating module-load-time registration)
        const dateScene = scenes(
          [text('Scene 1')],
          [
            text('Choose'),
            branch('Path A', text('Branch A')),
          ],
          [text('Scene 3 — after branch')],
        )

        // First playthrough
        game.clearScene()
        execAll(game, [dateScene])
        const cont1 = game.scene.options[0]
        game.clearScene()
        game.run(cont1.script) // Scene 2
        const pathA1 = game.scene.options[0]
        game.clearScene()
        game.run(pathA1.script) // Branch A
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        expect(game.scene.options.length).toBe(1) // Continue to Scene 3

        // Second playthrough — should produce identical results
        game.dismissScene()
        execAll(game, [dateScene])
        const cont2 = game.scene.options[0]
        game.clearScene()
        game.run(cont2.script) // Scene 2
        const pathA2 = game.scene.options[0]
        game.clearScene()
        game.run(pathA2.script) // Branch A
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        // CRITICAL: still exactly 1 Continue, not corrupted by first playthrough
        expect(game.scene.options.length).toBe(1)

        const finalCont = game.scene.options[0]
        game.clearScene()
        game.run(finalCont.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
        expect(game.scene.options.length).toBe(0)
      })

      it('single scene with branch works without outer continuation', () => {
        game.clearScene()
        execAll(game, [scenes(
          [
            branch('Path A', text('Branch A')),
          ],
        )])

        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        expect(game.scene.options.length).toBe(0) // No outer continuation
      })

      it('branch() helper works with inline instructions', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [
            text('Choose'),
            branch('Path A', text('Branch A content'), text('More A')),
            branch('Path B', text('Branch B content')),
          ],
          [text('Scene 3 — after branch')],
        )])

        // Click Continue → Scene 2
        const cont = game.scene.options[0]
        game.clearScene()
        game.run(cont.script)
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Path A')

        // Click Path A
        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.script)
        // Two content items from inline branch
        expect(game.scene.content.length).toBe(2)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A content')
        expect((game.scene.content[1] as any).content[0].text).toBe('More A')
        // Continue to Scene 3
        expect(game.scene.options.length).toBe(1)

        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
      })

      it('branch() helper works with multi-scene Instruction[][]', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [
            branch('Garden path', [
              [text('Garden scene 1')],
              [text('Garden scene 2')],
            ]),
          ],
          [text('After garden')],
        )])

        // Click Continue → Scene 2
        const cont = game.scene.options[0]
        game.clearScene()
        game.run(cont.script)
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Garden path')

        // Click Garden path → Garden scene 1
        const garden = game.scene.options[0]
        game.clearScene()
        game.run(garden.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Garden scene 1')
        expect(game.scene.options.length).toBe(1) // Continue

        // Continue → Garden scene 2
        const cont2 = game.scene.options[0]
        game.clearScene()
        game.run(cont2.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Garden scene 2')
        expect(game.scene.options.length).toBe(1) // Continue to After garden

        // Continue → After garden
        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('After garden')
        expect(game.scene.options.length).toBe(0)
      })

      it('scene stack survives JSON serialization', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [text('Scene 2')],
          [text('Scene 3')],
        )])
        expect(game.scene.stack.length).toBe(1)

        // Serialize and deserialize
        const json = game.toJSON()
        expect(json.scene.stack.length).toBe(1)

        const restored = Game.fromJSON(json)
        expect(restored.scene.stack.length).toBe(1)

        // Continue should still work after restore
        const continueBtn = restored.scene.options[0]
        restored.clearScene()
        restored.run(continueBtn.script)
        expect((restored.scene.content[0] as any).content[0].text).toBe('Scene 2')
      })

      it('dismissScene clears the stack', () => {
        game.clearScene()
        execAll(game, [scenes(
          [text('Scene 1')],
          [text('Scene 2')],
        )])
        expect(game.scene.stack.length).toBe(1)

        game.dismissScene()
        expect(game.scene.stack.length).toBe(0)
        expect(game.scene.options.length).toBe(0)
      })
    })

    describe('choice() and gatedBranch() execution', () => {
      beforeEach(() => {
        game.dismissScene()
      })

      it('choice() with epilogue runs epilogue inline (no extra Continue)', () => {
        const dateScene = scenes(
          [
            text('Choose'),
            choice(
              branch('Kiss', text('You kiss.')),
              branch('Leave', text('You leave.')),
              text('Shared ending.'),
            ),
          ],
        )
        execAll(game, [dateScene])

        // Two options shown
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Kiss')
        expect(game.scene.options[1].label).toBe('Leave')

        // Click Kiss — should show branch content AND epilogue on same page
        const kiss = game.scene.options[0]
        game.clearScene()
        game.run(kiss.script)
        expect(game.scene.content.length).toBe(2) // 'You kiss.' + 'Shared ending.'
        expect((game.scene.content[0] as any).content[0].text).toBe('You kiss.')
        expect((game.scene.content[1] as any).content[0].text).toBe('Shared ending.')
        // No extra Continue — epilogue merged inline
        expect(game.scene.options.length).toBe(0)
      })

      it('choice() inside scenes() resumes outer continuation via stack', () => {
        const dateScene = scenes(
          [text('Scene 1')],
          [
            text('Choose'),
            choice(
              branch('Path A', text('Branch A')),
              branch('Path B', text('Branch B')),
              text('Shared.'),
            ),
          ],
          [text('Scene 3 — after branch')],
        )
        execAll(game, [dateScene])

        // Scene 1 + Continue
        expect(game.scene.options.length).toBe(1)
        const cont1 = game.scene.options[0]
        game.clearScene()
        game.run(cont1.script)

        // Scene 2 — two branch options
        expect(game.scene.options.length).toBe(2)

        // Click Path A
        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.script)

        // Branch A content + epilogue on same page
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        expect((game.scene.content[1] as any).content[0].text).toBe('Shared.')
        // Continue button to Scene 3 (outer continuation on stack)
        expect(game.scene.options.length).toBe(1)

        // Click Continue → Scene 3
        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
        expect(game.scene.options.length).toBe(0)
      })

      it('gatedBranch with true condition shows option', () => {
        // Player starts with crown
        execAll(game, [
          gatedBranch(hasItem('crown'), 'Rich path', text('Gold!')),
          branch('Default', text('Normal.')),
        ])
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Rich path')
        expect(game.scene.options[1].label).toBe('Default')
      })

      it('gatedBranch with false condition hides option', () => {
        execAll(game, [
          gatedBranch(hasItem('nonexistent'), 'Hidden path', text('Secret!')),
          branch('Default', text('Normal.')),
        ])
        // Only the default branch should appear
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Default')
      })

      it('choice() with gatedBranch runs epilogue on chosen branch', () => {
        execAll(game, [
          choice(
            gatedBranch(hasItem('crown'), 'Rich path', text('Gold!')),
            branch('Default', text('Normal.')),
            text('Epilogue.'),
          ),
        ])

        // Player has crown, so both options shown
        expect(game.scene.options.length).toBe(2)

        // Click Rich path
        const richPath = game.scene.options[0]
        game.clearScene()
        game.run(richPath.script)
        expect(game.scene.content.length).toBe(2)
        expect((game.scene.content[0] as any).content[0].text).toBe('Gold!')
        expect((game.scene.content[1] as any).content[0].text).toBe('Epilogue.')
      })

      it('does not mutate shared choice() objects across playthroughs', () => {
        const dateScene = scenes(
          [text('Scene 1')],
          [
            choice(
              branch('A', text('Path A')),
              branch('B', text('Path B')),
              text('Shared.'),
            ),
          ],
          [text('After')],
        )

        // First playthrough
        execAll(game, [dateScene])
        const cont1 = game.scene.options[0]
        game.clearScene()
        game.run(cont1.script) // Scene 2 — branch options
        const a1 = game.scene.options[0]
        game.clearScene()
        game.run(a1.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Path A')
        expect((game.scene.content[1] as any).content[0].text).toBe('Shared.')
        expect(game.scene.options.length).toBe(1) // Continue to After

        // Second playthrough — should produce identical results
        game.dismissScene()
        execAll(game, [dateScene])
        const cont2 = game.scene.options[0]
        game.clearScene()
        game.run(cont2.script)
        const a2 = game.scene.options[0]
        game.clearScene()
        game.run(a2.script)
        expect((game.scene.content[0] as any).content[0].text).toBe('Path A')
        expect((game.scene.content[1] as any).content[0].text).toBe('Shared.')
        expect(game.scene.options.length).toBe(1) // Still exactly 1
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
