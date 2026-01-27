/**
 * Faction & Reputation Definitions
 *
 * Registers the city's three factions and their reputation tracks.
 * New factions can be added by calling registerFaction/registerReputation
 * in additional story modules.
 */

import { registerFaction, registerReputation } from '../model/Faction'

// ============================================================================
// SCHOOL — The University of Aetheria
// ============================================================================

registerFaction('school', {
  name: 'School',
  description: 'The University of Aetheria — the academic establishment.',
  reputations: ['academic', 'social', 'sporting'],
})

registerReputation('academic', {
  name: 'Academic',
  description: 'Your scholarly standing at the university.',
  faction: 'school',
  gainColor: '#3b82f6',
  lossColor: '#ef4444',
})

registerReputation('social', {
  name: 'Social',
  description: 'Your popularity among fellow students.',
  faction: 'school',
  gainColor: '#8b5cf6',
  lossColor: '#ef4444',
})

registerReputation('sporting', {
  name: 'Sporting',
  description: 'Your athletic reputation at the university.',
  faction: 'school',
  gainColor: '#10b981',
  lossColor: '#ef4444',
})

// ============================================================================
// LOWTOWN — The criminal underworld
// ============================================================================

registerFaction('lowtown', {
  name: 'Lowtown',
  description: 'The underworld of Aetheria — gangs, hustlers, and survivors.',
  reputations: ['gangster', 'bad-girl', 'junkie'],
})

registerReputation('gangster', {
  name: 'Gangster',
  description: 'Your standing with the criminal underworld.',
  faction: 'lowtown',
  gainColor: '#6b5b6b',
  lossColor: '#ef4444',
})

registerReputation('bad-girl', {
  name: 'Bad Girl',
  description: "Your reputation as someone who doesn't play by the rules.",
  faction: 'lowtown',
  gainColor: '#ec4899',
  lossColor: '#ef4444',
})

registerReputation('junkie', {
  name: 'Junkie',
  description: 'Your notoriety in the underground substances scene.',
  faction: 'lowtown',
  gainColor: '#f59e0b',
  lossColor: '#ef4444',
})

// ============================================================================
// HIGH SOCIETY — Wealth, power, and influence
// ============================================================================

registerFaction('high-society', {
  name: 'High Society',
  description: 'The upper echelons of Aetherian society — wealth, power, and influence.',
  reputations: ['socialite', 'entertainer', 'politics', 'service'],
})

registerReputation('socialite', {
  name: 'Socialite',
  description: 'Your visibility in fashionable society.',
  faction: 'high-society',
  gainColor: '#e0b0ff',
  lossColor: '#ef4444',
})

registerReputation('entertainer', {
  name: 'Entertainer',
  description: 'Your reputation as a performer and conversationalist.',
  faction: 'high-society',
  gainColor: '#fbbf24',
  lossColor: '#ef4444',
})

registerReputation('politics', {
  name: 'Politics',
  description: 'Your influence in the political circles of Aetheria.',
  faction: 'high-society',
  gainColor: '#dc2626',
  lossColor: '#ef4444',
})

registerReputation('service', {
  name: 'Service',
  description: 'Your reputation for dutiful service to the upper class.',
  faction: 'high-society',
  gainColor: '#94a3b8',
  lossColor: '#ef4444',
})
