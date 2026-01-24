import { describe, it, expect } from 'vitest'
import { txt, p, colour, option, highlight } from './Format'

describe('Format', () => {
  describe('txt', () => {
    it('should create a text SceneContentItem', () => {
      const result = txt('Hello world')
      expect(result).toEqual({
        type: 'text',
        text: 'Hello world',
      })
    })
  })

  describe('p', () => {
    it('should create a paragraph SceneContentItem with single argument', () => {
      const result = p('Paragraph text')
      expect(result).toEqual({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Paragraph text' }],
      })
    })

    it('should create a paragraph with multiple text parts', () => {
      const result = p('First part', 'Second part', 'Third part')
      expect(result).toEqual({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: 'Second part' },
          { type: 'text', text: 'Third part' },
        ],
      })
    })

    it('should handle two arguments', () => {
      const result = p('Line one', 'Line two')
      expect(result).toEqual({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Line one' },
          { type: 'text', text: 'Line two' },
        ],
      })
    })

    it('should handle highlights in paragraphs', () => {
      const result = p('Hello ', highlight('world', '#ff0000', 'A world'), '!')
      expect(result).toEqual({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'world', color: '#ff0000', hoverText: 'A world' },
          { type: 'text', text: '!' },
        ],
      })
    })
  })

  describe('highlight', () => {
    it('should create an InlineContent with color', () => {
      const result = highlight('Text', '#ff0000', 'Hover text')
      expect(result).toEqual({
        type: 'text',
        text: 'Text',
        color: '#ff0000',
        hoverText: 'Hover text',
      })
    })

    it('should create InlineContent without hover text', () => {
      const result = highlight('Text', '#ff0000')
      expect(result).toEqual({
        type: 'text',
        text: 'Text',
        color: '#ff0000',
      })
    })
  })

  describe('colour', () => {
    it('should create a colored text SceneContentItem', () => {
      const result = colour('Red text', '#ff0000')
      expect(result).toEqual({
        type: 'text',
        text: 'Red text',
        color: '#ff0000',
      })
    })

    it('should handle different color formats', () => {
      const result = colour('Blue text', 'blue')
      expect(result).toEqual({
        type: 'text',
        text: 'Blue text',
        color: 'blue',
      })
    })
  })

  describe('option', () => {
    it('should create a button SceneOptionItem with script name', () => {
      const result = option('nextScene')
      expect(result).toEqual({
        type: 'button',
        script: ['nextScene', {}],
      })
    })

    it('should create a button SceneOptionItem with params', () => {
      const result = option('go', { location: 'city', time: 10 })
      expect(result).toEqual({
        type: 'button',
        script: ['go', { location: 'city', time: 10 }],
      })
    })

    it('should create a button SceneOptionItem with label', () => {
      const result = option('nextScene', {}, 'Continue')
      expect(result).toEqual({
        type: 'button',
        script: ['nextScene', {}],
        label: 'Continue',
      })
    })

    it('should create a button SceneOptionItem with params and label', () => {
      const result = option('go', { location: 'city', time: 15 }, 'Go to City')
      expect(result).toEqual({
        type: 'button',
        script: ['go', { location: 'city', time: 15 }],
        label: 'Go to City',
      })
    })
  })
})
