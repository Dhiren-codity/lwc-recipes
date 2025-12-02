import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

describe('ApiErrorHandler', () => {
  let element

  beforeEach(() => {
    element = createElement('c-api-error-handler', { is: ApiErrorHandler })
    document.body.appendChild(element)
  })

  afterEach(() => {
    jest.clearAllMocks()
    try {
      document.body.removeChild(element)
    } catch {}
    jest.useRealTimers()
  })

  describe('parseError', () => {
    it('returns unknown when error is null', () => {
      const result = element.parseError(null)
      expect(result).toEqual({
        message: 'An unknown error occurred',
        type: 'unknown',
        details: null
      })
    })

    it('returns unknown when error is undefined', () => {
      const result = element.parseError(undefined)
      expect(result).toEqual({
        message: 'An unknown error occurred',
        type: 'unknown',
        details: null
      })
    })

    it('parses error.body array with mixed messages', () => {
      const errors = [{ message: 'First' }, {}, { message: 'Third' }]
      const result = element.parseError({ body: errors })
      expect(result.message).toBe('First, Unknown error, Third')
      expect(result.type).toBe('multiple')
      expect(result.details).toBe(errors)
    })

    it('parses error.body array with missing and empty messages to Unknown error', () => {
      const errors = [{}, { message: '' }]
      const result = element.parseError({ body: errors })
      expect(result.message).toBe('Unknown error, Unknown error')
      expect(result.type).toBe('multiple')
      expect(result.details).toBe(errors)
    })

    it('parses body.message and uses errorCode as type', () => {
      const body = { message: 'Body message', errorCode: 'SOME_CODE' }
      const result = element.parseError({ body })
      expect(result).toEqual({
        message: 'Body message',
        type: 'SOME_CODE',
        details: body
      })
    })

    it('parses body.message without errorCode as standard type', () => {
      const body = { message: 'Only message' }
      const result = element.parseError({ body })
      expect(result).toEqual({
        message: 'Only message',
        type: 'standard',
        details: body
      })
    })

    it('parses fieldErrors into field_validation type with combined message', () => {
      const fieldErrors = {
        email: [{ message: 'invalid' }],
        password: [{ message: 'too short' }]
      }
      const result = element.parseError({ body: { fieldErrors } })
      expect(result.message).toBe('email: invalid, password: too short')
      expect(result.type).toBe('field_validation')
      expect(result.details).toBe(fieldErrors)
    })

    it('parses pageErrors into page_validation type with combined message', () => {
      const pageErrors = [{ message: 'Oops' }, { message: 'Try again' }]
      const result = element.parseError({ body: { pageErrors } })
      expect(result.message).toBe('Oops, Try again')
      expect(result.type).toBe('page_validation')
      expect(result.details).toBe(pageErrors)
    })

    it('uses top-level error.message with standard type', () => {
      const error = { message: 'Top level message' }
      const result = element.parseError(error)
      expect(result).toEqual({
        message: 'Top level message',
        type: 'standard',
        details: null
      })
    })

    it('handles string error input with type string', () => {
      const result = element.parseError('Simple error string')
      expect(result).toEqual({
        message: 'Simple error string',
        type: 'string',
        details: null
      })
    })

    it('falls back to unexpected type with JSON details for unrecognized objects', () => {
      const input = { foo: 1 }
      const result = element.parseError(input)
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.type).toBe('unexpected')
      expect(result.details).toBe(JSON.stringify(input))
    })

    it('prefers body.message over fieldErrors when both present', () => {
      const fieldErrors = { email: [{ message: 'invalid' }] }
      const body = { message: 'Primary message', errorCode: 'PRIMARY', fieldErrors }
      const result = element.parseError({ body })
      expect(result.message).toBe('Primary message')
      expect(result.type).toBe('PRIMARY')
      expect(result.details).toBe(body)
    })
  })

  describe('handleError', () => {
    it('returns parsed message when available', () => {
      const error = { message: 'Handled message' }
      const result = element.handleError(error)
      expect(result).toBe('Handled message')
    })

    it('returns fallback when parsed message is empty', () => {
      const error = { body: { pageErrors: [{}] } }
      const result = element.handleError(error)
      expect(result).toBe('An error occurred')
    })

    it('returns custom fallback when provided and message is empty', () => {
      const error = { body: { pageErrors: [{}] } }
      const result = element.handleError(error, 'Custom fallback')
      expect(result).toBe('Custom fallback')
    })
  })

  describe('getErrorDetails', () => {
    it('returns details with timestamp and parsed fields for string error', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
      const result = element.getErrorDetails('Error occurred')
      expect(result).toEqual({
        userMessage: 'Error occurred',
        errorType: 'string',
        technicalDetails: null,
        timestamp: '2024-01-01T00:00:00.000Z'
      })
    })

    it('returns details with technicalDetails for fieldErrors case', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2023-05-10T12:34:56.000Z'))
      const fieldErrors = { name: [{ message: 'required' }] }
      const result = element.getErrorDetails({ body: { fieldErrors } })
      expect(result.userMessage).toBe('name: required')
      expect(result.errorType).toBe('field_validation')
      expect(result.technicalDetails).toBe(fieldErrors)
      expect(result.timestamp).toBe('2023-05-10T12:34:56.000Z')
    })
  })

  describe('isRetryableError', () => {
    it('returns true for retryable error types parsed from body.errorCode', () => {
      const error = { body: { message: 'Too busy', errorCode: 'TOO_MANY_REQUESTS' } }
      expect(element.isRetryableError(error)).toBe(true)
    })

    it('returns false for non-retryable parsed types', () => {
      const error = { message: 'Generic' }
      expect(element.isRetryableError(error)).toBe(false)
    })

    it('returns true for NETWORK_ERROR type', () => {
      const error = { body: { message: 'Network down', errorCode: 'NETWORK_ERROR' } }
      expect(element.isRetryableError(error)).toBe(true)
    })
  })

  describe('logError', () => {
    it('logs error with context, userAgent, and url and returns log entry', () => {
      const originalUserAgent = navigator.userAgent
      const originalLocation = window.location

      Object.defineProperty(navigator, 'userAgent', {
        value: 'jest-agent',
        configurable: true
      })

      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/page' },
        configurable: true
      })

      jest.useFakeTimers()
      jest.setSystemTime(new Date('2022-02-02T02:02:02.000Z'))

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const error = { body: { message: 'Service unavailable', errorCode: 'SERVICE_UNAVAILABLE' } }
      const context = { action: 'fetchData', id: 123 }

      const entry = element.logError(error, context)

      expect(entry.userMessage).toBe('Service unavailable')
      expect(entry.errorType).toBe('SERVICE_UNAVAILABLE')
      expect(entry.context).toEqual(context)
      expect(entry.userAgent).toBe('jest-agent')
      expect(entry.url).toBe('https://example.com/page')
      expect(entry.timestamp).toBe('2022-02-02T02:02:02.000Z')

      expect(spy).toHaveBeenCalledTimes(1)
      const callArgs = spy.mock.calls[0]
      expect(callArgs[0]).toBe('API Error:')
      expect(callArgs[1]).toEqual(entry)

      Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent, configurable: true })
      Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
    })
  })
})