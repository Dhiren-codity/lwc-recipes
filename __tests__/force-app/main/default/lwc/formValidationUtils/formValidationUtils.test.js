import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { ValidationRuleBuilder, FormValidationHelpers } from '../../../../../../force-app/main/default/lwc/formValidationUtils/formValidationUtils'

describe('ValidationRuleBuilder', () => {
  afterEach(() => {
    jest.clearAllMocks()
    // @ts-ignore
    if (global.fetch) delete global.fetch
  })

  it('required returns correct structure with default and custom message', () => {
    const def = ValidationRuleBuilder.required()
    expect(def).toEqual({
      type: 'required',
      message: 'Field is required',
      severity: 'error'
    })

    const custom = ValidationRuleBuilder.required('You must fill this')
    expect(custom).toEqual({
      type: 'required',
      message: 'You must fill this',
      severity: 'error'
    })
  })

  it('pattern returns correct structure and uses provided regex', () => {
    const re = /^[A-Z]+$/
    const rule = ValidationRuleBuilder.pattern(re)
    expect(rule.type).toBe('pattern')
    expect(rule.severity).toBe('error')
    expect(rule.message).toBe('Invalid format')
    expect(rule.pattern).toBe(re)
    expect(rule.pattern.test('ABC')).toBe(true)
    expect(rule.pattern.test('Abc')).toBe(false)
  })

  it('length returns object with min/max and default/custom message', () => {
    const ruleDefault = ValidationRuleBuilder.length(2, 5)
    expect(ruleDefault).toEqual({
      type: 'length',
      min: 2,
      max: 5,
      message: 'Length must be between 2 and 5',
      severity: 'error'
    })

    const ruleCustom = ValidationRuleBuilder.length(1, 10, 'Custom length message')
    expect(ruleCustom).toEqual({
      type: 'length',
      min: 1,
      max: 10,
      message: 'Custom length message',
      severity: 'error'
    })
  })

  it('range returns object with min/max and default/custom message', () => {
    const ruleDefault = ValidationRuleBuilder.range(10, 20)
    expect(ruleDefault).toEqual({
      type: 'range',
      min: 10,
      max: 20,
      message: 'Value must be between 10 and 20',
      severity: 'error'
    })

    const ruleCustom = ValidationRuleBuilder.range(0, 100, 'Range is 0-100 only')
    expect(ruleCustom).toEqual({
      type: 'range',
      min: 0,
      max: 100,
      message: 'Range is 0-100 only',
      severity: 'error'
    })
  })

  it('custom wraps validator and preserves message/severity', async () => {
    const validator = jest.fn(async (v) => ({ valid: v === 'ok', message: v === 'ok' ? '' : 'bad' }))
    const rule = ValidationRuleBuilder.custom(validator, 'Default fail')
    expect(rule.type).toBe('custom')
    expect(rule.severity).toBe('error')
    expect(rule.message).toBe('Default fail')

    const res1 = await rule.validator('ok')
    const res2 = await rule.validator('nope')
    expect(res1).toEqual({ valid: true, message: '' })
    expect(res2).toEqual({ valid: false, message: 'bad' })
    expect(validator).toHaveBeenCalledTimes(2)
  })

  it('conditional returns object with condition and rule', () => {
    const condition = jest.fn(() => true)
    const innerRule = ValidationRuleBuilder.required()
    const rule = ValidationRuleBuilder.conditional(condition, innerRule)
    expect(rule).toEqual({
      type: 'conditional',
      condition,
      rule: innerRule,
      severity: 'error'
    })
    expect(rule.condition()).toBe(true)
  })

  it('crossField returns object with comparator and default/custom message', () => {
    const comp = (v, o) => v === o
    const ruleDefault = ValidationRuleBuilder.crossField('other', comp)
    expect(ruleDefault.type).toBe('cross-field')
    expect(ruleDefault.relatedField).toBe('other')
    expect(ruleDefault.comparator('a', 'a')).toBe(true)
    expect(ruleDefault.severity).toBe('error')
    expect(ruleDefault.message).toBe('Cross-field validation failed')

    const ruleCustom = ValidationRuleBuilder.crossField('x', comp, 'Must match x')
    expect(ruleCustom.message).toBe('Must match x')
  })

  it('email rule uses regex that matches valid emails and rejects invalid, with default/custom message', () => {
    const ruleDefault = ValidationRuleBuilder.email()
    expect(ruleDefault.type).toBe('pattern')
    expect(ruleDefault.severity).toBe('error')
    expect(ruleDefault.message).toBe('Invalid email format')
    expect(ruleDefault.pattern).toBeInstanceOf(RegExp)
    expect(ruleDefault.pattern.test('test@example.com')).toBe(true)
    expect(ruleDefault.pattern.test('not-an-email')).toBe(false)

    const ruleCustom = ValidationRuleBuilder.email('Bad email')
    expect(ruleCustom.message).toBe('Bad email')
  })

  it('phone rule regex validates numbers with at least 10 characters', () => {
    const rule = ValidationRuleBuilder.phone()
    expect(rule.pattern.test('1234567890')).toBe(true)
    expect(rule.pattern.test('+1 (234) 567-8901')).toBe(true)
    expect(rule.pattern.test('12345')).toBe(false)
  })

  it('url rule regex validates http/https URLs', () => {
    const rule = ValidationRuleBuilder.url()
    expect(rule.pattern.test('http://example.com')).toBe(true)
    expect(rule.pattern.test('https://example.com/path?x=1')).toBe(true)
    expect(rule.pattern.test('ftp://example.com')).toBe(false)
  })

  it('zipCode uses country-specific patterns and fallback with message', () => {
    const us = ValidationRuleBuilder.zipCode('US')
    expect(us.message).toBe('Invalid US postal code')
    expect(us.pattern.test('12345')).toBe(true)
    expect(us.pattern.test('12345-6789')).toBe(true)
    expect(us.pattern.test('A1A 1A1')).toBe(false)

    const ca = ValidationRuleBuilder.zipCode('CA')
    expect(ca.message).toBe('Invalid CA postal code')
    expect(ca.pattern.test('K1A 0B1')).toBe(true)
    expect(ca.pattern.test('12345')).toBe(false)

    const uk = ValidationRuleBuilder.zipCode('UK')
    expect(uk.message).toBe('Invalid UK postal code')
    expect(uk.pattern.test('EC1A 1BB')).toBe(true)
    expect(uk.pattern.test('W1A 0AX')).toBe(true)

    const de = ValidationRuleBuilder.zipCode('DE')
    expect(de.message).toBe('Invalid DE postal code')
    expect(de.pattern.test('12345')).toBe(true) // falls back to US
  })

  it('creditCard validator returns valid for empty values', async () => {
    const rule = ValidationRuleBuilder.creditCard()
    const res = await rule.validator('')
    expect(res).toEqual({ valid: true })
  })

  it('creditCard validator validates using Luhn and strips spaces', async () => {
    const rule = ValidationRuleBuilder.creditCard()
    const validCard = '4111 1111 1111 1111'
    const invalidCard = '4111 1111 1111 1112'
    const ok = await rule.validator(validCard)
    const bad = await rule.validator(invalidCard)
    expect(ok).toEqual({ valid: true, message: '' })
    expect(bad).toEqual({ valid: false, message: 'Invalid credit card number' })
  })

  it('greaterThan comparator works and returns true when missing values', () => {
    const rule = ValidationRuleBuilder.greaterThan('min')
    expect(rule.type).toBe('cross-field')
    expect(rule.message).toBe('Value must be greater than min')
    expect(rule.comparator('', '5')).toBe(true)
    expect(rule.comparator('10', '')).toBe(true)
    expect(rule.comparator('10', '5')).toBe(true)
    expect(rule.comparator('2', '5')).toBe(false)
  })

  it('lessThan comparator works and returns true when missing values', () => {
    const rule = ValidationRuleBuilder.lessThan('max')
    expect(rule.type).toBe('cross-field')
    expect(rule.message).toBe('Value must be less than max')
    expect(rule.comparator('', '5')).toBe(true)
    expect(rule.comparator('10', '')).toBe(true)
    expect(rule.comparator('2', '5')).toBe(true)
    expect(rule.comparator('10', '5')).toBe(false)
  })

  it('matchField comparator checks strict equality', () => {
    const rule = ValidationRuleBuilder.matchField('confirm')
    expect(rule.message).toBe('Value must match confirm')
    expect(rule.comparator('abc', 'abc')).toBe(true)
    expect(rule.comparator('abc', 'Abc')).toBe(false)
    expect(rule.comparator('1', 1)).toBe(false)
  })

  it('uniqueInArray custom validator checks uniqueness', async () => {
    const arr = ['a', 'b', 'c']
    const rule = ValidationRuleBuilder.uniqueInArray(arr)
    const dup = await rule.validator('b')
    const unique = await rule.validator('z')
    expect(dup).toEqual({ valid: false, message: 'Value must be unique' })
    expect(unique).toEqual({ valid: true, message: '' })
  })

  it('asyncRemoteValidation success true returns valid with empty message and correct fetch payload', async () => {
    const endpoint = '/validate'
    const params = { role: 'user', flag: true }
    const rule = ValidationRuleBuilder.asyncRemoteValidation(endpoint, params, 'Default message')

    const jsonMock = jest.fn().mockResolvedValue({ valid: true })
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ json: jsonMock })

    const formData = { id: 123 }
    const res = await rule.validator('value123', formData)
    expect(res).toEqual({ valid: true, message: '' })
    expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String)
    }))

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.value).toBe('value123')
    expect(body.role).toBe('user')
    expect(body.flag).toBe(true)
    expect(body.formData).toEqual(formData)
  })

  it('asyncRemoteValidation success false returns message from server or default', async () => {
    const endpoint = '/validate2'
    const ruleWithDefault = ValidationRuleBuilder.asyncRemoteValidation(endpoint, {}, 'Default fail msg')
    const jsonMock1 = jest.fn().mockResolvedValue({ valid: false, message: 'Server says no' })
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ json: jsonMock1 })
    const r1 = await ruleWithDefault.validator('abc', {})
    expect(r1).toEqual({ valid: false, message: 'Server says no' })

    const ruleNoServerMsg = ValidationRuleBuilder.asyncRemoteValidation(endpoint, {}, 'Default fail msg')
    const jsonMock2 = jest.fn().mockResolvedValue({ valid: false })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ json: jsonMock2 })
    const r2 = await ruleNoServerMsg.validator('abc', {})
    expect(r2).toEqual({ valid: false, message: 'Default fail msg' })
  })

  it('asyncRemoteValidation handles fetch errors and returns service unavailable message', async () => {
    const endpoint = '/validate3'
    const rule = ValidationRuleBuilder.asyncRemoteValidation(endpoint, {}, 'Some msg')
    // @ts-ignore
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    const res = await rule.validator('x', {})
    expect(res).toEqual({ valid: false, message: 'Validation service unavailable' })
  })
})

