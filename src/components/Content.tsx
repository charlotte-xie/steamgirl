import type { ReactNode } from 'react'
import type { Content, InlineContent, SceneData } from '../model/Game'
import { getNPCDefinition } from '../model/NPC'
import { Tooltip } from './Tooltip'

/**
 * Renders a SceneData object into React components
 */
export function renderScene(scene: SceneData): ReactNode {
  if (scene.content.length === 0) {
    return null
  }

  return (
    <div className="scene-dialog">
      {scene.content.map((item, index) => (
        <ContentItem key={index} item={item} npcId={scene.npc} />
      ))}
    </div>
  )
}

/**
 * Renders a Content item into a React component
 */
function ContentItem({ item, npcId }: { item: Content; npcId?: string }): ReactNode {
  if (item.type === 'text') {
    // Check if this is a simple text (to render as block) or has inline styling
    // For top-level Content, we render as a paragraph
    return (
      <p style={item.color ? { color: item.color } : undefined}>
        {item.text}
      </p>
    )
  }

  if (item.type === 'paragraph') {
    return (
      <p>
        {item.content.map((part, partIndex) => (
          <InlinePart key={partIndex} part={part} />
        ))}
      </p>
    )
  }

  if (item.type === 'speech') {
    const color = item.color ?? (npcId ? getNPCDefinition(npcId)?.speechColor : undefined)
    return (
      <p className="speech" style={color ? { color } : undefined}>
        {item.text}
      </p>
    )
  }

  return null
}

/**
 * Renders an InlineContent part into a React component
 */
function InlinePart({ part }: { part: InlineContent }): ReactNode {
  // All InlineContent has type: 'text' - check for color to determine styling
  const hasHighlight = part.color !== undefined

  if (hasHighlight) {
    const highlightSpan = (
      <span style={{ color: part.color, fontWeight: 600 }}>
        {part.text}
      </span>
    )

    if (part.hoverText) {
      return (
        <Tooltip content={<div style={{ margin: 0 }}>{part.hoverText}</div>}>
          {highlightSpan}
        </Tooltip>
      )
    }

    return highlightSpan
  }

  // Plain text
  return <span>{part.text}</span>
}
