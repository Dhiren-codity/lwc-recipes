import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

describe('ApiErrorHandler', () => {
  let element: any

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2020-01-02T03:04:05.000Z'))
    element = createElement('c-api-error-handler', { is: ApiErrorHandler })
    document.body.appendChild(element)
    // Use same-origin relative path to avoid jsdom pushState origin errors
    window.history.pushState({}, '', '/testpage')
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
  })
})