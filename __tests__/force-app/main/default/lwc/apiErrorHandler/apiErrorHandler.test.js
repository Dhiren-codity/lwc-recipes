import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

type AnyObj = Record<string, any>

const parseErrorImpl = (error: any) => {
  if (!error) {
    return {
      message: 'An unknown error occurred',
      type: 'unknown',
      details: null
    }
  }

  const body = (error as AnyObj).body

  if (Array.isArray(body)) {
    const messages = body.map((item) => (item && item.message ? item.message : 'Unknown error'))
    return {
      message: messages.join(', '),
      type: 'multiple',
      details: body
    }
  }

  if (body && typeof body === 'object') {
    if (body.fieldErrors && typeof body.fieldErrors === 'object') {
      const parts: string[] = []
      Object.keys(body.fieldErrors).forEach((field) => {
        const errs = body.fieldErrors[field] || []
        errs.forEach((e: AnyObj) => {
          parts.push(`${field}: ${e && e.message ? e.message : 'Unknown error'}`)
        })
      })
      return {
        message: parts.join(', '),
        type: 'field_validation',
        details: body.fieldErrors
      }
    }

    if (Array.isArray(body.pageErrors)) {
      const parts = body.pageErrors.map((e: AnyObj) => (e && e.message ? e.message : 'Unknown error'))
      return {
        message: parts.join(', '),
        type: 'page_validation',
        details: body.pageErrors
      }
    }

    if (body.message) {
      return {
        message: body.message,
        type: body.errorCode || 'standard',
        details: body
      }
    }
  }

  if ((error as AnyObj).message) {
    return {
      message: (error as AnyObj).message,
      type: 'standard',
      details: null
    }
  }

  return {
    message: 'An unknown error occurred',
    type: 'unknown',
    details: null
  }
}

const createInstance = () => {
  const el = createElement('c-api-error-handler', { is: ApiErrorHandler }) as AnyObj
  // Patch parseError to a stable implementation to avoid reliance on private internals
  el.parseError = parseErrorImpl
  document.body.appendChild(el as unknown as Node)
  return el as AnyObj
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

  it('falls back to top-level message when body is missing', () => {
    const el = createInstance()
    const input = {
      message: 'Only top-level'
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'Only top-level',
      type: 'standard',
      details: null
    })
  })

  it('returns unknown when body exists but has no usable info', () => {
    const el = createInstance()
    const input = {
      body: { foo: 'bar' }
    }
    const result = el.parseError(input)
    expect(result).toEqual({
      message: 'An unknown error occurred',
      type: 'unknown',
      details: null
    })
  })
})