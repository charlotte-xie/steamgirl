/**
 * dresses.ts - Full dresses, gowns, and uniforms.
 */

import { registerItemDefinition, extendItem } from '../../model/Item'

registerItemDefinition(
  'dress-basic',
  extendItem('base-dress', {
    name: 'basic dress',
    description: 'A long, plain dress of sturdy cotton. Unremarkable but decent.',
    image: '/images/steamgirl/BasicDress.PNG',
    value: 10,
  })
)

registerItemDefinition(
  'dress-simple',
  extendItem('base-dress', {
    name: 'simple dress',
    description: 'A modest cotton dress in muted grey. Serviceable but unremarkable.',
    value: 15,
  })
)

registerItemDefinition(
  'dress-evening',
  extendItem('base-dress', {
    name: 'evening gown',
    description:
      'An elegant gown of midnight blue velvet with silver embroidery and a sweeping train.',
    value: 50,
    calcStats: (player) => {
      player.modifyStat('Agility', -4)
      player.modifyStat('appearance', 5)
    },
  })
)

registerItemDefinition(
  'dress-day',
  extendItem('base-dress', {
    name: 'day dress',
    description:
      'A tasteful dress of printed cotton with a fitted bodice and modest bustle.',
    value: 25,
    calcStats: (player) => {
      player.modifyStat('appearance', 3)
    },
  })
)

registerItemDefinition(
  'dress-maid',
  extendItem('base-dress', {
    name: 'maid uniform',
    description:
      'A black dress with white apron and cap. The standard attire for domestic service.',
    value: 10,
  })
)
