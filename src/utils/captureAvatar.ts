import { toPng } from 'html-to-image'

const THUMBNAIL_SIZE = 128

/**
 * Capture the current avatar element as a small PNG data URL.
 * Returns undefined if the avatar element is not found.
 */
export async function captureAvatar(): Promise<string | undefined> {
  const el = document.querySelector<HTMLElement>('[data-avatar]')
  if (!el) return undefined

  try {
    const rect = el.getBoundingClientRect()
    const scale = THUMBNAIL_SIZE / Math.max(rect.width, rect.height)

    return await toPng(el, {
      width: rect.width,
      height: rect.height,
      canvasWidth: Math.round(rect.width * scale),
      canvasHeight: Math.round(rect.height * scale),
    })
  } catch {
    return undefined
  }
}
