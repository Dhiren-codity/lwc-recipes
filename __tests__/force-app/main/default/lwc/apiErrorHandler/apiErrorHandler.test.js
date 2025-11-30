import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

jest.mock('lwc', () => ({
  LightningElement: class {},
  api: () => (target, key, descriptor) => descriptor
}))

import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

describe('ApiErrorHandler', () => {
  let handler

  beforeEach(() => {
    handler = new ApiErrorHandler()
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

    it('returns unexpected error when shape is unknown', () => {
      const input = { foo: 'bar' }
      const result = handler.parseError(input)
      expect(result).toEqual({
        message: 'An unexpected error occurred',
        type: 'unexpected',
        details: JSON.stringify(input)
      })
    })

    it('returns unexpected error when body exists but unrecognized and no message', () => {
      const input = { body: { foo: 'bar' } }
      const result = handler.parseError(input)
      expect(result).toEqual({
        message: 'An unexpected error occurred',
        type: 'unexpected',
        details: JSON.stringify(input)
      })
    })
  })

  describe('_parseErrorArray', () => {
    it('maps array errors to joined message with type multiple', () => {
      const errors = [{ message: 'Err1' }, { message: 'Err2' }]
      const result = handler._parseErrorArray(errors)
      expect(result).toEqual({
        message: 'Err1, Err2',
        type: 'multiple',
        details: errors
      })
    })

    it('uses "Unknown error" for entries without message', () => {
      const errors = [{}, { message: 'Has message' }]
      const result = handler._parseErrorArray(errors)
      expect(result).toEqual({
        message: 'Unknown error, Has message',
        type: 'multiple',
        details: errors
      })
    })
  })

  describe('_parseErrorMessage', () => {
    it('returns body message and errorCode as type', () => {
      const body = { message: 'Body message here', errorCode: 'E_CODE' }
      const result = handler._parseErrorMessage(body)
      expect(result).toEqual({
        message: 'Body message here',
        type: 'E_CODE',
        details: body
      })
    })

    it('defaults type to standard when errorCode missing', () => {
      const body = { message: 'No code' }
      const result = handler._parseErrorMessage(body)
      expect(result).toEqual({
        message: 'No code',
        type: 'standard',
        details: body
      })
    })
  })

  describe('_parseFieldErrors', () => {
    it('formats field errors as "field: message"', () => {
      const fieldErrors = {
        FieldA: [{ message: 'Bad' }],
        FieldB: [{ message: 'Worse' }, { message: 'Worst' }]
      }
      const result = handler._parseFieldErrors(fieldErrors)
      expect(result).toEqual({
        message: 'FieldA: Bad, FieldB: Worse, FieldB: Worst',
        type: 'field_validation',
        details: fieldErrors
      })
    })
  })

  describe('_parsePageErrors', () => {
    it('concatenates page error messages', () => {
      const pageErrors = [{ message: 'P1' }, { message: 'P2' }]
      const result = handler._parsePageErrors(pageErrors)
      expect(result).toEqual({
        message: 'P1, P2',
        type: 'page_validation',
        details: pageErrors
      })
    })
  })

  describe('handleError', () => {
    it('returns parsed message when available', () => {
      const result = handler.handleError({ message: 'Handled message' })
      expect(result).toBe('Handled message')
    })

    it('uses fallback when parsed message is empty string', () => {
      const result = handler.handleError({ body: { message: '' } }, 'Fallback used')
      expect(result).toBe('Fallback used')
    })

    it('uses default fallback when no message property exists but parse returns unexpected', () => {
      const result = handler.handleError({ body: { foo: 'bar' } })
      expect(result).toBe('An unexpected error occurred')
    })
  })

  describe('getErrorDetails', () => {
    it('returns normalized details with timestamp', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
      const error = { body: { message: 'Timed', errorCode: 'TIMEOUT' } }
      const details = handler.getErrorDetails(error)
      expect(details).toEqual({
        userMessage: 'Timed',
        errorType: 'TIMEOUT',
        technicalDetails: { message: 'Timed', errorCode: 'TIMEOUT' },
        timestamp: '2025-01-01T00:00:00.000Z'
      })
    })

    it('handles string error and includes ISO timestamp', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-06-15T12:34:56.000Z'))
      const details = handler.getErrorDetails('Error string')
      expect(details.userMessage).toBe('Error string')
      expect(details.errorType).toBe('string')
      expect(details.technicalDetails).toBeNull()
      expect(details.timestamp).toBe('2024-06-15T12:34:56.000Z')
    })
  })

  describe('isRetryableError', () => {
    it('returns true for TIMEOUT', () => {
      const result = handler.isRetryableError({ body: { message: 't', errorCode: 'TIMEOUT' } })
      expect(result).toBe(true)
    })

    it('returns true for SERVICE_UNAVAILABLE', () => {
      const result = handler.isRetryableError({ body: { message: 's', errorCode: 'SERVICE_UNAVAILABLE' } })
      expect(result).toBe(true)
    })

    it('returns false for standard type', () => {
      const result = handler.isRetryableError({ message: 'Not retryable' })
      expect(result).toBe(false)
    })

    it('returns false for string error type', () => {
      const result = handler.isRetryableError('Some error')
      expect(result).toBe(false)
    })
  })

  describe('logError', () => {
    it('logs error with context, userAgent and url', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2023-12-31T23:59:59.000Z'))
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const context = { action: 'save', id: 123 }
      const error = { body: { message: 'A problem', errorCode: 'NETWORK_ERROR' } }

      const logEntry = handler.logError(error, context)

      expect(logEntry.userMessage).toBe('A problem')
      expect(logEntry.errorType).toBe('NETWORK_ERROR')
      expect(logEntry.technicalDetails).toEqual({ message: 'A problem', errorCode: 'NETWORK_ERROR' })
      expect(logEntry.timestamp).toBe('2023-12-31T23:59:59.000Z')
      expect(logEntry.context).toEqual(context)
      expect(logEntry.userAgent).toBe(navigator.userAgent)
      expect(logEntry.url).toBe(window.location.href)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('API Error:', logEntry)
    })

    it('logs string errors and returns a log entry', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2022-01-01T00:00:00.000Z'))
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const logEntry = handler.logError('Plain error string')

      expect(logEntry.userMessage).toBe('Plain error string')
      expect(logEntry.errorType).toBe('string')
      expect(logEntry.technicalDetails).toBeNull()
      expect(logEntry.timestamp).toBe('2022-01-01T00:00:00.000Z')
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toBe('API Error:')
      expect(spy.mock.calls[0][1]).toEqual(logEntry)
    })
  })
})