describe('FormValidationHelpers', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sanitizeInput returns value as-is for falsy inputs', () => {
    expect(FormValidationHelpers.sanitizeInput(null)).toBeNull()
    expect(FormValidationHelpers.sanitizeInput('')).toBe('')
    // undefined should return undefined
    expect(FormValidationHelpers.sanitizeInput(undefined)).toBeUndefined()
  })

  it('sanitizeInput processes email/phone/number/alphanumeric/text', () => {
    expect(FormValidationHelpers.sanitizeInput(' Test@Example.COM ', 'email')).toBe('test@example.com')
    expect(FormValidationHelpers.sanitizeInput(' (123) 456-7890 ext 55 ', 'phone')).toBe('(123)456-789055')
    expect(FormValidationHelpers.sanitizeInput(' -1,234.50USD ', 'number')).toBe('-1234.50')
    expect(FormValidationHelpers.sanitizeInput('abc-123_X ', 'alphanumeric')).toBe('abc123X')
    expect(FormValidationHelpers.sanitizeInput('  hello world  ', 'text')).toBe('hello world')
    expect(FormValidationHelpers.sanitizeInput('  hello world  ')).toBe('hello world')
  })

  it('formatErrorMessage returns empty string for no errors', () => {
    expect(FormValidationHelpers.formatErrorMessage('fieldName', [])).toBe('')
    expect(FormValidationHelpers.formatErrorMessage('fieldName', null)).toBe('')
    expect(FormValidationHelpers.formatErrorMessage('fieldName', undefined)).toBe('')
  })

  it('formatErrorMessage formats fieldName from camelCase and joins errors', () => {
    const msg = FormValidationHelpers.formatErrorMessage('postalCode', ['Invalid', 'Too short'])
    expect(msg).toBe('postal Code: Invalid, Too short')
    const msg2 = FormValidationHelpers.formatErrorMessage('FirstName', ['Missing'])
    expect(msg2).toBe('First Name: Missing')
  })

  it('groupValidationResults groups errors, warnings, and valid correctly', () => {
    const results = {
      field1: { errors: ['e1'], warnings: [], valid: false },
      field2: { errors: [], warnings: ['w1'], valid: true },
      field3: { errors: [], warnings: [], valid: true },
      field4: { errors: ['e2'], warnings: ['w2'], valid: true }
    }
    const grouped = FormValidationHelpers.groupValidationResults(results)
    expect(grouped.errors).toEqual([
      { field: 'field1', messages: ['e1'] },
      { field: 'field4', messages: ['e2'] }
    ])
    expect(grouped.warnings).toEqual([
      { field: 'field2', messages: ['w1'] },
      { field: 'field4', messages: ['w2'] }
    ])
    expect(grouped.valid).toEqual(['field3'])
  })

  it('createDebouncer calls scheduled function immediately and clearTimeout is invoked on schedule and cancel', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout')
    const debouncer = FormValidationHelpers.createDebouncer(100)
    const fn1 = jest.fn()
    const fn2 = jest.fn()

    debouncer.schedule(fn1)
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(clearSpy).toHaveBeenCalledTimes(1)

    debouncer.schedule(fn2)
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(clearSpy).toHaveBeenCalledTimes(2)

    debouncer.cancel()
    expect(clearSpy).toHaveBeenCalledTimes(3)
  })

  it('calculatePasswordStrength returns None for empty input', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('')
    expect(res).toEqual({ strength: 0, label: 'None', feedback: [] })
  })

  it('calculatePasswordStrength evaluates weak short password with feedback', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('abc')
    expect(res.strength).toBeGreaterThanOrEqual(1)
    expect(res.label).toBe('Weak')
    expect(res.feedback).toEqual(expect.arrayContaining(['Use at least 8 characters', 'Add numbers', 'Add special characters']))
  })

  it('calculatePasswordStrength rates strong mixed password', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('Abcdef12!')
    expect(res.strength).toBeGreaterThanOrEqual(4)
    expect(['Strong', 'Very Strong']).toContain(res.label)
    expect(res.feedback.length).toBeLessThanOrEqual(1)
  })

  it('calculatePasswordStrength penalizes repeated characters', () => {
    const res = FormValidationHelpers.calculatePasswordStrength('AAAAAAAAAAAA')
    expect(res.strength).toBeGreaterThanOrEqual(1)
    expect(res.feedback).toEqual(expect.arrayContaining(['Add numbers', 'Add special characters', 'Avoid repeated characters']))
    expect(['Weak', 'Fair', 'Good']).toContain(res.label)
  })
})