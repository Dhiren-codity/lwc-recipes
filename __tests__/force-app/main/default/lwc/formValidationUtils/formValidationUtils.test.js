import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { ValidationRuleBuilder, FormValidationHelpers } from '../../../../../../force-app/main/default/lwc/formValidationUtils/formValidationUtils'

describe('ValidationRuleBuilder.required', () => {
  it('returns default required rule', () => {
    const rule = ValidationRuleBuilder.required()
    expect(rule).toEqual({
      type: 'required',
      message: 'Field is required',
      severity: 'error'
    })
  })

  it('returns required rule with custom message', () => {
    const rule = ValidationRuleBuilder.required('Must fill')
    expect(rule.message).toBe('Must fill')
    expect(rule.type).toBe('required')
    expect(rule.severity).toBe('error')
  })
})

describe('ValidationRuleBuilder.pattern', () => {
  it('returns pattern rule with default message', () => {
    const regex = /^[0-9]+$/
    const rule = ValidationRuleBuilder.pattern(regex)
    expect(rule.type).toBe('pattern')
    expect(rule.pattern).toBe(regex)
    expect(rule.message).toBe('Invalid format')
    expect(rule.severity).toBe('error')
  })

  it('returns pattern rule with custom message', () => {
    const regex = /^[a-z]+$/
    const rule = ValidationRuleBuilder.pattern(regex, 'Only letters')
    expect(rule.message).toBe('Only letters')
  })
})

describe('ValidationRuleBuilder.length', () => {
  it('returns length rule with default message', () => {
    const rule = ValidationRuleBuilder.length(2, 5)
    expect(rule.type).toBe('length')
    expect(rule.min).toBe(2)
    expect(rule.max).toBe(5)
    expect(rule.message).toBe('Length must be between 2 and 5')
    expect(rule.severity).toBe('error')
  })

  it('returns length rule with custom message', () => {
    const rule = ValidationRuleBuilder.length(1, 10, 'Custom length')
    expect(rule.message).toBe('Custom length')
  })
})

describe('ValidationRuleBuilder.range', () => {
  it('returns range rule with default message', () => {
    const rule = ValidationRuleBuilder.range(10, 20)
    expect(rule.type).toBe('range')
    expect(rule.min).toBe(10)
    expect(rule.max).toBe(20)
    expect(rule.message).toBe('Value must be between 10 and 20')
    expect(rule.severity).toBe('error')
  })

  it('returns range rule with custom message', () => {
    const rule = ValidationRuleBuilder.range(0, 100, 'Between 0 and 100 only')
    expect(rule.message).toBe('Between 0 and 100 only')
  })
})

describe('ValidationRuleBuilder.custom', () => {
  it('returns custom rule and uses provided validator', async () => {
    const validator = jest.fn(async (value) => ({ valid: value === 'ok', message: 'err' }))
    const rule = ValidationRuleBuilder.custom(validator, 'Default')
    expect(rule.type).toBe('custom')
    expect(rule.message).toBe('Default')
    expect(rule.severity).toBe('error')
    await expect(rule.validator('ok')).resolves.toEqual({ valid: true, message: 'err' })
    await expect(rule.validator('no')).resolves.toEqual({ valid: false, message: 'err' })
  })
})

describe('ValidationRuleBuilder.conditional', () => {
  it('returns conditional rule structure', () => {
    const cond = jest.fn(() => true)
    const innerRule = ValidationRuleBuilder.required()
    const rule = ValidationRuleBuilder.conditional(cond, innerRule)
    expect(rule.type).toBe('conditional')
    expect(rule.condition).toBe(cond)
    expect(rule.rule).toBe(innerRule)
    expect(rule.severity).toBe('error')
  })
})

