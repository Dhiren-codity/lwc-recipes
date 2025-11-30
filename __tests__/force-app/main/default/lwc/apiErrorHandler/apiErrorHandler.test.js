import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

const createInstance = () => {
  const el = createElement('c-api-error-handler', { is: ApiErrorHandler })
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  jest.clearAllMocks()
  jest.useRealTimers()
  document.body.innerHTML = ''
})

describe('ApiErrorHandler.parseError', () => {
  it('returns unknown for undefined error', () => {
    const el = createInstance()
    const result = el.parseError(undefined)
    expect(result).toEqual({
      message: 'An unknown error occurred',
      type: 'unknown',
      details: null
    })
  })

  it('parses error with body as array', () => {
    const el = createInstance()
    const input = {
      body: [{ message: 'First' }, { foo: 'bar' }]
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'First, Unknown error',
      type: 'multiple',
      details: input.body
    })
  })

  it('parses error with body.message and errorCode', () => {
    const el = createInstance()
    const input = {
      body: { message: 'Bad request', errorCode: 'BAD_REQUEST' }
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Bad request',
      type: 'BAD_REQUEST',
      details: input.body
    })
  })

  it('parses error with body.message and no errorCode as standard', () => {
    const el = createInstance()
    const input = {
      body: { message: 'Some message' }
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Some message',
      type: 'standard',
      details: input.body
    })
  })

  it('parses error with fieldErrors', () => {
    const el = createInstance()
    const input = {
      body: {
        fieldErrors: {
          Name: [{ message: 'Required' }],
          Email: [{ message: 'Invalid' }, { message: 'Too long' }]
        }
      }
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Name: Required, Email: Invalid, Email: Too long',
      type: 'field_validation',
      details: input.body.fieldErrors
    })
  })

  it('parses error with pageErrors', () => {
    const el = createInstance()
    const input = {
      body: {
        pageErrors: [{ message: 'Page error 1' }, { message: 'Page error 2' }]
      }
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Page error 1, Page error 2',
      type: 'page_validation',
      details: input.body.pageErrors
    })
  })

  it('prefers body.message over top-level message', () => {
    const el = createInstance()
    const input = {
      body: { message: 'Body wins' },
      message: 'Top message'
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Body wins',
      type: 'standard',
      details: input.body
    })
  })

  it('uses top-level message when provided and no body handlers match', () => {
    const el = createInstance()
    const input = { message: 'Top level error' }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Top level error',
      type: 'standard',
      details: null
    })
  })

  it('parses string error', () => {
    const el = createInstance()
    const result = el.parseError('Simple error')
    expect(result).toEqual({
      message: 'Simple error',
      type: 'string',
      details: null
    })
  })

  it('handles unexpected object by stringifying', () => {
    const el = createInstance()
    const obj = { foo: 'bar' }
    const result = el.parseError(obj)
    expect(result).toEqual({
      message: 'An unexpected error occurred',
      type: 'unexpected',
      details: JSON.stringify(obj)
    })
  })
})

describe('ApiErrorHandler.handleError', () => {
  it('returns parsed message', () => {
    const el = createInstance()
    const input = { message: 'Oops!' }
    const result = el.handleError(input)
    expect(result).toBe('Oops!')
  })

  it('uses fallback when parsed message is empty string', () => {
    const el = createInstance()
    const input = { body: { pageErrors: [] } }
    const result = el.handleError(input, 'Fallback message')
    expect(result).toBe('Fallback message')
  })
})

describe('ApiErrorHandler.getErrorDetails', () => {
  it('returns details mapped with timestamp', () => {
    const el = createInstance()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-02T03:04:05.000Z'))
    const input = { body: { message: 'Error message', errorCode: 'BAD' } }
    const result = el.getErrorDetails(input)
    expect(result).toEqual({
      userMessage: 'Error message',
      errorType: 'BAD',
      technicalDetails: input.body,
      timestamp: '2024-01-02T03:04:05.000Z'
    })
  })
})

