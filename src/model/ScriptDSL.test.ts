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
  stat,
  reputation,
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
  time,
  addQuest,
  completeQuest,
  addEffect,
  recordTime,
  scenes,
  scene,
  branch,
  choice,
  gatedBranch,
  menu,
  exit,
  // Execution
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
        expect(option('Click me', ['nextScript', { x: 1 }])).toEqual(['option', { label: 'Click me', action: ['nextScript', { x: 1 }] }])
        expect(option('Next')).toEqual(['option', { label: 'Next', action: 'next' }])
      })

      it('branch() with inline instructions wraps in seq push', () => {
        const result = branch('Kiss him', text('You kiss.'), addStat('Charm', 5))
        expect(result).toEqual(['option', {
          label: 'Kiss him',
          action: ['advanceScene', {
            push: [seq(text('You kiss.'), addStat('Charm', 5))],
          }],
        }])
      })

      it('branch() with scenes() wraps multi-page content', () => {
        const result = branch('Go to garden', scenes(
          scene(text('Scene 1')),
          scene(text('Scene 2')),
        ))
        expect(result).toEqual(['option', {
          label: 'Go to garden',
          action: ['advanceScene', {
            push: [seq(scenes(
              scene(text('Scene 1')),
              scene(text('Scene 2')),
            ))],
          }],
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

      it('random() filters out falsy entries', () => {
        const result = random(text('A'), false, null, undefined, 0, text('B'))
        expect(result).toEqual(['random', {
          children: [
            ['text', { parts: ['A'] }],
            ['text', { parts: ['B'] }],
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
        expect(skillCheck('Flirtation', 10, text('Success!'), text('Fail!'))).toEqual(['skillCheck', {
          skill: 'Flirtation',
          difficulty: 10,
          onSuccess: ['text', { parts: ['Success!'] }],
          onFailure: ['text', { parts: ['Fail!'] }]
        }])
      })

      it('skillCheck() with seq() callbacks', () => {
        expect(skillCheck('Charm', 12, seq('You charm them.', say('Wow!')), seq('You fumble.'))).toEqual(['skillCheck', {
          skill: 'Charm',
          difficulty: 12,
          onSuccess: seq('You charm them.', say('Wow!')),
          onFailure: seq('You fumble.'),
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

      it('time() produces timeLapse instruction', () => {
        expect(time(30)).toEqual(['timeLapse', { minutes: 30 }])
      })

      it('addStat() produces addStat instruction', () => {
        expect(addStat('Dexterity', 5)).toEqual(['addStat', { stat: 'Dexterity', change: 5 }])
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

      it('stat() produces stat instruction', () => {
        expect(stat('Dexterity', 30)).toEqual(['stat', { stat: 'Dexterity', min: 30, max: undefined }])
        expect(stat('Dexterity', 10, 50)).toEqual(['stat', { stat: 'Dexterity', min: 10, max: 50 }])
      })

      it('inLocation() produces inLocation instruction', () => {
        expect(inLocation('tavern')).toEqual(['inLocation', { location: 'tavern' }])
      })

      it('inScene() produces inScene instruction', () => {
        expect(inScene()).toEqual(['inScene', {}])
      })

      it('npcStat() produces npcStat instruction', () => {
        expect(npcStat('trust', { npc: 'barkeeper', min: 50 })).toEqual(['npcStat', { npc: 'barkeeper', stat: 'trust', min: 50 }])
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
      it('scene() wraps elements in seq', () => {
        const result = scene(text('A'), text('B'))
        expect(result).toEqual(seq(text('A'), text('B')))
      })

      it('scene() converts strings to text()', () => {
        const result = scene('Hello', text('B'))
        expect(result).toEqual(seq(text('Hello'), text('B')))
      })

      it('scene() works inside scenes()', () => {
        const withScene = scenes(
          scene(text('A')),
          scene(text('B')),
        )
        const withoutScene = scenes(
          seq(text('A')),
          seq(text('B')),
        )
        expect(withScene).toEqual(withoutScene)
      })

      it('scenes() accepts strings as pages', () => {
        // Plain strings are auto-wrapped in text()
        const result = scenes('Page A', 'Page B')
        expect(result).toEqual(seq(
          text('Page A'),
          run('pushScenePages', { pages: [text('Page B')] }),
        ))
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

        // Both branches should have the epilogue merged via seq wrapping
        const [, params] = result
        const instructions = (params as { instructions: Instruction[] }).instructions

        // First branch (Kiss): action = ['advanceScene', { push: [seq(...)] }]
        const [, kissParams] = instructions[0]
        const kissPush = (kissParams as any).action[1].push
        expect(kissPush).toEqual([
          seq(seq(text('You kiss.')), addStat('Charm', 5)),
        ])

        // Second branch (Leave): action = ['advanceScene', { push: [seq(...)] }]
        const [, leaveParams] = instructions[1]
        const leavePush = (leaveParams as any).action[1].push
        expect(leavePush).toEqual([
          seq(seq(text('You leave.')), addStat('Charm', 5)),
        ])
      })

      it('choice() with multi-scene branch appends epilogue to branch content', () => {
        const branchContent = scenes(
          scene(text('Scene 1')),
          scene(text('Scene 2')),
        )
        const result = choice(
          branch('Garden', branchContent),
          text('Epilogue text'),
        )

        const [, params] = result
        const instructions = (params as { instructions: Instruction[] }).instructions
        const [, branchParams] = instructions[0]
        const push = (branchParams as any).action[1].push

        // Single push entry: seq(branch content, epilogue)
        expect(push).toHaveLength(1)
        expect(push[0]).toEqual(seq(seq(branchContent), text('Epilogue text')))
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

      it('gatedBranch() with scenes() produces when(condition, branch(scenes(...)))', () => {
        const multiPage = scenes(
          scene(text('Scene 1')),
          scene(text('Scene 2')),
        )
        const result = gatedBranch(
          npcStat('affection', { npc: 'npc', min: 35 }),
          'Hidden path',
          multiPage,
        )
        expect(result).toEqual(
          when(npcStat('affection', { npc: 'npc', min: 35 }), branch('Hidden path', multiPage))
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
        const innerPush = (innerBranch as any)[1].action[1].push
        expect(innerPush).toEqual([seq(seq(text('Gold!')), addStat('Charm', 1))])

        // Second instruction is the plain branch
        const [, defaultParams] = instructions[1]
        const defaultPush = (defaultParams as any).action[1].push
        expect(defaultPush).toEqual([seq(seq(text('Normal.')), addStat('Charm', 1))])
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
            option('Next', ['next', { x: 1 }])
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
        expect(game.run(hasItem('crown'))).toBe(true)
        expect(game.run(hasItem('crown', 100))).toBe(true)
        expect(game.run(hasItem('crown', 200))).toBe(false)
        expect(game.run(hasItem('nonexistent'))).toBe(false)
      })

      it('stat checks player stats', () => {
        // Player starts with Dexterity 30
        expect(game.run(stat('Dexterity', 30))).toBe(true)
        expect(game.run(stat('Dexterity', 50))).toBe(false)
        expect(game.run(stat('Dexterity', 0, 50))).toBe(true)
        expect(game.run(stat('Dexterity', 0, 20))).toBe(false)
      })

      it('inLocation checks current location', () => {
        expect(game.run(inLocation('station'))).toBe(true)
        expect(game.run(inLocation('tavern'))).toBe(false)
      })

      it('inScene checks if scene has options', () => {
        // After init, scene has options
        expect(game.run(inScene())).toBe(true)
        game.clearScene()
        expect(game.run(inScene())).toBe(false)
        game.addOption('test', 'Test')
        expect(game.run(inScene())).toBe(true)
      })

      it('hasCard checks player cards', () => {
        // Add a quest manually for testing
        game.addQuest('find-lodgings', { silent: true })
        expect(game.run(hasCard('find-lodgings'))).toBe(true)
        expect(game.run(hasCard('nonexistent'))).toBe(false)
      })

      it('not inverts predicates', () => {
        expect(game.run(not(hasItem('crown')))).toBe(false)
        expect(game.run(not(hasItem('nonexistent')))).toBe(true)
      })

      it('and combines predicates', () => {
        expect(game.run(and(hasItem('crown'), inLocation('station')))).toBe(true)
        expect(game.run(and(hasItem('crown'), inLocation('tavern')))).toBe(false)
      })

      it('or combines predicates', () => {
        expect(game.run(or(hasItem('nonexistent'), inLocation('station')))).toBe(true)
        expect(game.run(or(hasItem('nonexistent'), inLocation('tavern')))).toBe(false)
      })
    })

    describe('Instructions', () => {
      beforeEach(() => {
        game.clearScene()
      })

      it('text adds to scene content', () => {
        game.run(text('Hello world'))
        expect(game.scene.content.length).toBe(1)
        expect(game.scene.content[0]).toEqual({
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }]
        })
      })

      it('paragraph adds formatted paragraph', () => {
        game.run(
          paragraph('Hello ', hl('world', '#ff0000', 'Earth'), '!')
        )
        expect(game.scene.content.length).toBe(1)
        const para = game.scene.content[0]
        expect(para.type).toBe('paragraph')
      })

      it('say adds speech content', () => {
        game.run(say('Welcome!'))
        expect(game.scene.content.length).toBe(1)
        expect(game.scene.content[0]).toEqual({
          type: 'speech',
          text: 'Welcome!',
          color: undefined
        })
      })

      it('option adds scene option', () => {
        game.run(option('Click me', ['testScript', { foo: 'bar' }]))
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0]).toEqual({
          type: 'button',
          action: ['testScript', { foo: 'bar' }],
          label: 'Click me'
        })
      })

      it('when executes conditionally - true', () => {
        game.run(
          when(hasItem('crown'), text('You have gold!'))
        )
        expect(game.scene.content.length).toBe(1)
      })

      it('when executes conditionally - false', () => {
        game.run(
          when(hasItem('nonexistent'), text('You have something'))
        )
        expect(game.scene.content.length).toBe(0)
      })

      it('when with multiple expressions (variadic)', () => {
        game.run(
          when(hasItem('crown'),
            text('Line 1'),
            text('Line 2'),
            text('Line 3')
          )
        )
        expect(game.scene.content.length).toBe(3)
      })

      it('unless executes when condition is false', () => {
        game.run(
          unless(hasItem('nonexistent'), text('You do not have it'))
        )
        expect(game.scene.content.length).toBe(1)

        game.clearScene()

        game.run(
          unless(hasItem('crown'), text('Missing crown'))
        )
        expect(game.scene.content.length).toBe(0)
      })

      it('unless with multiple expressions', () => {
        game.run(
          unless(hasItem('nonexistent'),
            text('Line 1'),
            text('Line 2')
          )
        )
        expect(game.scene.content.length).toBe(2)
      })

      it('cond with 3 args is if/else', () => {
        // True branch
        game.run(
          cond(hasItem('crown'), text('Rich!'), text('Poor!'))
        )
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Rich!')

        game.clearScene()

        // False branch
        game.run(
          cond(hasItem('nonexistent'), text('Rich!'), text('Poor!'))
        )
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Poor!')
      })

      it('cond with multiple branches', () => {
        // First branch matches
        game.run(
          cond(
            hasItem('crown'), text('Has crown'),
            hasItem('sword'), text('Has sword'),
            text('Has nothing')
          )
        )
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Has crown')

        game.clearScene()

        // No branch matches, uses default
        game.run(
          cond(
            hasItem('nonexistent1'), text('Has 1'),
            hasItem('nonexistent2'), text('Has 2'),
            text('Default')
          )
        )
        expect((game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text).toBe('Default')
      })

      it('seq runs instructions in sequence', () => {
        game.run(
          seq(text('A'), text('B'), text('C'))
        )
        expect(game.scene.content.length).toBe(3)
      })

      it('random executes one random child', () => {
        // Run multiple times to verify it picks one
        for (let i = 0; i < 10; i++) {
          game.clearScene()
          game.run(random(text('A'), text('B'), text('C')))
          expect(game.scene.content.length).toBe(1)
          const txt = (game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text
          expect(['A', 'B', 'C']).toContain(txt)
        }
      })

      it('random with when() only includes entries whose condition passes', () => {
        // Set up: player has gangster rep but not socialite
        game.player.reputation.set('gangster', 50)

        vi.spyOn(Math, 'random').mockReturnValue(0) // always pick first eligible
        try {
          game.run(random(
            when(reputation('gangster', { min: 40 }), text('Feared')),
            when(reputation('socialite', { min: 30 }), text('Posh')),
            text('Default'),
          ))
          // Pool: [Feared, Default] (socialite condition fails). Index 0 → Feared
          expect(game.scene.content.length).toBe(1)
          const txt = (game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text
          expect(txt).toBe('Feared')
        } finally {
          vi.restoreAllMocks()
        }
      })

      it('random falls back to defaults when no when() conditions pass', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)
        try {
          game.run(random(
            when(reputation('gangster', { min: 99 }), text('Feared')),
            text('Quiet street'),
          ))
          // Pool: [Quiet street] only. Feared condition fails (gangster = 0)
          expect(game.scene.content.length).toBe(1)
          const txt = (game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text
          expect(txt).toBe('Quiet street')
        } finally {
          vi.restoreAllMocks()
        }
      })

      it('random does nothing when pool is empty', () => {
        game.run(random(
          when(reputation('gangster', { min: 99 }), text('Feared')),
        ))
        expect(game.scene.content.length).toBe(0)
      })

      it('random skips falsy entries at execution time', () => {
        // Simulate falsy entries in the children array (as if built manually)
        const instr: [string, Record<string, unknown>] = ['random', {
          children: [null, false, 0, undefined, ['text', { parts: ['Survived'] }]]
        }]
        game.run(instr)
        expect(game.scene.content.length).toBe(1)
        const txt = (game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text
        expect(txt).toBe('Survived')
      })

      it('skillCheck as predicate returns boolean', () => {
        // With no callbacks, returns boolean
        const result = game.run(skillCheck('Flirtation', 0))
        expect(typeof result).toBe('boolean')
      })

      it('skillCheck with callbacks executes appropriate branch', () => {
        // Mock Math.random to return a value that results in roll 50 (not 100, which always fails)
        vi.spyOn(Math, 'random').mockReturnValue(0.49)
        try {
          game.run(
            skillCheck('Flirtation', -100, text('Success!'), text('Failure!'))
          )
          expect(game.scene.content.length).toBe(1)
          // With difficulty -100 and roll 50, should succeed (threshold = stat + skill + 100 > 50)
          const txt = (game.scene.content[0] as { type: string; content: { text: string }[] }).content[0].text
          expect(txt).toBe('Success!')
        } finally {
          vi.restoreAllMocks()
        }
      })

      it('move changes location', () => {
        game.run(move('default'))
        expect(game.currentLocation).toBe('default')
      })

      it('addItem adds to inventory', () => {
        const initialCount = game.player.inventory.find(i => i.id === 'crown')?.number ?? 0
        game.run(addItem('crown', 10))
        const newCount = game.player.inventory.find(i => i.id === 'crown')?.number ?? 0
        expect(newCount).toBe(initialCount + 10)
      })

      it('addStat modifies player stats', () => {
        const initial = game.player.basestats.get('Dexterity') ?? 0
        game.run(addStat('Dexterity', 5))
        expect(game.player.basestats.get('Dexterity')).toBe(initial + 5)
      })

      it('recordTime records current time to a timer', () => {
        const currentTime = game.time
        game.run(recordTime('lastEat'))
        expect(game.player.timers.get('lastEat')).toBe(currentTime)
      })

      it('timeElapsed returns true when no timer recorded', () => {
        // Unrecorded timer should return true (long enough ago)
        const result = game.run(timeElapsed('unrecorded', 60))
        expect(result).toBe(true)
      })

      it('timeElapsed returns false when not enough time passed', () => {
        game.run(recordTime('testTimer'))
        // Just recorded, so 60 minutes hasn't passed
        const result = game.run(timeElapsed('testTimer', 60))
        expect(result).toBe(false)
      })

      it('timeElapsed returns true when enough time passed', () => {
        game.run(recordTime('testTimer'))
        // Advance time by 61 minutes (3660 seconds)
        game.time += 3660
        const result = game.run(timeElapsed('testTimer', 60))
        expect(result).toBe(true)
      })

      it('recordTime throws on missing timer name', () => {
        expect(() => game.run(['recordTime', {}])).toThrow('recordTime requires a timer parameter')
      })

      it('timeElapsed throws on missing parameters', () => {
        expect(() => game.run(['timeElapsed', {}])).toThrow('timeElapsed requires a timer parameter')
        expect(() => game.run(['timeElapsed', { timer: 'test' }])).toThrow('timeElapsed requires a minutes parameter')
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
        game.run(scenes('Only scene'))
        expect(game.scene.content.length).toBe(1)
        expect(game.scene.options.length).toBe(0)
        expect(game.hasPages).toBe(false)
      })

      it('scenes with multiple scenes pushes remaining onto stack', () => {
        game.clearScene()
        game.run(scenes('Scene 1', 'Scene 2', 'Scene 3'))
        // Scene 1 content shown
        expect(game.scene.content.length).toBe(1)
        // Continue button (via pushScenePages)
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Continue')
        // Stack has remaining pages (1 frame with 2 pages)
        expect(game.hasPages).toBe(true)
        expect(game.scene.stack[0].pages.length).toBe(2)
      })

      it('Continue button advances through all scenes via stack', () => {
        game.clearScene()
        game.run(scenes('Scene 1', 'Scene 2', 'Scene 3'))

        // Click Continue → Scene 2
        const continueBtn1 = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn1.action)
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 2')
        expect(game.scene.options.length).toBe(1) // Continue to Scene 3

        // Click Continue → Scene 3
        const continueBtn2 = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn2.action)
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3')
        expect(game.scene.options.length).toBe(0) // No more scenes
        expect(game.hasPages).toBe(false) // Stack fully drained
      })

      it('branch within scenes resumes outer continuation from stack', () => {
        game.clearScene()
        game.run(scenes(
          'Scene 1',
          scene(
            text('Choose a path'),
            branch('Path A', text('Branch A content')),
            branch('Path B', text('Branch B content')),
          ),
          'Scene 3 — after branch',
          'Scene 4 — finale',
        ))

        // Click Continue → Scene 2 (the branching scene)
        const continueBtn = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn.action)

        // Scene 2 shows its content and two branch options
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Choose a path')
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Path A')
        expect(game.scene.options[1].label).toBe('Path B')

        // Click Path A → branch pushes its pages, then pops and runs
        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.action)
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A content')
        // Continue to Scene 3 (outer continuation on stack)
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Continue')

        // Click Continue → Scene 3
        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
        expect(game.scene.options.length).toBe(1) // Continue to Scene 4

        // Click Continue → Scene 4
        const cont4 = game.scene.options[0]
        game.clearScene()
        game.run(cont4.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 4 — finale')
        expect(game.scene.options.length).toBe(0)
      })

      it('Path B also reaches outer continuation via stack', () => {
        game.clearScene()
        game.run(scenes(
          'Scene 1',
          scene(
            branch('Path A', text('Branch A')),
            branch('Path B', text('Branch B')),
          ),
          'After branch',
        ))

        // Click Continue → Scene 2
        const continueBtn = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn.action)
        expect(game.scene.options.length).toBe(2)

        // Click Path B
        const pathB = game.scene.options[1]
        game.clearScene()
        game.run(pathB.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch B')
        expect(game.scene.options.length).toBe(1) // Continue

        const cont = game.scene.options[0]
        game.clearScene()
        game.run(cont.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('After branch')
        expect(game.scene.options.length).toBe(0)
      })

      it('non-advanceScene options are left untouched', () => {
        game.clearScene()
        game.run(scenes(
          'Scene 1',
          option('Custom action', ['someOtherScript', { foo: 'bar' }]),
          'Scene 3',
        ))

        // Click Continue → Scene 2
        const continueBtn = game.scene.options[0]
        game.clearScene()
        game.run(continueBtn.action)

        // Scene 2 has only the custom option — no Continue injected
        expect(game.scene.options.length).toBe(1)
        const opt = game.scene.options[0]
        expect(opt.action).toEqual(['someOtherScript', { foo: 'bar' }])
      })

      it('non-stack action clears the stack via afterAction cleanup', () => {
        game.clearScene()
        game.run(scenes('Scene 1', 'Scene 2'))
        expect(game.hasPages).toBe(true) // pages on stack

        // takeAction runs the action; afterAction cleans up when no options remain
        game.takeAction('endScene')
        expect(game.hasPages).toBe(true) // stack still intact after takeAction
        game.afterAction()
        expect(game.hasPages).toBe(false) // afterAction cleaned up
      })

      it('does not mutate shared DSL objects across playthroughs', () => {
        // Build scenes once (simulating module-load-time registration)
        const dateScene = scenes(
          'Scene 1',
          scene(
            text('Choose'),
            branch('Path A', text('Branch A')),
          ),
          'Scene 3 — after branch',
        )

        // First playthrough
        game.clearScene()
        game.run(dateScene)
        const cont1 = game.scene.options[0]
        game.clearScene()
        game.run(cont1.action) // Scene 2
        const pathA1 = game.scene.options[0]
        game.clearScene()
        game.run(pathA1.action) // Branch A
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        expect(game.scene.options.length).toBe(1) // Continue to Scene 3

        // Second playthrough — should produce identical results
        game.dismissScene()
        game.run(dateScene)
        const cont2 = game.scene.options[0]
        game.clearScene()
        game.run(cont2.action) // Scene 2
        const pathA2 = game.scene.options[0]
        game.clearScene()
        game.run(pathA2.action) // Branch A
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        // CRITICAL: still exactly 1 Continue, not corrupted by first playthrough
        expect(game.scene.options.length).toBe(1)

        const finalCont = game.scene.options[0]
        game.clearScene()
        game.run(finalCont.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
        expect(game.scene.options.length).toBe(0)
      })

      it('single scene with branch works without outer continuation', () => {
        game.clearScene()
        game.run(scenes(
          branch('Path A', text('Branch A')),
        ))

        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        expect(game.scene.options.length).toBe(0) // No outer continuation
      })

      it('branch() helper works with inline instructions', () => {
        game.clearScene()
        game.run(scenes(
          'Scene 1',
          scene(
            text('Choose'),
            branch('Path A', text('Branch A content'), text('More A')),
            branch('Path B', text('Branch B content')),
          ),
          'Scene 3 — after branch',
        ))

        // Click Continue → Scene 2
        const cont = game.scene.options[0]
        game.clearScene()
        game.run(cont.action)
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Path A')

        // Click Path A
        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.action)
        // Two content items from inline branch
        expect(game.scene.content.length).toBe(2)
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A content')
        expect((game.scene.content[1] as any).content[0].text).toBe('More A')
        // Continue to Scene 3
        expect(game.scene.options.length).toBe(1)

        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
      })

      it('branch() helper works with multi-page branch via scenes()', () => {
        game.clearScene()
        game.run(scenes(
          'Scene 1',
          branch('Garden path', scenes(
            text('Garden scene 1'),
            text('Garden scene 2'),
          )),
          'After garden',
        ))

        // Click Continue → Scene 2
        const cont = game.scene.options[0]
        game.clearScene()
        game.run(cont.action)
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Garden path')

        // Click Garden path → Garden scene 1
        const garden = game.scene.options[0]
        game.clearScene()
        game.run(garden.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Garden scene 1')
        expect(game.scene.options.length).toBe(1) // Continue

        // Continue → Garden scene 2
        const cont2 = game.scene.options[0]
        game.clearScene()
        game.run(cont2.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Garden scene 2')
        expect(game.scene.options.length).toBe(1) // Continue to After garden

        // Continue → After garden
        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('After garden')
        expect(game.scene.options.length).toBe(0)
      })

      it('scene stack survives JSON serialization', () => {
        game.clearScene()
        game.run(scenes('Scene 1', 'Scene 2', 'Scene 3'))
        expect(game.scene.stack[0].pages.length).toBe(2)

        // Serialize and deserialize
        const json = game.toJSON()
        expect(json.scene.stack[0].pages.length).toBe(2)

        const restored = Game.fromJSON(json)
        expect(restored.scene.stack[0].pages.length).toBe(2)

        // Continue should still work after restore
        const continueBtn = restored.scene.options[0]
        restored.clearScene()
        restored.run(continueBtn.action)
        expect((restored.scene.content[0] as any).content[0].text).toBe('Scene 2')
      })

      it('dismissScene clears the stack', () => {
        game.clearScene()
        game.run(scenes('Scene 1', 'Scene 2'))
        expect(game.hasPages).toBe(true)

        game.dismissScene()
        expect(game.hasPages).toBe(false)
        expect(game.scene.options.length).toBe(0)
      })
    })

    describe('choice() and gatedBranch() execution', () => {
      beforeEach(() => {
        game.dismissScene()
      })

      it('choice() with epilogue runs epilogue inline (no extra Continue)', () => {
        const dateScene = scenes(
          scene(
            text('Choose'),
            choice(
              branch('Kiss', 'You kiss.'),
              branch('Leave', 'You leave.'),
              'Shared ending.',
            ),
          ),
        )
        game.run(dateScene)

        // Two options shown
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Kiss')
        expect(game.scene.options[1].label).toBe('Leave')

        // Click Kiss — should show branch content AND epilogue on same page
        const kiss = game.scene.options[0]
        game.clearScene()
        game.run(kiss.action)
        expect(game.scene.content.length).toBe(2) // 'You kiss.' + 'Shared ending.'
        expect((game.scene.content[0] as any).content[0].text).toBe('You kiss.')
        expect((game.scene.content[1] as any).content[0].text).toBe('Shared ending.')
        // No extra Continue — epilogue merged inline
        expect(game.scene.options.length).toBe(0)
      })

      it('choice() inside scenes() resumes outer continuation via stack', () => {
        const dateScene = scenes(
          'Scene 1',
          scene(
            text('Choose'),
            choice(
              branch('Path A', 'Branch A'),
              branch('Path B', 'Branch B'),
              'Shared.',
            ),
          ),
          'Scene 3 — after branch',
        )
        game.run(dateScene)

        // Scene 1 + Continue
        expect(game.scene.options.length).toBe(1)
        const cont1 = game.scene.options[0]
        game.clearScene()
        game.run(cont1.action)

        // Scene 2 — two branch options
        expect(game.scene.options.length).toBe(2)

        // Click Path A
        const pathA = game.scene.options[0]
        game.clearScene()
        game.run(pathA.action)

        // Branch A content + epilogue on same page
        expect((game.scene.content[0] as any).content[0].text).toBe('Branch A')
        expect((game.scene.content[1] as any).content[0].text).toBe('Shared.')
        // Continue button to Scene 3 (outer continuation on stack)
        expect(game.scene.options.length).toBe(1)

        // Click Continue → Scene 3
        const cont3 = game.scene.options[0]
        game.clearScene()
        game.run(cont3.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Scene 3 — after branch')
        expect(game.scene.options.length).toBe(0)
      })

      it('gatedBranch with true condition shows option', () => {
        // Player starts with crown
        game.run(seq(
          gatedBranch(hasItem('crown'), 'Rich path', text('Gold!')),
          branch('Default', text('Normal.')),
        ))
        expect(game.scene.options.length).toBe(2)
        expect(game.scene.options[0].label).toBe('Rich path')
        expect(game.scene.options[1].label).toBe('Default')
      })

      it('gatedBranch with false condition hides option', () => {
        game.run(seq(
          gatedBranch(hasItem('nonexistent'), 'Hidden path', text('Secret!')),
          branch('Default', text('Normal.')),
        ))
        // Only the default branch should appear
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Default')
      })

      it('choice() with gatedBranch runs epilogue on chosen branch', () => {
        game.run(
          choice(
            gatedBranch(hasItem('crown'), 'Rich path', text('Gold!')),
            branch('Default', text('Normal.')),
            text('Epilogue.'),
          ),
        )

        // Player has crown, so both options shown
        expect(game.scene.options.length).toBe(2)

        // Click Rich path
        const richPath = game.scene.options[0]
        game.clearScene()
        game.run(richPath.action)
        expect(game.scene.content.length).toBe(2)
        expect((game.scene.content[0] as any).content[0].text).toBe('Gold!')
        expect((game.scene.content[1] as any).content[0].text).toBe('Epilogue.')
      })

      it('does not mutate shared choice() objects across playthroughs', () => {
        const dateScene = scenes(
          'Scene 1',
          choice(
            branch('A', 'Path A'),
            branch('B', 'Path B'),
            'Shared.',
          ),
          'After',
        )

        // First playthrough
        game.run(dateScene)
        const cont1 = game.scene.options[0]
        game.clearScene()
        game.run(cont1.action) // Scene 2 — branch options
        const a1 = game.scene.options[0]
        game.clearScene()
        game.run(a1.action)
        expect((game.scene.content[0] as any).content[0].text).toBe('Path A')
        expect((game.scene.content[1] as any).content[0].text).toBe('Shared.')
        expect(game.scene.options.length).toBe(1) // Continue to After

        // Second playthrough — should produce identical results
        game.dismissScene()
        game.run(dateScene)
        const cont2 = game.scene.options[0]
        game.clearScene()
        game.run(cont2.action)
        const a2 = game.scene.options[0]
        game.clearScene()
        game.run(a2.action)
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
              option('Buy an ale', ['buyAle', { price: 2 }]),
              option('Buy wine', ['buyWine', { price: 5 }])
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

    describe('menu() and exit()', () => {
      let game: Game

      beforeEach(() => {
        game = new Game()
        game.run('init', {})
        game.clearScene()
      })

      it('presents branch and exit options', () => {
        game.run(menu(
          branch('Option A', text('You chose A.')),
          branch('Option B', text('You chose B.')),
          exit('Leave', text('Goodbye.')),
        ))

        expect(game.scene.options).toHaveLength(3)
        expect(game.scene.options[0].label).toBe('Option A')
        expect(game.scene.options[1].label).toBe('Option B')
        expect(game.scene.options[2].label).toBe('Leave')
      })

      it('non-exit branch loops back to the menu', () => {
        game.run(menu(
          branch('Drink', text('You drink.')),
          exit('Leave', text('Goodbye.')),
        ))

        // Click "Drink"
        const drinkScript = game.scene.options[0].action
        expect(game.scene.options[0].label).toBe('Drink')
        game.clearScene()
        game.run(drinkScript)

        // Branch content runs, then Continue to re-show menu
        expect(game.scene.content.length).toBeGreaterThan(0)
        expect(game.scene.options).toHaveLength(1)
        expect(game.scene.options[0].label).toBe('Continue')

        // Click Continue — menu re-appears
        const continueScript = game.scene.options[0].action
        game.clearScene()
        game.run(continueScript)

        expect(game.scene.options).toHaveLength(2)
        expect(game.scene.options[0].label).toBe('Drink')
        expect(game.scene.options[1].label).toBe('Leave')
      })

      it('exit branch does not loop back', () => {
        game.run(menu(
          branch('Drink', text('You drink.')),
          exit('Leave', text('Goodbye.')),
        ))

        // Click "Leave"
        const leaveOption = game.scene.options[1]
        expect(leaveOption.label).toBe('Leave')
        game.clearScene()
        game.run(leaveOption.action)

        // Exit content runs, no Continue button (stack is empty)
        expect(game.scene.content.length).toBeGreaterThan(0)
        expect(game.scene.options).toHaveLength(0)
      })

      it('when() gates menu entries', () => {
        game.player.basestats.set('Flirtation', 5)
        game.player.calcStats()

        game.run(menu(
          when(stat('Flirtation', 20),
            branch('Kiss', text('You kiss.')),
          ),
          branch('Chat', text('You chat.')),
          exit('Leave', text('Goodbye.')),
        ))

        // Kiss should not appear (Flirtation < 20)
        expect(game.scene.options).toHaveLength(2)
        expect(game.scene.options[0].label).toBe('Chat')
        expect(game.scene.options[1].label).toBe('Leave')
      })

      it('gated entry appears when condition is met', () => {
        game.player.basestats.set('Flirtation', 25)
        game.player.calcStats()

        game.run(menu(
          when(stat('Flirtation', 20),
            branch('Kiss', text('You kiss.')),
          ),
          branch('Chat', text('You chat.')),
          exit('Leave', text('Goodbye.')),
        ))

        // Kiss should appear (Flirtation >= 20)
        expect(game.scene.options).toHaveLength(3)
        expect(game.scene.options[0].label).toBe('Kiss')
      })

      it('when() gates exit entries', () => {
        game.player.basestats.set('Arousal', 10)
        game.player.calcStats()

        game.run(menu(
          branch('Kiss', text('You kiss.'), addStat('Arousal', 5, { max: 100 })),
          when(stat('Arousal', 50),
            exit('Things escalate...', text('...')),
          ),
          exit('Leave', text('Goodbye.')),
        ))

        // "Things escalate" should not appear (Arousal < 50)
        expect(game.scene.options).toHaveLength(2)
        expect(game.scene.options[0].label).toBe('Kiss')
        expect(game.scene.options[1].label).toBe('Leave')
      })

      it('conditions are re-evaluated on each menu display', () => {
        game.player.basestats.set('Arousal', 0)
        game.player.calcStats()

        game.run(menu(
          branch('Kiss', addStat('Arousal', 30, { max: 100, hidden: true })),
          when(stat('Arousal', 25),
            exit('Things get heated...', text('...')),
          ),
          exit('Leave', text('Goodbye.')),
        ))

        // Initially 2 options (Kiss + Leave)
        expect(game.scene.options).toHaveLength(2)

        // Click "Kiss" to raise Arousal
        const kissScript = game.scene.options[0].action
        game.clearScene()
        game.run(kissScript)

        // Continue back to menu
        const continueScript = game.scene.options[0].action
        game.clearScene()
        game.run(continueScript)

        // Now "Things get heated" should appear (Arousal >= 25)
        expect(game.scene.options).toHaveLength(3)
        expect(game.scene.options.some(o => o.label === 'Things get heated...')).toBe(true)
      })
    })

    describe('random() with strings', () => {
      let game: Game

      beforeEach(() => {
        game = new Game()
        game.run('init', {})
        game.clearScene()
      })

      it('accepts plain strings as arguments', () => {
        // random() should accept strings and auto-convert to text()
        vi.spyOn(Math, 'random').mockReturnValue(0) // always pick first

        game.run(random('Hello', 'World'))

        expect(game.scene.content.length).toBe(1)
        vi.restoreAllMocks()
      })

      it('mixes strings and instructions', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.99) // pick last

        game.run(random('Plain text', addStat('Mood', 1, { hidden: true })))

        // Last entry is addStat, which doesn't add to content but modifies stat
        vi.restoreAllMocks()
      })
    })

    describe('StackFrame and frame-level clearing', () => {
      it('pushFrame / popFrame basics', () => {
        game.scene.stack = []
        expect(game.hasPages).toBe(false)

        game.pushFrame([text('page1'), text('page2')])
        expect(game.hasPages).toBe(true)
        expect(game.scene.stack.length).toBe(1)
        expect(game.scene.stack[0].pages.length).toBe(2)

        const popped = game.popFrame()
        expect(popped).toBeDefined()
        expect(popped!.pages.length).toBe(2)
        expect(game.hasPages).toBe(false)
      })

      it('topFrame creates frame lazily', () => {
        game.scene.stack = []
        const frame = game.topFrame
        expect(frame).toBeDefined()
        expect(frame.pages).toEqual([])
        expect(game.scene.stack.length).toBe(1)
      })

      it('hasPages returns false for empty frames', () => {
        game.scene.stack = [{ pages: [] }]
        expect(game.hasPages).toBe(false)
      })

      it('afterAction cleans up abandoned stack when no options remain', () => {
        // Set up two frames: outer (parent) and inner (current)
        game.scene.stack = []
        game.pushFrame([text('outer continuation')])
        game.pushFrame([text('inner page 1'), text('inner page 2')])
        expect(game.scene.stack.length).toBe(2)

        // Fire-and-forget action: takeAction just runs it
        game.takeAction(['endScene', {}])
        // Stack still intact after takeAction (no special-casing)
        expect(game.scene.stack.length).toBe(2)

        // afterAction cleans up since endScene produced no options
        game.afterAction()
        expect(game.scene.stack.length).toBe(0)
        expect(game.hasPages).toBe(false)
      })

      it('advanceScene preserves stack and pops pages normally', () => {
        game.scene.stack = []
        game.pushFrame([text('page 1'), text('page 2')])

        // advanceScene does NOT pop the frame — it pops pages within it
        game.clearScene()
        game.run('advanceScene')
        expect(game.scene.content.length).toBe(1)
        expect((game.scene.content[0] as any).content[0].text).toBe('page 1')
        expect(game.scene.stack[0].pages.length).toBe(1) // page 2 remains
      })

      it('advanceScene pops exhausted frames to reach parent', () => {
        game.scene.stack = []
        game.pushFrame([text('parent page')])
        game.pushFrame([text('child page')])

        // First advance: pops child page
        game.clearScene()
        game.run('advanceScene')
        expect((game.scene.content[0] as any).content[0].text).toBe('child page')

        // Child frame exhausted, parent has a page — Continue should appear
        expect(game.scene.options.length).toBe(1)
        expect(game.scene.options[0].label).toBe('Continue')

        // Second advance: child frame auto-popped, parent page runs
        game.clearScene()
        game.run('advanceScene')
        expect((game.scene.content[0] as any).content[0].text).toBe('parent page')
        expect(game.hasPages).toBe(false)
      })
    })
  })
})
