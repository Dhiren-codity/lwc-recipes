import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { ValidationRuleBuilder, FormValidationHelpers } from '../../../../../../force-app/main/default/lwc/formValidationUtils/formValidationUtils'

afterEach(() => {
  jest.clearAllMocks()
})

describe('ValidationRuleBuilder.required', () => {
  it('returns default required rule', () => {
    const rule = ValidationRuleBuilder.required()
    expect(rule).toEqual({
      type: 'required',
      message: 'Field is required',
      severity: 'error'
    })
  })

  it('allows custom message', () => {
    const rule = ValidationRuleBuilder.required('Must provide value')
    expect(rule.message).toBe('Must provide value')
    expect(rule.type).toBe('required')
    expect(rule.severity).toBe('error')
  })
})

describe('ValidationRuleBuilder.pattern', () => {
  it('returns pattern rule with regex', () => {
    const regex = /abc/
    const rule = ValidationRuleBuilder.pattern(regex)
    expect(rule.type).toBe('pattern')
    expect(rule.pattern).toBe(regex)
    expect(rule.message).toBe('Invalid format')
    expect(rule.severity).toBe('error')
    expect(rule.pattern.test('zabcz')).toBe(true)
    expect(rule.pattern.test('zzz')).toBe(false)
  })

  it('allows custom message', () => {
    const rule = ValidationRuleBuilder.pattern(/^\d+$/, 'Digits only')
    expect(rule.message).toBe('Digits only')
  })
})

describe('ValidationRuleBuilder.length', () => {
  it('returns length rule with default message', () => {
    const rule = ValidationRuleBuilder.length(2, 5)
    expect(rule).toEqual({
      type: 'length',
      min: 2,
      max: 5,
      message: 'Length must be between 2 and 5',
      severity: 'error'
    })
  })

  it('allows custom message', () => {
    const rule = ValidationRuleBuilder.length(1, 3, 'Custom length message')
    expect(rule.message).toBe('Custom length message')
  })
})

describe('ValidationRuleBuilder.range', () => {
  it('returns range rule with default message', () => {
    const rule = ValidationRuleBuilder.range(10, 20)
    expect(rule).toEqual({
      type: 'range',
      min: 10,
      max: 20,
      message: 'Value must be between 10 and 20',
      severity: 'error'
    })
  })

  it('allows custom message', () => {
    const rule = ValidationRuleBuilder.range(5, 6, 'Out of range')
    expect(rule.message).toBe('Out of range')
  })
})

describe('ValidationRuleBuilder.custom', () => {
  it('wraps a validator with default message', () => {
    const validator = jest.fn(async () => ({ valid: true }))
    const rule = ValidationRuleBuilder.custom(validator)
    expect(rule.type).toBe('custom')
    expect(rule.message).toBe('Validation failed')
    expect(rule.severity).toBe('error')
    expect(rule.validator).toBe(validator)
  })

  it('supports custom message', () => {
    const rule = ValidationRuleBuilder.custom(async () => ({ valid: false }), 'Bad value')
    expect(rule.message).toBe('Bad value')
  })
})

describe('ValidationRuleBuilder.conditional', () => {
  it('returns conditional rule with condition and rule', () => {
    const condition = jest.fn(() => true)
    const innerRule = ValidationRuleBuilder.required()
    const rule = ValidationRuleBuilder.conditional(condition, innerRule)
    expect(rule).toEqual({
      type: 'conditional',
      condition,
      rule: innerRule,
      severity: 'error'
    })
  })
})

