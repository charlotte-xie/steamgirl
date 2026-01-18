import type { ReactNode } from 'react'
import type { SceneContentItem, ParagraphContent, SceneData } from '../model/Game'
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
 * Renders a SceneContentItem into a React component
 */
function ContentItem({ item, npcId }: { item: SceneContentItem; npcId?: string }): ReactNode {
  if (item.type === 'text') {
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
          <ParagraphPart key={partIndex} part={part} />
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
 * Renders a ParagraphContent part into a React component
 */
function ParagraphPart({ part }: { part: ParagraphContent }): ReactNode {
  if (part.type === 'text') {
    return <span>{part.text}</span>
  }

  if (part.type === 'highlight') {
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

  return null
}
