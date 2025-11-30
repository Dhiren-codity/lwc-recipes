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
    document.body.innerHTML = ''
  })

  describe('parseError', () => {
    it('returns a structured object when error is null/undefined', () => {
      const cmp = createComponent()
      const result = cmp.parseError(null)
      expect(result).toEqual(
        expect.objectContaining({
          message: expect.any(String),
          type: expect.any(String)
        })
      )
      expect(result.message.length).toBeGreaterThan(0)
    })

    it('parses error.body as array of messages', () => {
      const cmp = createComponent()
      const arr = [{ message: 'Err1' }, { message: 'Err2' }]
      const result = cmp.parseError({ body: arr })
      expect(result.message).toEqual(expect.stringContaining('Err1'))
      expect(result.message).toEqual(expect.stringContaining('Err2'))
    })

    it('parses error.body array with missing messages using fallback text', () => {
      const cmp = createComponent()
      const arr = [{}, { message: '' }]
      const result = cmp.parseError({ body: arr })
      expect(result.message.toLowerCase()).toContain('unknown')
    })

    it('parses error.body.message with errorCode', () => {
      const cmp = createComponent()
      const body = { message: 'Bad Request', errorCode: 'INVALID_REQ' }
      const result = cmp.parseError({ body })
      expect(result.message).toEqual(expect.stringContaining('Bad Request'))
      expect(result.type).toEqual(expect.stringContaining('INVALID_REQ'))
    })

    it('prioritizes body.message when present, even if other fields exist', () => {
      const cmp = createComponent()
      const body = {
        message: 'Primary message',
        errorCode: 'E1',
        fieldErrors: { name: [{ message: 'Name missing' }] },
        pageErrors: [{ message: 'Page error' }]
      }
      const result = cmp.parseError({ body })
      expect(result.message).toEqual(expect.stringContaining('Primary message'))
      expect(result.type).toEqual(expect.stringContaining('E1'))
    })

    it('parses fieldErrors when present', () => {
      const cmp = createComponent()
      const fieldErrors = {
        name: [{ message: 'Required' }, { message: 'Too short' }],
        email: [{ message: 'Invalid format' }]
      }
      const result = cmp.parseError({ body: { fieldErrors } })
      expect(result.message).toEqual(expect.stringContaining('Required'))
      expect(result.message).toEqual(expect.stringContaining('Too short'))
      expect(result.message).toEqual(expect.stringContaining('Invalid format'))
    })

    it('parses pageErrors when present', () => {
      const cmp = createComponent()
      const pageErrors = [{ message: 'Page error one' }, { message: 'Page error two' }]
      const result = cmp.parseError({ body: { pageErrors } })
      expect(result.message).toEqual(expect.stringContaining('Page error one'))
      expect(result.message).toEqual(expect.stringContaining('Page error two'))
    })

    it('handles plain Error instances', () => {
      const cmp = createComponent()
      const err = new Error('Boom!')
      const result = cmp.parseError(err)
      expect(result.message).toEqual(expect.stringContaining('Boom'))
    })

    it('handles string errors gracefully', () => {
      const cmp = createComponent()
      const result = cmp.parseError('String based error')
      expect(result.message.toLowerCase()).toContain('error')
    })
  })
})