describe('ApiErrorHandler.isRetryableError', () => {
  it('returns true for NETWORK_ERROR', () => {
    const el = createInstance()
    const input = { body: { message: 'Network issue', errorCode: 'NETWORK_ERROR' } }
    expect(el.isRetryableError(input)).toBe(true)
  })

  it('returns false for non-retryable error', () => {
    const el = createInstance()
    const input = { body: { message: 'Invalid', errorCode: 'INVALID_REQUEST' } }
    expect(el.isRetryableError(input)).toBe(false)
  })
})

describe('ApiErrorHandler.logError', () => {
  it('logs and returns enriched log entry', () => {
    const el = createInstance()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-05-10T10:20:30.000Z'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const ctx = { action: 'fetchData', attempt: 2 }
    const input = { message: 'Boom' }

    const logEntry = el.logError(input, ctx)

    expect(logEntry).toMatchObject({
      userMessage: 'Boom',
      errorType: 'standard',
      technicalDetails: null,
      timestamp: '2025-05-10T10:20:30.000Z',
      context: ctx
    })
    expect(logEntry.userAgent).toBe(navigator.userAgent)
    expect(logEntry.url).toBe(window.location.href)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toBe('API Error:')
    expect(spy.mock.calls[0][1]).toEqual(logEntry)
  })
})

describe('ApiErrorHandler private methods', () => {
  it('_parseErrorArray returns combined multiple error object', () => {
    const el = createInstance()
    const errors = [{ message: 'Error A' }, { notMessage: true }]
    const result = el._parseErrorArray(errors)
    expect(result).toEqual({
      message: 'Error A, Unknown error',
      type: 'multiple',
      details: errors
    })
  })

  it('_parseErrorMessage returns message and type from errorCode', () => {
    const el = createInstance()
    const body = { message: 'Failure', errorCode: 'FAIL_CODE', extra: 1 }
    const result = el._parseErrorMessage(body)
    expect(result).toEqual({
      message: 'Failure',
      type: 'FAIL_CODE',
      details: body
    })
  })

  it('_parseErrorMessage defaults type to standard without errorCode', () => {
    const el = createInstance()
    const body = { message: 'Just a message' }
    const result = el._parseErrorMessage(body)
    expect(result).toEqual({
      message: 'Just a message',
      type: 'standard',
      details: body
    })
  })

  it('_parseFieldErrors composes field validation message', () => {
    const el = createInstance()
    const fieldErrors = {
      Field1: [{ message: 'Required' }],
      Field2: [{ message: 'Invalid' }, { message: 'Too short' }]
    }
    const result = el._parseFieldErrors(fieldErrors)
    expect(result).toEqual({
      message: 'Field1: Required, Field2: Invalid, Field2: Too short',
      type: 'field_validation',
      details: fieldErrors
    })
  })

  it('_parsePageErrors composes page validation message', () => {
    const el = createInstance()
    const pageErrors = [{ message: 'Page err 1' }, { message: 'Page err 2' }]
    const result = el._parsePageErrors(pageErrors)
    expect(result).toEqual({
      message: 'Page err 1, Page err 2',
      type: 'page_validation',
      details: pageErrors
    })
  })
})

describe('ApiErrorHandler.parseError body precedence and fallbacks', () => {
  it('body.message takes precedence even if fieldErrors present', () => {
    const el = createInstance()
    const input = {
      body: {
        message: 'Primary',
        fieldErrors: { Name: [{ message: 'Required' }] }
      }
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Primary',
      type: 'standard',
      details: input.body
    })
  })

  it('unexpected object returns JSON stringified details', () => {
    const el = createInstance()
    const input = { a: 1, b: { c: 2 } }
    const result = el.parseError(input)
    expect(result.type).toBe('unexpected')
    expect(result.message).toBe('An unexpected error occurred')
    expect(result.details).toBe(JSON.stringify(input))
  })
})