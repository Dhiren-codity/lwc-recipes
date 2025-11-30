import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

const createComponent = () => {
  const element = createElement('c-api-error-handler', { is: ApiErrorHandler })
  document.body.appendChild(element)
  return element
}

describe('ApiErrorHandler', () => {
  let consoleErrorSpy

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2020-01-01T00:00:00.000Z'))
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'UnitTestAgent/1.0',
      configurable: true
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('parseError', () => {
    it('returns unknown when error is null/undefined', () => {
      const cmp = createComponent()
      const result = cmp.parseError(null)
      expect(result).toEqual({
        message: 'An unknown error occurred',
        type: 'unknown',
        details: null
      })
    })

    it('parses error.body as array of messages', () => {
      const cmp = createComponent()
      const arr = [{ message: 'Err1' }, { message: 'Err2' }]
      const result = cmp.parseError({ body: arr })
      expect(result.message).toBe('Err1, Err2')
      expect(result.type).toBe('multiple')
      expect(result.details).toBe(arr)
    })

    it('parses error.body array with missing messages using "Unknown error"', () => {
      const cmp = createComponent()
      const arr = [{}, { message: '' }]
      const result = cmp.parseError({ body: arr })
      expect(result.message).toBe('Unknown error, Unknown error')
      expect(result.type).toBe('multiple')
      expect(result.details).toBe(arr)
    })

    it('parses error.body.message with errorCode', () => {
      const cmp = createComponent()
      const body = { message: 'Bad Request', errorCode: 'INVALID_REQ' }
      const result = cmp.parseError({ body })
      expect(result.message).toBe('Bad Request')
      expect(result.type).toBe('INVALID_REQ')
      expect(result.details).toBe(body)
    })

    it('prioritizes body.message over fieldErrors and pageErrors', () => {
      const cmp = createComponent()
      const body = {
        message: 'Primary message',
        errorCode: 'E1',
        fieldErrors: { name: [{ message: 'Name missing' }] },
        pageErrors: [{ message: 'Page error' }]
      }
      const result = cmp.parseError({ body })
      expect(result.message).toBe('Primary message')
      expect(result.type).toBe('E1')
      expect(result.details).toBe(body)
    })

    it('parses fieldErrors when present', () => {
      const cmp = createComponent()
      const fieldErrors = {
        name: [{ message: 'Required' }, { message: 'Too short' }],
        email: [{ message: 'Invalid format' }]
      }
      const result = cmp.parseError({ body: { fieldErrors } })
      expect(result.message).toBe('name: Required, name: Too short, email: Invalid format')
      expect(result.type).toBe('field_validation')
      expect(result.details).toBe(fieldErrors)
    })

    it('parses pageErrors when present', () => {
      const cmp = createComponent()
      const pageErrors = [{ message: 'Not allowed' }, { message: 'Try again later' }]
      const result = cmp.parseError({ body: { pageErrors } })
      expect(result.message).toBe('Not allowed, Try again later')
      expect(result.type).toBe('page_validation')
      expect(result.details).toBe(pageErrors)
    })

    it('falls back to error.message at top level', () => {
      const cmp = createComponent()
      const err = { message: 'Top-level message' }
      const result = cmp.parseError(err)
      expect(result).toEqual({
        message: 'Top-level message',
        type: 'standard',
        details: null
      })
    })

    it('handles string errors', () => {
      const cmp = createComponent()
      const result = cmp.parseError('Just a string')
      expect(result).toEqual({
        message: 'Just a string',
        type: 'string',
        details: null
      })
    })

    it('returns unexpected for unrecognized error shapes', () => {
      const cmp = createComponent()
      const input = { foo: 'bar', baz: 1 }
      const result = cmp.parseError(input)
      expect(result.type).toBe('unexpected')
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.details).toBe(JSON.stringify(input))
    })
  })

  describe('_parseErrorArray', () => {
    it('aggregates messages and marks as multiple', () => {
      const cmp = createComponent()
      const arr = [{ message: 'A' }, { message: 'B' }, { message: 'C' }]
      const result = cmp._parseErrorArray(arr)
      expect(result).toEqual({
        message: 'A, B, C',
        type: 'multiple',
        details: arr
      })
    })

    it('uses "Unknown error" for entries without a message', () => {
      const cmp = createComponent()
      const arr = [{}, { message: '' }, { message: 'Known' }]
      const result = cmp._parseErrorArray(arr)
      expect(result.message).toBe('Unknown error, Unknown error, Known')
      expect(result.type).toBe('multiple')
      expect(result.details).toBe(arr)
    })
  })

  describe('_parseErrorMessage', () => {
    it('returns message with errorCode type and includes details', () => {
      const cmp = createComponent()
      const body = { message: 'Oops', errorCode: 'FAIL' }
      const result = cmp._parseErrorMessage(body)
      expect(result).toEqual({
        message: 'Oops',
        type: 'FAIL',
        details: body
      })
    })

    it('defaults type to standard when errorCode is missing', () => {
      const cmp = createComponent()
      const body = { message: 'Oops again' }
      const result = cmp._parseErrorMessage(body)
      expect(result.type).toBe('standard')
      expect(result.details).toBe(body)
    })
  })

  describe('_parseFieldErrors', () => {
    it('flattens field errors with field prefixes', () => {
      const cmp = createComponent()
      const fieldErrors = {
        name: [{ message: 'Required' }, { message: 'Too short' }],
        email: [{ message: 'Invalid' }]
      }
      const result = cmp._parseFieldErrors(fieldErrors)
      expect(result).toEqual({
        message: 'name: Required, name: Too short, email: Invalid',
        type: 'field_validation',
        details: fieldErrors
      })
    })
  })

  describe('_parsePageErrors', () => {
    it('joins page error messages and sets type', () => {
      const cmp = createComponent()
      const pageErrors = [{ message: 'Error1' }, { message: 'Error2' }]
      const result = cmp._parsePageErrors(pageErrors)
      expect(result).toEqual({
        message: 'Error1, Error2',
        type: 'page_validation',
        details: pageErrors
      })
    })
  })

  describe('handleError', () => {
    it('returns parsed error message', () => {
      const cmp = createComponent()
      const msg = cmp.handleError({ message: 'Simple' }, 'Fallback')
      expect(msg).toBe('Simple')
    })

    it('returns fallback when parsed message is falsy', () => {
      const cmp = createComponent()
      jest.spyOn(cmp, 'parseError').mockReturnValue({
        message: '',
        type: 'x',
        details: null
      })
      const msg = cmp.handleError({ some: 'error' }, 'Fallback message')
      expect(msg).toBe('Fallback message')
    })
  })

  describe('getErrorDetails', () => {
    it('returns structured details with timestamp', () => {
      const cmp = createComponent()
      const error = { body: { message: 'Bad Request', errorCode: 'INVALID' } }
      const details = cmp.getErrorDetails(error)
      expect(details.userMessage).toBe('Bad Request')
      expect(details.errorType).toBe('INVALID')
      expect(details.technicalDetails).toEqual(error.body)
      expect(details.timestamp).toBe('2020-01-01T00:00:00.000Z')
    })
  })

  describe('isRetryableError', () => {
    it('returns true for retryable types', () => {
      const cmp = createComponent()
      const error = { body: { message: 'Network issue', errorCode: 'NETWORK_ERROR' } }
      expect(cmp.isRetryableError(error)).toBe(true)
    })

    it('returns false for non-retryable types', () => {
      const cmp = createComponent()
      const error = { body: { message: 'Validation failed', errorCode: 'VALIDATION' } }
      expect(cmp.isRetryableError(error)).toBe(false)
    })
  })

  describe('logError', () => {
    it('logs error and returns log entry with context, userAgent and url', () => {
      const cmp = createComponent()
      const error = { message: 'Something went wrong' }
      const context = { action: 'save', recordId: '001' }
      const logEntry = cmp.logError(error, context)

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const [label, payload] = consoleErrorSpy.mock.calls[0]
      expect(label).toBe('API Error:')
      expect(payload).toEqual(logEntry)

      expect(logEntry.userMessage).toBe('Something went wrong')
      expect(logEntry.errorType).toBe('standard')
      expect(logEntry.technicalDetails).toBeNull()
      expect(logEntry.timestamp).toBe('2020-01-01T00:00:00.000Z')
      expect(logEntry.context).toEqual(context)
      expect(logEntry.userAgent).toBe(window.navigator.userAgent)
      expect(logEntry.url).toBe(window.location.href)
    })
  })
})