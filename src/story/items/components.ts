/**
 * components.ts - Mechanical parts, crystals, and crafting materials.
 *
 * Components are typically stackable.
 */

import { registerItemDefinition } from '../../model/Item'

registerItemDefinition('brass-cog', {
  name: 'brass cog',
  description: 'A well-machined brass cog with smooth teeth. A fundamental building block of any mechanism.',
  category: 'Components',
  value: 2,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('brass-trinket', {
  name: 'brass trinket',
  description: 'A small, intricate brass trinket with delicate gears that catch the light.',
  category: 'Components',
  value: 6,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('copper-wire', {
  name: 'copper wire',
  description: 'A coil of fine copper wire, essential for electrical and aetherical work.',
  category: 'Components',
  value: 3,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('spring-coil', {
  name: 'spring coil',
  description: 'A tightly wound steel spring, useful in all manner of clockwork mechanisms.',
  category: 'Components',
  value: 5,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('steam-whistle', {
  name: 'steam whistle',
  description: 'A small brass whistle that emits a high-pitched steam-powered sound when blown.',
  category: 'Components',
  value: 8,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('lens-ground', {
  name: 'ground lens',
  description: 'A carefully ground glass lens with brass mounting. Used in optical and aetherical instruments.',
  category: 'Components',
  value: 10,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('pressure-gauge', {
  name: 'pressure gauge',
  description: 'A small dial gauge for measuring steam pressure. The brass casing is finely engraved.',
  category: 'Components',
  value: 12,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('mysterious-gear', {
  name: 'mysterious gear',
  description: 'An unusual gear of unknown origin. It seems to be part of something larger.',
  category: 'Components',
  value: 15,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('aether-valve', {
  name: 'aether valve',
  description: 'A precision-machined valve for regulating the flow of aetherical energy.',
  category: 'Components',
  value: 20,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})

registerItemDefinition('glowing-crystal', {
  name: 'glowing crystal',
  description: 'A crystal that glows with a soft inner light, wrapped in brass wire and gears.',
  category: 'Components',
  value: 25,
  icon: 'cog',
  colour: '#a08050',
  stackable: true,
})