describe('ValidationRuleBuilder.crossField and comparators', () => {
  it('crossField uses default message and comparator', () => {
    const comparator = jest.fn((v, rv) => v === rv)
    const rule = ValidationRuleBuilder.crossField('other', comparator)
    expect(rule.type).toBe('cross-field')
    expect(rule.relatedField).toBe('other')
    expect(rule.message).toBe('Cross-field validation failed')
    expect(rule.severity).toBe('error')
    expect(rule.comparator('a', 'a')).toBe(true)
    expect(rule.comparator('a', 'b')).toBe(false)
  })

  it('greaterThan comparator behavior', () => {
    const rule = ValidationRuleBuilder.greaterThan('min')
    expect(rule.message).toBe('Value must be greater than min')
    expect(rule.comparator('5', '3')).toBe(true)
    expect(rule.comparator('2', '3')).toBe(false)
    expect(rule.comparator(null, '3')).toBe(true)
    expect(rule.comparator('3', undefined)).toBe(true)
  })

  it('lessThan comparator behavior', () => {
    const rule = ValidationRuleBuilder.lessThan('max')
    expect(rule.message).toBe('Value must be less than max')
    expect(rule.comparator('3', '5')).toBe(true)
    expect(rule.comparator('7', '5')).toBe(false)
    expect(rule.comparator(null, '5')).toBe(true)
    expect(rule.comparator('5', undefined)).toBe(true)
  })

  it('matchField comparator behavior', () => {
    const rule = ValidationRuleBuilder.matchField('confirm')
    expect(rule.message).toBe('Value must match confirm')
    expect(rule.comparator('abc', 'abc')).toBe(true)
    expect(rule.comparator('abc', 'def')).toBe(false)
  })
})

describe('ValidationRuleBuilder.email/phone/url', () => {
  it('email pattern matches valid emails', () => {
    const rule = ValidationRuleBuilder.email()
    expect(rule.type).toBe('pattern')
    expect(rule.message).toBe('Invalid email format')
    expect(rule.pattern.test('user@example.com')).toBe(true)
    expect(rule.pattern.test('bad@com')).toBe(false)
    expect(rule.pattern.test('user@ example.com')).toBe(false)
  })

  it('phone pattern matches with plus, spaces, dashes, and parentheses', () => {
    const rule = ValidationRuleBuilder.phone()
    expect(rule.type).toBe('pattern')
    expect(rule.message).toBe('Invalid phone number')
    expect(rule.pattern.test('+1 (234) 567-8901')).toBe(true)
    expect(rule.pattern.test('123-456-7890')).toBe(true)
    expect(rule.pattern.test('123456789')).toBe(false)
  })

  it('url pattern matches http/https only', () => {
    const rule = ValidationRuleBuilder.url()
    expect(rule.type).toBe('pattern')
    expect(rule.message).toBe('Invalid URL format')
    expect(rule.pattern.test('http://example.com')).toBe(true)
    expect(rule.pattern.test('https://www.google.com/search?q=test')).toBe(true)
    expect(rule.pattern.test('ftp://example.com')).toBe(false)
  })
})

describe('ValidationRuleBuilder.zipCode', () => {
  it('US zip code validation', () => {
    const rule = ValidationRuleBuilder.zipCode('US')
    expect(rule.message).toBe('Invalid US postal code')
    expect(rule.pattern.test('12345')).toBe(true)
    expect(rule.pattern.test('12345-6789')).toBe(true)
    expect(rule.pattern.test('1234')).toBe(false)
  })

  it('CA postal code validation', () => {
    const rule = ValidationRuleBuilder.zipCode('CA')
    expect(rule.message).toBe('Invalid CA postal code')
    expect(rule.pattern.test('K1A 0B1')).toBe(true)
    expect(rule.pattern.test('K1A-0B1')).toBe(true)
    expect(rule.pattern.test('12345')).toBe(false)
  })

  it('UK postal code validation', () => {
    const rule = ValidationRuleBuilder.zipCode('UK')
    expect(rule.message).toBe('Invalid UK postal code')
    expect(rule.pattern.test('SW1A 1AA')).toBe(true)
    expect(rule.pattern.test('EC1A 1BB')).toBe(true)
    expect(rule.pattern.test('INVALID')).toBe(false)
  })

  it('defaults to US pattern for unknown country', () => {
    const rule = ValidationRuleBuilder.zipCode('ZZ')
    expect(rule.message).toBe('Invalid ZZ postal code')
    expect(rule.pattern.test('12345')).toBe(true)
    expect(rule.pattern.test('1234')).toBe(false)
  })
})

