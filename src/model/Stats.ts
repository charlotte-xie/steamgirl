/**
 * Stats system for the game.
 * Stats are 0-100 values that represent character attributes.
 */

export type MainStatName = 
  | 'Agility'
  | 'Perception'
  | 'Wits'
  | 'Charm'
  | 'Willpower'
  | 'Strength'

export type SkillName =
  | 'Dancing'
  | 'Fitness'
  | 'Etiquette'
  | 'Mechanics'
  | 'Flirting'
  | 'Haggling'

export type MeterName =
  | 'Energy'
  | 'Arousal'
  | 'Composure'
  | 'Stress'
  | 'Pain'
  | 'Mood'

export type StatName = MainStatName | SkillName | MeterName

/**
 * Information about a stat, including description and other metadata.
 */
export interface StatInfo {
  description: string
  basedOn?: MainStatName // For skills, indicates which main stat the skill is based on
  // Additional fields can be added here later
}

/**
 * Information about a meter, including description and color information for display.
 */
export interface MeterInfo {
  description: string
  gainColor: string // Color to use when displaying meter increases
  lossColor: string // Color to use when displaying meter decreases
}

/**
 * Map of all main stat names to their information.
 */
export const MAIN_STAT_INFO: Record<MainStatName, StatInfo> = {
  Agility: {
    description: 'Your speed, reflexes, and physical coordination.',
  },
  Perception: {
    description: 'Your ability to notice details and observe your surroundings.',
  },
  Wits: {
    description: 'Your mental sharpness, problem-solving ability, and quick thinking.',
  },
  Charm: {
    description: 'Your charisma, social grace, and ability to influence others.',
  },
  Willpower: {
    description: 'Your mental fortitude, determination, and resistance to pressure.',
  },
  Strength: {
    description: 'Your physical power, muscle strength, and ability to exert force.',
  },
}

/**
 * Map of all skill names to their information.
 */
export const SKILL_INFO: Record<SkillName, StatInfo> = {
  Dancing: {
    description: 'Your ability to move gracefully and perform dance moves.',
    basedOn: 'Agility',
  },
  Fitness: {
    description: 'Your overall physical fitness and endurance.',
    basedOn: 'Strength',
  },
  Etiquette: {
    description: 'Your knowledge of social norms and proper behavior in high society.',
    basedOn: 'Charm',
  },
  Mechanics: {
    description: 'Your understanding of mechanical devices and steam-powered technology.',
    basedOn: 'Wits',
  },
  Flirting: {
    description: 'Your ability to charm and attract romantic interest.',
    basedOn: 'Charm',
  },
  Haggling: {
    description: 'Your skill at negotiating prices and getting better deals.',
    basedOn: 'Charm',
  },
}

/**
 * List of all main stat names (for initialization).
 */
export const STAT_NAMES: MainStatName[] = Object.keys(MAIN_STAT_INFO) as MainStatName[]

/**
 * List of all skill names (for iteration).
 */
export const SKILL_NAMES: SkillName[] = Object.keys(SKILL_INFO) as SkillName[]

/**
 * Map of all meter names to their information.
 */
export const METER_INFO: Record<MeterName, MeterInfo> = {
  Energy: {
    description: 'Your current energy level. Affects your ability to perform physical activities.',
    gainColor: '#10b981', // Green for energy gain
    lossColor: '#ef4444', // Red for energy loss
  },
  Arousal: {
    description: 'Your level of physical arousal and excitement.',
    gainColor: '#ec4899', // Pink for arousal gain
    lossColor: '#6366f1', // Indigo for arousal loss
  },
  Composure: {
    description: 'Your ability to remain calm and collected in stressful situations.',
    gainColor: '#3b82f6', // Blue for composure gain
    lossColor: '#f59e0b', // Amber for composure loss
  },
  Stress: {
    description: 'Your current stress level. High stress can affect your performance.',
    gainColor: '#ef4444', // Red for stress gain (negative)
    lossColor: '#10b981', // Green for stress loss (positive)
  },
  Pain: {
    description: 'Your current level of physical pain or discomfort.',
    gainColor: '#dc2626', // Dark red for pain gain (negative)
    lossColor: '#10b981', // Green for pain loss (positive)
  },
  Mood: {
    description: 'Your overall emotional state and mood.',
    gainColor: '#fbbf24', // Yellow/amber for mood gain
    lossColor: '#6366f1', // Indigo for mood loss
  },
}

/**
 * Type for stat modifiers - a function that modifies stats.
 * Receives the current stats map and can modify values.
 */
export type StatModifier = (stats: Map<StatName, number>) => void
