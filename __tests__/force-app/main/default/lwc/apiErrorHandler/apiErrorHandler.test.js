import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

jest.mock('lwc', () => ({
  LightningElement: class {},
  api: () => {},
  track: () => {},
  wire: () => {},
  registerDecorators: () => {},
  registerTemplate: () => {},
  registerComponent: (Ctor) => Ctor,
  createElement: () => ({})
}))

import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

describe('ApiErrorHandler', () => {
  let handler: any

  beforeEach(() => {
    handler = new (ApiErrorHandler as any)()
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })

  describe('parseError', () => {
    it('returns unknown error for null input', () => {
      const result = handler.parseError(null)
      expect(result).toEqual({
        message: 'An unknown error occurred',
        type: 'unknown',
        details: null
      })
    })

    it('parses array of body errors with mixed messages', () => {
      const arr = [{ message: 'First' }, {}]
      const result = handler.parseError({ body: arr })
      expect(result).toEqual({
        message: 'First, Unknown error',
        type: 'multiple',
        details: arr
      })
    })

    it('parses body with message and errorCode', () => {
      const body = { message: 'Body message', errorCode: 'NETWORK_ERROR' }
      const result = handler.parseError({ body })
      expect(result).toEqual({
        message: 'Body message',
        type: 'NETWORK_ERROR',
        details: body
      })
    })

    it('parses body with message and no errorCode (defaults to standard)', () => {
      const body = { message: 'Only message' }
      const result = handler.parseError({ body })
      expect(result).toEqual({
        message: 'Only message',
        type: 'standard',
        details: body
      })
    })

    it('parses fieldErrors into concatenated messages', () => {
      const fieldErrors = {
        Name: [{ message: 'Required' }, { message: 'Too short' }],
        Age: [{ message: 'Must be adult' }]
      }
      const result = handler.parseError({ body: { fieldErrors } })
      expect(result).toEqual({
        message: 'Name: Required, Name: Too short, Age: Must be adult',
        type: 'field_validation',
        details: fieldErrors
      })
    })

    it('parses pageErrors into concatenated messages', () => {
      const pageErrors = [{ message: 'Page error 1' }, { message: 'Page error 2' }]
      const result = handler.parseError({ body: { pageErrors } })
      expect(result).toEqual({
        message: 'Page error 1, Page error 2',
        type: 'page_validation',
        details: pageErrors
      })
    })

    it('uses error.message when present at top level', () => {
      const err = { message: 'Top-level error' }
      const result = handler.parseError(err)
      expect(result).toEqual({
        message: 'Top-level error',
        type: 'standard',
        details: null
      })
    })

    it('handles string error input', () => {
      const result = handler.parseError('Simple error')
      expect(result).toEqual({
        message: 'Simple error',
        type: 'string',
        details: null
      })
    })
  })
})