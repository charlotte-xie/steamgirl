import type { SceneContentItem, SceneOptionItem, ParagraphContent } from './Game'

/** Creates a text content item. */
export function txt(text: string): SceneContentItem {
  return { type: 'text', text }
}

/** Creates a paragraph content item. Accepts variadic arguments - can be strings or formatted content (highlights). */
export function p(...content: (string | ParagraphContent)[]): SceneContentItem {
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
export function colour(text: string, color: string): SceneContentItem {
  return { type: 'text', text, color }
}

/** Creates a speech/dialogue content item: indented block with NPC-specific colour (e.g. for quoted dialogue). */
export function speech(text: string, color?: string): SceneContentItem {
  return { type: 'speech', text, color: color}
}

/** Creates a highlight span with color and optional mouseover content. */
export function highlight(text: string, color: string, hoverText?: string): ParagraphContent {
  return { type: 'highlight', text, color, hoverText }
}

/** Creates a button option that runs a script. */
export function option(scriptName: string, params: {} = {}, label?: string): SceneOptionItem {
  return { type: 'button', script: [scriptName, params], label }
}
