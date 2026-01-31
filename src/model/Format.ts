import type { Instruction } from './Scripts'

// ============================================================================
// CONTENT TYPES
// ============================================================================

/** Inline content - anything that renders as text within a paragraph */
export type InlineContent = {
  type: 'text'
  text: string
  color?: string
  hoverText?: string
}

/** Alias for backwards compatibility */
export type ParagraphContent = InlineContent

/** Top-level content that can appear in a scene */
export type Content =
  | InlineContent
  | { type: 'paragraph'; content: InlineContent[] }
  | { type: 'speech'; text: string; color?: string }
  // Future content types can be added here:
  // | { type: 'image'; src: string; alt?: string }
  // | { type: 'portrait'; npc: string; expression?: string }

/** An option button in a scene. Action is a string expression (resolved via game.run) or an Instruction. */
export type SceneOptionItem =
  | { type: 'button'; action: string | Instruction; label?: string; disabled?: boolean }

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

/** Creates a text content item. */
export function txt(text: string): Content {
  return { type: 'text', text }
}

/** Creates a paragraph content item. Accepts variadic arguments - can be strings or formatted content (highlights). */
export function p(...content: (string | ParagraphContent)[]): Content {
  if (content.length === 0) {
    throw new Error('p() requires at least one content argument')
  }
  
  const paragraphContent: ParagraphContent[] = content.map(item => {
    if (typeof item === 'string') {
      return { type: 'text', text: item }
    }
    return item
  })
  
  return { type: 'paragraph', content: paragraphContent }
}

/** Creates a coloured text content item. */
export function colour(text: string, color: string): Content {
  return { type: 'text', text, color }
}

/** Creates a speech/dialogue content item: indented block with NPC-specific colour (e.g. for quoted dialogue). */
export function speech(text: string, color?: string): Content {
  return { type: 'speech', text, color: color}
}

/** Creates a highlight span with color and optional mouseover content. */
export function highlight(text: string, color: string, hoverText?: string): InlineContent {
  return { type: 'text', text, color, hoverText }
}