describe('ValidationRuleBuilder.crossField', () => {
  it('returns cross-field rule with comparator', () => {
    const comparator = jest.fn((a, b) => a === b)
    const rule = ValidationRuleBuilder.crossField('other', comparator, 'Cross error')
    expect(rule.type).toBe('cross-field')
    expect(rule.relatedField).toBe('other')
    expect(rule.comparator).toBe(comparator)
    expect(rule.message).toBe('Cross error')
  })

  it('comparator handles missing values as true', () => {
    const rule = ValidationRuleBuilder.crossField('other', (a, b) => a > b)
    expect(rule.comparator('', 2)).toBe(true)
    expect(rule.comparator(2, '')).toBe(true)
  })
})

describe('ValidationRuleBuilder.email/phone/url', () => {
  it('email pattern matches valid and rejects invalid', () => {
    const rule = ValidationRuleBuilder.email()
    expect(rule.type).toBe('pattern')
    expect(rule.pattern.test('user@example.com')).toBe(true)
    expect(rule.pattern.test('invalid@com')).toBe(false)
  })

  it('phone pattern matches valid and rejects invalid', () => {
    const rule = ValidationRuleBuilder.phone()
    expect(rule.pattern.test('+1 (555) 123-4567')).toBe(true)
    expect(rule.pattern.test('12345')).toBe(false)
  })

  it('url pattern matches valid and rejects invalid', () => {
    const rule = ValidationRuleBuilder.url()
    expect(rule.pattern.test('https://example.com/path?x=1')).toBe(true)
    expect(rule.pattern.test('ftp://example.com')).toBe(false)
  })
})

describe('ValidationRuleBuilder.zipCode', () => {
  it('uses US pattern by default and for unknown country', () => {
    const usRule = ValidationRuleBuilder.zipCode()
    expect(usRule.message).toBe('Invalid US postal code')
    expect(usRule.pattern.test('12345-6789')).toBe(true)
    expect(usRule.pattern.test('ABCDE')).toBe(false)

    const unknownRule = ValidationRuleBuilder.zipCode('XX')
    expect(unknownRule.message).toBe('Invalid XX postal code')
    expect(unknownRule.pattern.test('12345')).toBe(true)
  })

  it('uses CA and UK patterns', () => {
    const caRule = ValidationRuleBuilder.zipCode('CA')
    expect(caRule.message).toBe('Invalid CA postal code')
    expect(caRule.pattern.test('K1A 0B1')).toBe(true)
    expect(caRule.pattern.test('12345')).toBe(false)

    const ukRule = ValidationRuleBuilder.zipCode('UK')
    expect(ukRule.message).toBe('Invalid UK postal code')
    expect(ukRule.pattern.test('SW1A 1AA')).toBe(true)
    expect(ukRule.pattern.test('INVALID')).toBe(false)
  })
})

describe('ValidationRuleBuilder.creditCard', () => {
  it('validates using Luhn algorithm', async () => {
    const rule = ValidationRuleBuilder.creditCard()
    const resultValid = await rule.validator('4111 1111 1111 1111')
    expect(resultValid).toEqual({ valid: true, message: '' })

    const resultInvalid = await rule.validator('4111 1111 1111 1112')
    expect(resultInvalid.valid).toBe(false)
    expect(resultInvalid.message).toBe('Invalid credit card number')
  })

  it('returns true for empty value and false for non-digit lengths', async () => {
    const rule = ValidationRuleBuilder.creditCard('Bad cc')
    await expect(rule.validator('')).resolves.toEqual({ valid: true })
    const res = await rule.validator('4111x')
    expect(res.valid).toBe(false)
    expect(res.message).toBe('Bad cc')
  })
})

describe('ValidationRuleBuilder.greaterThan/lessThan/matchField', () => {
  it('greaterThan compares numbers as strings; treats missing or zero value as valid due to falsy check', () => {
    const rule = ValidationRuleBuilder.greaterThan('min')
    expect(rule.relatedField).toBe('min')
    expect(rule.comparator('5', '3')).toBe(true)
    expect(rule.comparator('3', '5')).toBe(false)
    expect(rule.comparator(0, 5)).toBe(true) // actual behavior due to falsy 0
  })

  it('lessThan compares properly and treats missing as valid', () => {
    const rule = ValidationRuleBuilder.lessThan('max')
    expect(rule.comparator('2', '3')).toBe(true)
    expect(rule.comparator('5', '3')).toBe(false)
    expect(rule.comparator('', '3')).toBe(true)
  })

  it('matchField compares strict equality', () => {
    const rule = ValidationRuleBuilder.matchField('confirm')
    expect(rule.comparator('abc', 'abc')).toBe(true)
    expect(rule.comparator('abc', 'Abc')).toBe(false)
  })
})