describe('ValidationRuleBuilder.creditCard', () => {
  it('validates a correct Luhn credit card number', async () => {
    const rule = ValidationRuleBuilder.creditCard()
    const result = await rule.validator('4111 1111 1111 1111')
    expect(result.valid).toBe(true)
    expect(result.message).toBe('')
  })

  it('rejects an invalid credit card number', async () => {
    const rule = ValidationRuleBuilder.creditCard()
    const result = await rule.validator('4111 1111 1111 1112')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Invalid credit card number')
  })

  it('treats empty value as valid', async () => {
    const rule = ValidationRuleBuilder.creditCard()
    const result = await rule.validator('')
    expect(result.valid).toBe(true)
  })

  it('uses custom message when provided', async () => {
    const rule = ValidationRuleBuilder.creditCard('Bad CC')
    const result = await rule.validator('not-a-number')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Bad CC')
  })
})

describe('ValidationRuleBuilder.uniqueInArray', () => {
  it('returns valid when value not in array', async () => {
    const rule = ValidationRuleBuilder.uniqueInArray(['a', 'b'])
    const result = await rule.validator('c')
    expect(result.valid).toBe(true)
    expect(result.message).toBe('')
  })

  it('returns invalid when value exists', async () => {
    const rule = ValidationRuleBuilder.uniqueInArray(['x', 'y'], 'Must be unique')
    const result = await rule.validator('x')
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Must be unique')
  })

  it('treats missing array or value as valid', async () => {
    const rule = ValidationRuleBuilder.uniqueInArray(null)
    const result = await rule.validator(null)
    expect(result.valid).toBe(true)
  })
})

describe('ValidationRuleBuilder.asyncRemoteValidation', () => {
  it('calls remote endpoint and returns valid true', async () => {
    const originalFetch = global.fetch
    const json = jest.fn().mockResolvedValue({ valid: true })
    global.fetch = jest.fn().mockResolvedValue({ json })
    const rule = ValidationRuleBuilder.asyncRemoteValidation('/validate', { extra: 1 }, 'Default msg')

    const formData = { id: 123 }
    const result = await rule.validator('abc', formData)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const call = (global.fetch as jest.Mock).mock.calls[0]
    expect(call[0]).toBe('/validate')
    const options = call[1]
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    const bodyObj = JSON.parse(options.body)
    expect(bodyObj).toEqual({ value: 'abc', extra: 1, formData })
    expect(result.valid).toBe(true)
    expect(result.message).toBe('')

    global.fetch = originalFetch as any
  })

  it('returns invalid with server-provided message', async () => {
    const originalFetch = global.fetch
    const json = jest.fn().mockResolvedValue({ valid: false, message: 'Server says no' })
    global.fetch = jest.fn().mockResolvedValue({ json })
    const rule = ValidationRuleBuilder.asyncRemoteValidation('/endpoint', {}, 'Default fallback')

    const result = await rule.validator('val', { x: 1 })
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Server says no')

    global.fetch = originalFetch as any
  })

  it('returns invalid with default message when server omits message', async () => {
    const originalFetch = global.fetch
    const json = jest.fn().mockResolvedValue({ valid: false })
    global.fetch = jest.fn().mockResolvedValue({ json })
    const rule = ValidationRuleBuilder.asyncRemoteValidation('/endpoint', {}, 'Default fallback')

    const result = await rule.validator('val', {})
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Default fallback')

    global.fetch = originalFetch as any
  })

  it('handles fetch failure with service unavailable message', async () => {
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('Network'))
    const rule = ValidationRuleBuilder.asyncRemoteValidation('/endpoint')

    const result = await rule.validator('val', {})
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Validation service unavailable')

    global.fetch = originalFetch as any
  })
})

