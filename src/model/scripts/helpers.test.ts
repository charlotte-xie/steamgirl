import { describe, it, expect } from 'vitest'
import { isTruthy } from './helpers'

describe('isTruthy', () => {
  it('treats positive numbers as truthy', () => {
    expect(isTruthy(1)).toBe(true)
    expect(isTruthy(0.5)).toBe(true)
    expect(isTruthy(100)).toBe(true)
  })

  it('treats zero and negatives as falsy', () => {
    expect(isTruthy(0)).toBe(false)
    expect(isTruthy(-1)).toBe(false)
    expect(isTruthy(-0.5)).toBe(false)
  })

  it('treats booleans as-is', () => {
    expect(isTruthy(true)).toBe(true)
    expect(isTruthy(false)).toBe(false)
  })

  it('treats null, undefined, empty string as falsy', () => {
    expect(isTruthy(null)).toBe(false)
    expect(isTruthy(undefined)).toBe(false)
    expect(isTruthy('')).toBe(false)
  })

  it('treats non-empty strings as truthy', () => {
    expect(isTruthy('hello')).toBe(true)
    expect(isTruthy('false')).toBe(true)
  })

  it('treats objects and arrays as truthy', () => {
    expect(isTruthy({})).toBe(true)
    expect(isTruthy([])).toBe(true)
    expect(isTruthy({ a: 1 })).toBe(true)
  })
})
