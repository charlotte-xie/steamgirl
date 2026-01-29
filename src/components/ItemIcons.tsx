/**
 * Small SVG icons for item types, rendered at 20x20 inside inventory item views.
 * Each icon uses currentColor so it inherits the parent's text colour.
 */
import type { JSX } from 'react'

const S = 20 // viewBox size
const sv = `0 0 ${S} ${S}`

// Shared props for all SVGs - width/height use 100% to fill container
const svgProps = { width: '100%', height: '100%', viewBox: sv, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const icons: Record<string, () => JSX.Element> = {

  food: () => (
    <svg {...svgProps}>
      {/* Apple */}
      <path d="M10 4 C10 4 12 2 13 3" />
      <path d="M6 7 C3 7 2 11 3 14 C4 17 7 18 10 18 C13 18 16 17 17 14 C18 11 17 7 14 7 C12 7 11 8 10 9 C9 8 8 7 6 7Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  drink: () => (
    <svg {...svgProps}>
      {/* Goblet */}
      <path d="M7 17 L13 17" />
      <path d="M10 17 L10 13" />
      <path d="M6 13 L14 13 L14 5 C14 5 13 7 10 7 C7 7 6 5 6 5Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M6 5 L14 5" />
    </svg>
  ),

  top: () => (
    <svg {...svgProps}>
      {/* Shirt / top */}
      <path d="M7 4 L4 7 L6 8 L6 16 L14 16 L14 8 L16 7 L13 4 L11 6 L9 6Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  bottom: () => (
    <svg {...svgProps}>
      {/* Skirt */}
      <path d="M6 5 L14 5 L16 16 L4 16Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M6 5 L14 5" strokeWidth="2" />
    </svg>
  ),

  dress: () => (
    <svg {...svgProps}>
      {/* Dress */}
      <path d="M8 3 L12 3 L12 7 L15 17 L5 17 L8 7Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M7 6 L13 6" />
    </svg>
  ),

  underwear: () => (
    <svg {...svgProps}>
      {/* Bra / underwear */}
      <path d="M4 9 C4 6 7 5 10 7 C13 5 16 6 16 9" />
      <path d="M4 9 L5 10 L10 9 L15 10 L16 9" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  knickers: () => (
    <svg {...svgProps}>
      {/* Panties */}
      <path d="M5 7 L15 7 L15 10 L13 16 L10 12 L7 16 L5 10Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  footwear: () => (
    <svg {...svgProps}>
      {/* Boot */}
      <path d="M8 4 L12 4 L12 12 L16 14 L16 16 L6 16 L6 14 L8 12Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  socks: () => (
    <svg {...svgProps}>
      {/* Sock */}
      <path d="M8 3 L12 3 L12 12 L14 15 L12 17 L8 17 L7 14 L8 12Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  hat: () => (
    <svg {...svgProps}>
      {/* Hat */}
      <path d="M3 14 L17 14" strokeWidth="2" />
      <path d="M6 14 C6 14 6 8 10 8 C14 8 14 14 14 14" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  mask: () => (
    <svg {...svgProps}>
      {/* Mask */}
      <path d="M3 8 C3 8 5 6 10 6 C15 6 17 8 17 8 L17 12 C17 12 15 14 10 14 C5 14 3 12 3 12Z" fill="currentColor" fillOpacity="0.15" />
      <circle cx="7" cy="10" r="2" />
      <circle cx="13" cy="10" r="2" />
    </svg>
  ),

  eyewear: () => (
    <svg {...svgProps}>
      {/* Spectacles */}
      <circle cx="7" cy="10" r="3" />
      <circle cx="13" cy="10" r="3" />
      <path d="M10 10 L10 10" />
      <path d="M4 10 L3 9" />
      <path d="M16 10 L17 9" />
    </svg>
  ),

  necklace: () => (
    <svg {...svgProps}>
      {/* Necklace */}
      <path d="M5 5 C5 5 5 12 10 14 C15 12 15 5 15 5" />
      <circle cx="10" cy="14" r="2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),

  necktie: () => (
    <svg {...svgProps}>
      {/* Tie */}
      <path d="M8 3 L12 3 L11 8 L12 16 L10 18 L8 16 L9 8Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  outerwear: () => (
    <svg {...svgProps}>
      {/* Jacket */}
      <path d="M7 3 L4 6 L5 7 L5 17 L9 17 L9 10 L11 10 L11 17 L15 17 L15 7 L16 6 L13 3 L11 5 L9 5Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  corset: () => (
    <svg {...svgProps}>
      {/* Corset */}
      <path d="M6 4 L14 4 L15 10 L14 16 L6 16 L5 10Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M10 5 L10 15" strokeDasharray="2 2" />
    </svg>
  ),

  gloves: () => (
    <svg {...svgProps}>
      {/* Glove */}
      <path d="M7 16 L7 8 L9 8 L9 5 L11 5 L11 8 L13 8 L13 6 L14 6 L14 9 L13 16Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  belt: () => (
    <svg {...svgProps}>
      {/* Belt */}
      <path d="M2 9 L18 9 L18 13 L2 13Z" fill="currentColor" fillOpacity="0.15" />
      <rect x="8" y="8" width="4" height="6" rx="0.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
    </svg>
  ),

  money: () => (
    <svg {...svgProps}>
      {/* Coin */}
      <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.15" />
      <circle cx="10" cy="10" r="5" />
      <path d="M10 7 L10 13" />
      <path d="M8 8.5 L12 8.5" />
      <path d="M8 11.5 L12 11.5" />
    </svg>
  ),

  cog: () => (
    <svg {...svgProps}>
      {/* Gear / cog */}
      <circle cx="10" cy="10" r="3" />
      {[...Array(8)].map((_, i) => {
        const a = (i * Math.PI * 2) / 8
        const x1 = 10 + Math.cos(a) * 5
        const y1 = 10 + Math.sin(a) * 5
        const x2 = 10 + Math.cos(a) * 7.5
        const y2 = 10 + Math.sin(a) * 7.5
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2.5" />
      })}
    </svg>
  ),

  key: () => (
    <svg {...svgProps}>
      {/* Key */}
      <circle cx="7" cy="7" r="3" />
      <path d="M9.5 9.5 L16 16" />
      <path d="M14 14 L16 12" />
    </svg>
  ),

  potion: () => (
    <svg {...svgProps}>
      {/* Potion bottle */}
      <path d="M8 3 L12 3 L12 7 L15 14 C15 16 13 17 10 17 C7 17 5 16 5 14 L8 7Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M8 3 L12 3" strokeWidth="2" />
    </svg>
  ),

  scroll: () => (
    <svg {...svgProps}>
      {/* Scroll / document */}
      <path d="M6 3 L14 3 L14 15 C14 16 13 17 12 17 L6 17 C5 17 4 16 4 15 L4 5 C4 4 5 3 6 3Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M7 7 L12 7" />
      <path d="M7 10 L12 10" />
      <path d="M7 13 L10 13" />
    </svg>
  ),

  gem: () => (
    <svg {...svgProps}>
      {/* Gem / valuable */}
      <path d="M5 8 L10 4 L15 8 L10 17Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M5 8 L15 8" />
      <path d="M7 8 L10 17 L13 8" />
    </svg>
  ),

  star: () => (
    <svg {...svgProps}>
      {/* Star / special */}
      <path d="M10 3 L12 8 L17 8 L13 12 L14.5 17 L10 14 L5.5 17 L7 12 L3 8 L8 8Z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  ),

  bracelet: () => (
    <svg {...svgProps}>
      {/* Bracelet / wrist */}
      <ellipse cx="10" cy="11" rx="5" ry="4" />
      <circle cx="10" cy="7" r="1.5" fill="currentColor" fillOpacity="0.3" />
    </svg>
  ),
}

export type ItemIconName = keyof typeof icons

export function getItemIcon(name: string): (() => JSX.Element) | undefined {
  return icons[name]
}