describe('FormValidationHelpers.sanitizeInput', () => {
  it('returns value as-is for falsy values', () => {
    expect(FormValidationHelpers.sanitizeInput(null)).toBe(null)
    expect(FormValidationHelpers.sanitizeInput('')).toBe('')
    expect(FormValidationHelpers.sanitizeInput(0 as any)).toBe(0 as any)
  })

  it('sanitizes email: lowercases and trims', () => {
    expect(FormValidationHelpers.sanitizeInput('  USER@EXAMPLE.COM  ', 'email')).toBe('user@example.com')
  })

  it('sanitizes phone: removes invalid characters', () => {
    expect(FormValidationHelpers.sanitizeInput(' +1 (234) 567-8901 ext. 123 ', 'phone')).toBe('+1 (234) 567-8901  123 ')
  })

  it('sanitizes number: keeps digits, dot and minus', () => {
    expect(FormValidationHelpers.sanitizeInput(' $-123,456.78abc ', 'number')).toBe('-123456.78')
  })

  it('sanitizes alphanumeric', () => {
    expect(FormValidationHelpers.sanitizeInput(' A_b-1!@# ', 'alphanumeric')).toBe('Ab1')
  })

  it('sanitizes text by trimming', () => {
    expect(FormValidationHelpers.sanitizeInput('  hello world  ', 'text')).toBe('hello world')
    expect(FormValidationHelpers.sanitizeInput('  hello world  ')).toBe('hello world')
  })
})

describe('FormValidationHelpers.formatErrorMessage', () => {
  it('returns empty string when no errors', () => {
    expect(FormValidationHelpers.formatErrorMessage('firstName', [])).toBe('')
    expect(FormValidationHelpers.formatErrorMessage('firstName', null as any)).toBe('')
  })

  it('formats camelCase field name and joins errors', () => {
    const msg = FormValidationHelpers.formatErrorMessage('firstName', ['is required', 'must be longer'])
    expect(msg).toBe('First Name: is required, must be longer')
  })
})

describe('FormValidationHelpers.groupValidationResults', () => {
  it('groups errors, warnings, and valid fields', () => {
    const results = {
      name: { errors: ['Required'], warnings: [], valid: false },
      email: { errors: [], warnings: ['Looks suspicious'], valid: true },
      age: { errors: [], warnings: [], valid: true }
    }
    const grouped = FormValidationHelpers.groupValidationResults(results)
    expect(grouped.errors).toEqual([{ field: 'name', messages: ['Required'] }])
    expect(grouped.warnings).toEqual([{ field: 'email', messages: ['Looks suspicious'] }])
    expect(grouped.valid).toEqual(['age'])
  })
})

describe('FormValidationHelpers.createDebouncer', () => {
  it('schedule calls function immediately and uses clearTimeout with prior token', () => {
    const spy = jest.spyOn(global, 'clearTimeout')
    const debouncer = FormValidationHelpers.createDebouncer(123)
    const fn = jest.fn()
    debouncer.schedule(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalled()
  })

  it('cancel clears the stored timeout id equal to wait', () => {
    const spy = jest.spyOn(global, 'clearTimeout')
    const debouncer = FormValidationHelpers.createDebouncer(250)
    const fn = jest.fn()
    debouncer.schedule(fn)
    debouncer.cancel()
    const lastCallArg = spy.mock.calls[spy.mock.calls.length - 1][0]
    expect(lastCallArg).toBe(250)
  })

  it('subsequent schedules call function each time', () => {
    const debouncer = FormValidationHelpers.createDebouncer(10)
    const fn = jest.fn()
    debouncer.schedule(fn)
    debouncer.schedule(fn)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('FormValidationHelpers.calculatePasswordStrength', () => {
  it('returns None for empty password', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('')
    expect(res.strength).toBe(0)
    expect(res.label).toBe('None')
    expect(res.feedback).toEqual([])
  })

  it('returns Weak with feedback for very simple password', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('abc')
    expect(res.strength).toBeGreaterThanOrEqual(1)
    expect(res.label).toBe('Weak')
    expect(res.feedback).toEqual(expect.arrayContaining(['Use at least 8 characters', 'Add numbers', 'Add special characters']))
  })

  it('returns Very Strong for complex password without repetition', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('Aa1!xYz!')
    expect(res.strength).toBeGreaterThanOrEqual(5)
    expect(res.label).toBe('Very Strong')
    expect(res.feedback).toEqual([])
  })

  it('penalizes repeated characters (3+ in a row)', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('AAAaaa111!!!')
    expect(res.feedback).toContain('Avoid repeated characters')
    expect(res.strength).toBeGreaterThanOrEqual(0)
  })
})