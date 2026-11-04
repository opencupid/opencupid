import { describe, it, expect } from 'vitest'
import { splitContentTitle } from '../contentTitle'

describe('splitContentTitle', () => {
  it('splits the first line off as the title and trims the body', () => {
    expect(splitContentTitle('Name\n\nFirst para.\nSecond line.')).toEqual({
      title: 'Name',
      body: 'First para.\nSecond line.',
    })
  })

  it('returns an empty body for single-line content', () => {
    expect(splitContentTitle('Name')).toEqual({ title: 'Name', body: '' })
  })
})
