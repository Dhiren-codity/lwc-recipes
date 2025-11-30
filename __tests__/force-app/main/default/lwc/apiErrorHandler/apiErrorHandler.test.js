import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler'

describe('ApiErrorHandler', () => {
  let element

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

      expect(res1 && typeof res1).toBe('object')
      expect(res1.type).toBe('unknown')
      expect(typeof res1.message).toBe('string')

      expect(res2 && typeof res2).toBe('object')
      expect(res2.type).toBe('unknown')
      expect(typeof res2.message).toBe('string')
    })

    it('parses error with body as array using _parseErrorArray', () => {
      const arr = [{ message: 'First' }, { foo: 'bar' }]
      const res = element.parseError({ body: arr })

      expect(res && typeof res).toBe('object')
      expect(res.type).toBe('multiple')
      expect(typeof res.message).toBe('string')
      expect(res.message).toContain('First')
    })

    it('parses error with body having message and errorCode', () => {
      const body = { message: 'Network down', errorCode: 'NETWORK_ERROR', extra: true }
      const res = element.parseError({ body })

      expect(res && typeof res).toBe('object')
      expect(res.type).toBe('NETWORK_ERROR')
      expect(res.message).toBe('Network down')
    })

    it('parses error with fieldErrors', () => {
      const fieldErrors = {
        email: [{ message: 'Invalid email' }],
        name: [{ message: 'Required' }]
      }
      const res = element.parseError({ body: { fieldErrors } })

      expect(res && typeof res).toBe('object')
      expect(res.type).toBe('field_validation')
      expect(res.message).toContain('email')
      expect(res.message).toContain('Invalid email')
      expect(res.message).toContain('name')
      expect(res.message).toContain('Required')
    })

    it('parses error with pageErrors', () => {
      const pageErrors = [{ message: 'General failure' }, { message: 'Try again later' }]
      const res = element.parseError({ body: { pageErrors } })

      expect(res && typeof res).toBe('object')
      expect(res.type).toBe('page_validation')
      expect(res.message).toContain('General failure')
      expect(res.message).toContain('Try again later')
    })

    it('parses error with top-level message', () => {
      const res = element.parseError({ message: 'Top-level error' })

      expect(res && typeof res).toBe('object')
      expect(res.type).toBe('standard')
      expect(res.message).toBe('Top-level error')
    })

    it('handles unknown structures gracefully', () => {
      const res = element.parseError({ body: { foo: 'bar' } })

      expect(res && typeof res).toBe('object')
      expect(typeof res.message).toBe('string')
      expect(res.type).toBeDefined()
    })
  })
})