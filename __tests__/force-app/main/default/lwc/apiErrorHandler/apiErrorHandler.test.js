import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

jest.mock('lwc', () => ({
  LightningElement: class {},
  api: () => {}
}))

import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

describe('ApiErrorHandler', () => {
  let handler: any

  beforeEach(() => {
    handler = new (ApiErrorHandler as any)()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('parseError', () => {
    it('returns unknown error shape when error is undefined', () => {
      const result = handler.parseError(undefined)
      expect(result).toEqual({
        message: 'An unknown error occurred',
        type: 'unknown',
        details: null
      })
    })

    it('parses array of errors in body as multiple with joined messages', () => {
      const error = {
        body: [{ message: 'First error' }, { foo: 'bar' }]
      }
      const result = handler.parseError(error)
      expect(result.type).toBe('multiple')
      expect(result.message).toBe('First error, Unknown error')
      expect(result.details).toEqual(error.body)
    })

    it('parses body.message with errorCode into message and type', () => {
      const body = { message: 'Body message', errorCode: 'INVALID_FIELD', extra: 123 }
      const error = { body }
      const result = handler.parseError(error)
      expect(result).toEqual({
        message: 'Body message',
        type: 'INVALID_FIELD',
        details: body
      })
    })

    it('parses body.message without errorCode as standard type', () => {
      const body = { message: 'Only message' }
      const error = { body }
      const result = handler.parseError(error)
      expect(result.message).toBe('Only message')
      expect(result.type).toBe('standard')
      expect(result.details).toBe(body)
    })

    it('parses fieldErrors when present into field_validation with joined messages', () => {
      const fieldErrors = {
        Name: [{ message: 'Required' }, { message: 'Too short' }],
        Email: [{ message: 'Invalid' }]
      }
      const error = { body: { fieldErrors } }
      const result = handler.parseError(error)
      expect(result.type).toBe('field_validation')
      expect(result.message).toBe('Name: Required, Name: Too short, Email: Invalid')
      expect(result.details).toBe(fieldErrors)
    })

    it('parses pageErrors when present into page_validation with joined messages', () => {
      const pageErrors = [{ message: 'Page err 1' }, { message: 'Page err 2' }]
      const error = { body: { pageErrors } }
      const result = handler.parseError(error)
      expect(result.type).toBe('page_validation')
      expect(result.message).toBe('Page err 1, Page err 2')
      expect(result.details).toBe(pageErrors)
    })

    it('prefers body.message over fieldErrors when both are present', () => {
      const error = {
        body: {
          message: 'Primary message',
          fieldErrors: { Name: [{ message: 'Required' }] }
        }
      }
      const result = handler.parseError(error)
      expect(result.message).toBe('Primary message')
      expect(result.type).toBe('standard')
      expect(result.details).toEqual(error.body)
    })

    it('uses error.message when present at top-level', () => {
      const error = { message: 'Top level message' }
      const result = handler.parseError(error)
      expect(result.message).toBe('Top level message')
      expect(result.type).toBe('standard')
      expect(result.details).toBeNull()
    })

    it('handles string errors', () => {
      const result = handler.parseError('Simple string error')
      expect(result.message).toBe('Simple string error')
      expect(result.type).toBe('string')
      expect(result.details).toBeNull()
    })

    it('handles unexpected shapes with JSON stringified details', () => {
      const unexpected = { foo: 1, bar: 'baz' }
      const result = handler.parseError(unexpected)
      expect(result.type).toBe('unexpected')
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.details).toBe(JSON.stringify(unexpected))
    })
  })

  describe('handleError', () => {
    it('returns parsed error message when present', () => {
      const msg = handler.handleError({ message: 'Oops' })
      expect(msg).toBe('Oops')
    })

    it('returns fallback when parsed message is empty string', () => {
      const msg = handler.handleError({ message: '' }, 'Fallback message')
      expect(msg).toBe('Fallback message')
    })
  })

  describe('getErrorDetails', () => {
    it('maps parsed error to detail object and includes timestamp', () => {
      const fixed = new Date('2023-01-02T03:04:05.000Z')
      jest.useFakeTimers().setSystemTime(fixed)

      const error = { body: { message: 'Body based', errorCode: 'SERVICE_UNAVAILABLE' } }
      const details = handler.getErrorDetails(error)

      expect(details.userMessage).toBe('Body based')
      expect(details.errorType).toBe('SERVICE_UNAVAILABLE')
      expect(details.technicalDetails).toEqual(error.body)
      expect(details.timestamp).toBe('2023-01-02T03:04:05.000Z')

      jest.useRealTimers()
    })

    it('handles string errors and sets technicalDetails to null', () => {
      const fixed = new Date('2025-05-06T07:08:09.000Z')
      jest.useFakeTimers().setSystemTime(fixed)

      const details = handler.getErrorDetails('error string')
      expect(details.userMessage).toBe('error string')
      expect(details.errorType).toBe('string')
      expect(details.technicalDetails).toBeNull()
      expect(details.timestamp).toBe('2025-05-06T07:08:09.000Z')

      jest.useRealTimers()
    })
  })

  describe('isRetryableError', () => {
    it('returns true for retryable error types', () => {
      const error = { body: { message: 'Timeout', errorCode: 'TIMEOUT' } }
      expect(handler.isRetryableError(error)).toBe(true)
    })

    it('returns false for non-retryable types', () => {
      const error = { message: 'Not retryable' }
      expect(handler.isRetryableError(error)).toBe(false)
    })
  })

  describe('logError', () => {
    it('logs error with context, userAgent and url and returns entry', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const context = { action: 'save', entity: 'Account' }
      const err = { body: { message: 'Network issue', errorCode: 'NETWORK_ERROR' } }

      const fixed = new Date('2022-12-31T23:59:59.000Z')
      jest.useFakeTimers().setSystemTime(fixed)

      const entry = handler.logError(err, context)

      expect(entry.userMessage).toBe('Network issue')
      expect(entry.errorType).toBe('NETWORK_ERROR')
      expect(entry.context).toEqual(context)
      expect(typeof entry.userAgent).toBe('string')
      expect(entry.url).toBe(window.location.href)
      expect(entry.timestamp).toBe('2022-12-31T23:59:59.000Z')

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toBe('API Error:')
      expect(spy.mock.calls[0][1]).toEqual(entry)

      jest.useRealTimers()
      spy.mockRestore()
    })

    it('includes null technicalDetails for string errors', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const fixed = new Date('2020-01-01T00:00:00.000Z')
      jest.useFakeTimers().setSystemTime(fixed)

      const entry = handler.logError('boom', { severity: 'low' })
      expect(entry.userMessage).toBe('boom')
      expect(entry.errorType).toBe('string')
      expect(entry.technicalDetails).toBeNull()
      expect(entry.context).toEqual({ severity: 'low' })
      expect(entry.timestamp).toBe('2020-01-01T00:00:00.000Z')

      jest.useRealTimers()
      spy.mockRestore()
    })
  })

  describe('integration scenarios', () => {
    it('handles multiple body error array with missing messages gracefully', () => {
      const error = { body: [{}, { message: 'Has message' }, { message: '' }] }
      const result = handler.parseError(error)
      expect(result.type).toBe('multiple')
      expect(result.message).toBe('Unknown error, Has message, ')
      expect(result.details).toBe(error.body)
    })

    it('joins pageErrors and returns all messages in order', () => {
      const error = { body: { pageErrors: [{ message: 'One' }, { message: 'Two' }, { message: 'Three' }] } }
      const result = handler.parseError(error)
      expect(result.message).toBe('One, Two, Three')
      expect(result.type).toBe('page_validation')
    })

    it('builds field error messages with field name prefix for multiple fields and errors', () => {
      const error = {
        body: {
          fieldErrors: {
            Name: [{ message: 'Required' }],
            Phone: [{ message: 'Invalid format' }, { message: 'Too short' }]
          }
        }
      }
      const result = handler.parseError(error)
      expect(result.type).toBe('field_validation')
      expect(result.message).toBe('Name: Required, Phone: Invalid format, Phone: Too short')
    })
  })
})