describe('ValidationRuleBuilder.uniqueInArray', () => {
  it('returns valid when value not in array', async () => {
    const rule = ValidationRuleBuilder.uniqueInArray(['a', 'b'])
    const res = await rule.validator('c')
    expect(res).toEqual({ valid: true, message: '' })
  })

  it('returns invalid when value exists; returns valid for falsy value', async () => {
    const rule = ValidationRuleBuilder.uniqueInArray(['x', 'y'], 'Not unique')
    const res1 = await rule.validator('x')
    expect(res1.valid).toBe(false)
    expect(res1.message).toBe('Not unique')

    const res2 = await rule.validator('')
    expect(res2.valid).toBe(true)
  })
})

describe('ValidationRuleBuilder.asyncRemoteValidation', () => {
  const endpoint = '/validate'
  const originalFetch = global.fetch

  afterEach(() => {
    jest.clearAllMocks()
    global.fetch = originalFetch
  })

  it('calls fetch with correct payload and handles valid response', async () => {
    const fakeFetch = jest.fn().mockResolvedValue({
      json: async () => ({ valid: true })
    })
    global.fetch = fakeFetch as any

    const rule = ValidationRuleBuilder.asyncRemoteValidation(endpoint, { extra: 1 }, 'Default msg')
    const formData = { id: 123 }
    const res = await rule.validator('value', formData)
    expect(res).toEqual({ valid: true, message: '' })

    expect(fakeFetch).toHaveBeenCalledTimes(1)
    const [calledEndpoint, options] = fakeFetch.mock.calls[0]
    expect(calledEndpoint).toBe(endpoint)
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    const body = JSON.parse(options.body)
    expect(body.value).toBe('value')
    expect(body.extra).toBe(1)
    expect(body.formData).toEqual(formData)
  })

  it('handles invalid response with message fallback', async () => {
    const fakeFetch = jest.fn().mockResolvedValue({
      json: async () => ({ valid: false, message: 'Not ok' })
    })
    global.fetch = fakeFetch as any

    const rule = ValidationRuleBuilder.asyncRemoteValidation(endpoint)
    const res = await rule.validator('abc', { any: 'data' })
    expect(res.valid).toBe(false)
    expect(res.message).toBe('Not ok')
  })

  it('handles fetch error with service unavailable message', async () => {
    const fakeFetch = jest.fn().mockRejectedValue(new Error('network'))
    global.fetch = fakeFetch as any

    const rule = ValidationRuleBuilder.asyncRemoteValidation(endpoint)
    const res = await rule.validator('abc', {})
    expect(res.valid).toBe(false)
    expect(res.message).toBe('Validation service unavailable')
  })
})

describe('FormValidationHelpers.sanitizeInput', () => {
  it('sanitizes email to lowercase and trims', () => {
    const out = FormValidationHelpers.sanitizeInput('  User@Example.COM  ', 'email')
    expect(out).toBe('user@example.com')
  })

  it('sanitizes phone keeping digits and common symbols', () => {
    const out = FormValidationHelpers.sanitizeInput(' (555) 123-4567 ext 89 ', 'phone')
    expect(out).toBe('(555) 123-4567  89')
  })

  it('sanitizes number removing non-numeric except dot and minus', () => {
    const out = FormValidationHelpers.sanitizeInput(' $-12,345.67usd ', 'number')
    expect(out).toBe('-12345.67')
  })

  it('sanitizes alphanumeric only', () => {
    const out = FormValidationHelpers.sanitizeInput(' a-b_c!1@2#3 ', 'alphanumeric')
    expect(out).toBe('abC123'.toLowerCase() === 'abC123' ? 'abC123' : 'abC123') // ensure exact characters; case preserved
    expect(out).toBe('abC123'.replace(/[^a-zA-Z0-9]/g, '')) // align with logic
  })

  it('trims text by default and returns falsy unchanged', () => {
    const out1 = FormValidationHelpers.sanitizeInput('  hello  ')
    expect(out1).toBe('hello')
    const out2 = FormValidationHelpers.sanitizeInput('', 'email')
    expect(out2).toBe('')
    const out3 = FormValidationHelpers.sanitizeInput(null, 'text')
    expect(out3).toBeNull()
  })
})

