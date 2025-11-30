import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

describe('ApiErrorHandler', () => {
  let element

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2020-01-02T03:04:05.000Z'))
    element = createElement('c-api-error-handler', { is: ApiErrorHandler })
    document.body.appendChild(element)
    window.history.pushState({}, '', 'http://example.com/testpage')
    Object.defineProperty(window.navigator, 'userAgent', { value: 'JestAgent/1.0', configurable: true })
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
  })

  describe('parseError', () => {
    it('returns unknown error when input is null/undefined', () => {
      const res1 = element.parseError(null)
      const res2 = element.parseError(undefined)
      expect(res1).toEqual({
        message: 'An unknown error occurred',
        type: 'unknown',
        details: null
      })
      expect(res2).toEqual({
        message: 'An unknown error occurred',
        type: 'unknown',
        details: null
      })
    })

    it('parses error with body as array using _parseErrorArray', () => {
      const arr = [{ message: 'First' }, { foo: 'bar' }]
      const res = element.parseError({ body: arr })
      expect(res).toEqual({
        message: 'First, Unknown error',
        type: 'multiple',
        details: arr
      })
    })

    it('parses error with body having message and errorCode', () => {
      const body = { message: 'Network down', errorCode: 'NETWORK_ERROR', extra: true }
      const res = element.parseError({ body })
      expect(res).toEqual({
        message: 'Network down',
        type: 'NETWORK_ERROR',
        details: body
      })
    })

    it('parses error with fieldErrors', () => {
      const fieldErrors = {
        email: [{ message: 'Invalid email' }],
        name: [{ message: 'Required' }]
      }
      const res = element.parseError({ body: { fieldErrors } })
      expect(res).toEqual({
        message: 'email: Invalid email, name: Required',
        type: 'field_validation',
        details: fieldErrors
      })
    })

    it('parses error with pageErrors', () => {
      const pageErrors = [{ message: 'General failure' }, { message: 'Try again later' }]
      const res = element.parseError({ body: { pageErrors } })
      expect(res).toEqual({
        message: 'General failure, Try again later',
        type: 'page_validation',
        details: pageErrors
      })
    })

    it('parses error with top-level message', () => {
      const res = element.parseError({ message: 'Top-level error' })
      expect(res).toEqual({
        message: 'Top-level error',
        type: 'standard',
        details: null
      })
    })

    it('parses string error', () => {
      const res = element.parseError('String error')
      expect(res).toEqual({
        message: 'String error',
        type: 'string',
        details: null
      })
    })

    it('parses unexpected object', () => {
      const input = { foo: 'bar' }
      const res = element.parseError(input)
      expect(res).toEqual({
        message: 'An unexpected error occurred',
        type: 'unexpected',
        details: JSON.stringify(input)
      })
    })

    it('uses "Unknown error" for items in array missing message', () => {
      const res = element.parseError({ body: [{}, { message: 'Known' }, { message: '' }] })
      expect(res).toEqual({
        message: 'Unknown error, Known, ',
        type: 'multiple',
        details: [{}, { message: 'Known' }, { message: '' }]
      })
    })
  })

  describe('handleError', () => {
    it('returns parsed message when available', () => {
      const msg = element.handleError('Boom')
      expect(msg).toBe('Boom')
    })

    it('falls back to fallbackMessage when parsed message is empty string', () => {
      const res = element.handleError({ body: { fieldErrors: { field: [] } } }, 'Fallback message')
      expect(res).toBe('Fallback message')
    })

    it('uses default fallback when parsed message falsy and no custom fallback provided', () => {
      const res = element.handleError({ body: { fieldErrors: { field: [] } } })
      expect(res).toBe('An error occurred')
    })
  })

  describe('getErrorDetails', () => {
    it('returns structured details with timestamp for known errorCode', () => {
      const body = { message: 'Timeout occurred', errorCode: 'TIMEOUT' }
      const res = element.getErrorDetails({ body })
      expect(res).toEqual({
        userMessage: 'Timeout occurred',
        errorType: 'TIMEOUT',
        technicalDetails: body,
        timestamp: '2020-01-02T03:04:05.000Z'
      })
    })

    it('returns structured details for unexpected object', () => {
      const obj = { foo: 'bar' }
      const res = element.getErrorDetails(obj)
      expect(res).toEqual({
        userMessage: 'An unexpected error occurred',
        errorType: 'unexpected',
        technicalDetails: JSON.stringify(obj),
        timestamp: '2020-01-02T03:04:05.000Z'
      })
    })

    it('returns structured details for string error', () => {
      const res = element.getErrorDetails('Plain error')
      expect(res).toEqual({
        userMessage: 'Plain error',
        errorType: 'string',
        technicalDetails: null,
        timestamp: '2020-01-02T03:04:05.000Z'
      })
    })
  })

  describe('isRetryableError', () => {
    it('returns true for retryable error types', () => {
      const codes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'TOO_MANY_REQUESTS']
      for (const code of codes) {
        const res = element.isRetryableError({ body: { message: 'x', errorCode: code } })
        expect(res).toBe(true)
      }
    })

    it('returns false for non-retryable types', () => {
      const res1 = element.isRetryableError({ body: { message: 'Bad input', errorCode: 'INVALID_INPUT' } })
      const res2 = element.isRetryableError({ message: 'Only a message' })
      expect(res1).toBe(false)
      expect(res2).toBe(false)
    })
  })

  describe('logError', () => {
    it('logs error with context, userAgent, and URL, and returns log entry', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const error = { body: { message: 'Service down', errorCode: 'SERVICE_UNAVAILABLE' } }
      const context = { action: 'fetchData', id: 123 }

      const entry = element.logError(error, context)

      expect(entry).toEqual({
        userMessage: 'Service down',
        errorType: 'SERVICE_UNAVAILABLE',
        technicalDetails: { message: 'Service down', errorCode: 'SERVICE_UNAVAILABLE' },
        timestamp: '2020-01-02T03:04:05.000Z',
        context,
        userAgent: 'JestAgent/1.0',
        url: 'http://example.com/testpage'
      })
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('API Error:', entry)
    })

    it('uses empty context object by default', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const entry = element.logError('oops')
      expect(entry.context).toEqual({})
      expect(entry.userMessage).toBe('oops')
      expect(spy).toHaveBeenCalledWith('API Error:', entry)
    })
  })
})