describe('FormValidationHelpers.formatErrorMessage', () => {
  it('formats field name with spaces before capitals and joins messages', () => {
    const msg = FormValidationHelpers.formatErrorMessage('firstName', ['is required', 'must be valid'])
    expect(msg).toBe('first Name: is required, must be valid')
  })

  it('returns empty string when no errors', () => {
    expect(FormValidationHelpers.formatErrorMessage('anyField', [])).toBe('')
    expect(FormValidationHelpers.formatErrorMessage('anyField', null)).toBe('')
  })
})

describe('FormValidationHelpers.groupValidationResults', () => {
  it('groups errors, warnings, and valid fields', () => {
    const input = {
      fieldA: { errors: ['err1'], warnings: [], valid: false },
      fieldB: { errors: [], warnings: ['warn1'], valid: true },
      fieldC: { errors: [], warnings: [], valid: true },
      fieldD: { errors: [], warnings: ['warn2'], valid: true }
    }
    const grouped = FormValidationHelpers.groupValidationResults(input)
    expect(grouped.errors).toEqual([{ field: 'fieldA', messages: ['err1'] }])
    expect(grouped.warnings).toEqual([
      { field: 'fieldB', messages: ['warn1'] },
      { field: 'fieldD', messages: ['warn2'] }
    ])
    expect(grouped.valid).toEqual(['fieldC'])
  })
})

describe('FormValidationHelpers.createDebouncer', () => {
  it('calls scheduled function immediately and clears previous "timeout" value', () => {
    const originalClearTimeout = global.clearTimeout
    global.clearTimeout = jest.fn()

    try {
      const debouncer = FormValidationHelpers.createDebouncer(300)
      const fn = jest.fn()
      debouncer.schedule(fn)
      expect(fn).toHaveBeenCalledTimes(1)

      const fn2 = jest.fn()
      debouncer.schedule(fn2)
      expect(global.clearTimeout).toHaveBeenCalledTimes(2)
      expect(fn2).toHaveBeenCalledTimes(1)
    } finally {
      global.clearTimeout = originalClearTimeout
    }
  })

  it('cancel calls clearTimeout', () => {
    const originalClearTimeout = global.clearTimeout
    global.clearTimeout = jest.fn()

    try {
      const debouncer = FormValidationHelpers.createDebouncer(100)
      debouncer.cancel()
      expect(global.clearTimeout).toHaveBeenCalledTimes(1)
    } finally {
      global.clearTimeout = originalClearTimeout
    }
  })
})

describe('FormValidationHelpers.calculatePasswordStrength', () => {
  it('returns None for empty password', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('')
    expect(res).toEqual({ strength: 0, label: 'None', feedback: [] })
  })

  it('returns Weak with appropriate feedback for very simple password', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('a')
    expect(res.label).toBe('Weak')
    expect(res.strength).toBeGreaterThanOrEqual(1)
    expect(res.feedback).toEqual(expect.arrayContaining(['Use at least 8 characters', 'Add numbers', 'Add special characters']))
  })

  it('returns Very Strong for complex password', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('Abcdef12!')
    expect(res.label).toBe('Very Strong')
    expect(res.strength).toBeGreaterThanOrEqual(5)
  })

  it('penalizes repeated characters', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('AAAAAAA1!')
    expect(res.strength).toBeGreaterThan(0)
    expect(res.feedback).toEqual(expect.arrayContaining(['Avoid repeated characters']))
  })
})