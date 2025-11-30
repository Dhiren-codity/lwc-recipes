import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import AdvancedFormValidator from '../../../../../../force-app/main/default/lwc/advancedFormValidator/advancedFormValidator'

describe('AdvancedFormValidator', () => {
  let validator

  beforeEach(() => {
    validator = new AdvancedFormValidator()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('registerField initializes rules, dependencies, and results', () => {
    const rule = { type: 'required', message: 'Need it' }
    validator.registerField('name', [rule], ['dep1', 'dep2'])

    expect(Array.isArray(validator.validationRules.get('name'))).toBe(true)
    expect(validator.validationRules.get('name')).toEqual([rule])
    expect(validator.fieldDependencies.get('name')).toEqual(['dep1', 'dep2'])
    expect(validator.validationResults['name']).toEqual({
      valid: true,
      errors: [],
      warnings: []
    })
  })

  it('registerAsyncValidator stores validator with defaults', () => {
    const fn = jest.fn().mockResolvedValue({ valid: true })
    validator.registerAsyncValidator('email', fn)

    const validators = validator.asyncValidators.get('email')
    expect(Array.isArray(validators)).toBe(true)
    expect(validators).toHaveLength(1)
    expect(validators[0].validator).toBe(fn)
    expect(validators[0].debounce).toBe(300)
    expect(validators[0].timer).toBeNull()
  })

  it('validateField enforces required rule and sets errors', async () => {
    validator.registerField('age', [{ type: 'required' }])

    const result = await validator.validateField('age', '')
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['Field is required'])
    expect(result.warnings).toEqual([])
    expect(validator.hasErrors()).toBe(true)
  })

  it('validateField validates pattern rule correctly', async () => {
    validator.registerField('zip', [{ type: 'pattern', pattern: '^\\d{5}$' }])

    const ok = await validator.validateField('zip', '12345')
    expect(ok.valid).toBe(true)
    expect(ok.errors).toEqual([])
    expect(ok.warnings).toEqual([])

    const bad = await validator.validateField('zip', 'abc')
    expect(bad.valid).toBe(false)
    expect(bad.errors).toEqual(['Invalid format'])
  })

  it('validateField collects warnings and maintains valid when only warnings present', async () => {
    const warnRule = (value) => ({ valid: false, severity: 'warning', message: 'Too short' })
    validator.registerField('nickname', [warnRule])

    const res = await validator.validateField('nickname', 'x')
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['Too short'])
  })

  it('validateField incorporates async validator errors', async () => {
    validator.registerField('username', [])
    const asyncErr = jest.fn().mockResolvedValue({ valid: false, message: 'Taken' })
    validator.registerAsyncValidator('username', asyncErr)

    const res = await validator.validateField('username', 'bob')
    expect(asyncErr).toHaveBeenCalledWith('bob', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Taken'])
    expect(res.warnings).toEqual([])
  })

  it('validateField incorporates async validator warnings', async () => {
    validator.registerField('username', [])
    const asyncWarn = jest.fn().mockResolvedValue({ valid: false, severity: 'warning', message: 'Weak username' })
    validator.registerAsyncValidator('username', asyncWarn)

    const res = await validator.validateField('username', 'bob')
    expect(asyncWarn).toHaveBeenCalled()
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['Weak username'])
  })

  it('validateField clears existing async timers before running async validators', async () => {
    validator.registerField('field', [])
    const asyncFn = jest.fn().mockResolvedValue({ valid: true })
    validator.registerAsyncValidator('field', asyncFn)

    const validators = validator.asyncValidators.get('field')
    validators[0].timer = 123

    const clearSpy = jest.spyOn(global, 'clearTimeout')
    await validator.validateField('field', 'value')
    expect(clearSpy).toHaveBeenCalledWith(123)
  })

  it('validateField triggers dependency validation for dependent fields present in formData', async () => {
    validator.registerField('a', [], ['b'])
    validator.registerField('b', [{ type: 'required' }])

    const res = await validator.validateField('a', 'valA', { a: 'valA', b: '' })
    expect(res.valid).toBe(true) // no rules for 'a'
    const bValidation = validator.getFieldValidation('b')
    expect(bValidation.valid).toBe(false)
    expect(bValidation.errors).toEqual(['Field is required'])
  })

  it('validateForm aggregates results, counts errors and warnings', async () => {
    validator.registerField('x', [{ type: 'required' }])
    const warnRule = () => ({ valid: false, severity: 'warning', message: 'Consider more info' })
    validator.registerField('y', [warnRule])

    const res = await validator.validateForm({ x: '', y: 'ok' })
    expect(res.valid).toBe(false)
    expect(res.errorCount).toBe(1)
    expect(res.warningCount).toBe(1)
    expect(res.results.x.valid).toBe(false)
    expect(res.results.x.errors).toEqual(['Field is required'])
    expect(res.results.y.valid).toBe(true)
    expect(res.results.y.warnings).toEqual(['Consider more info'])
  })

  it('executeRule accepts function rules', async () => {
    const fnRule = () => ({ valid: false, message: 'Nope' })
    validator.registerField('fn', [fnRule])

    const res = await validator.validateField('fn', 'any')
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Nope'])
  })

  it('unknown rule type defaults to valid', async () => {
    validator.registerField('u', [{ type: 'unknown', message: '???' }])

    const res = await validator.validateField('u', 'v')
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual([])
  })

  it('length rule enforces min and max with default message', async () => {
    validator.registerField('len', [{ type: 'length', min: 2, max: 4 }])

    const bad = await validator.validateField('len', 'a')
    expect(bad.valid).toBe(false)
    expect(bad.errors).toEqual(['Length must be between 2 and 4'])

    const good = await validator.validateField('len', 'abcd')
    expect(good.valid).toBe(true)
    expect(good.errors).toEqual([])
  })

  it('range rule validates numeric range and reports non-numeric', async () => {
    validator.registerField('num', [{ type: 'range', min: 2, max: 3 }])

    const nonNumeric = await validator.validateField('num', 'abc')
    expect(nonNumeric.valid).toBe(false)
    expect(nonNumeric.errors).toEqual(['Value must be numeric'])

    const outOfRange = await validator.validateField('num', '1')
    expect(outOfRange.valid).toBe(false)
    expect(outOfRange.errors).toEqual(['Value must be between 2 and 3'])

    const inRange = await validator.validateField('num', '3')
    expect(inRange.valid).toBe(true)
  })

  it('conditional rule validates inner rule only when condition true', async () => {
    const condRule = {
      type: 'conditional',
      condition: async (formData) => formData.toggle === true,
      rule: { type: 'required', message: 'Needed' }
    }
    validator.registerField('cond', [condRule])

    const resTrue = await validator.validateField('cond', '', { toggle: true, cond: '' })
    expect(resTrue.valid).toBe(false)
    expect(resTrue.errors).toEqual(['Needed'])

    const resFalse = await validator.validateField('cond', '', { toggle: false, cond: '' })
    expect(resFalse.valid).toBe(true)
    expect(resFalse.errors).toEqual([])
  })

  it('cross-field rule compares with related field and errors by default', async () => {
    const crossRule = {
      type: 'cross-field',
      relatedField: 'pass',
      comparator: (value, related) => value === related
    }
    validator.registerField('passConfirm', [crossRule])

    const res = await validator.validateField('passConfirm', 'xyz', { pass: 'abc' })
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Cross-field validation failed'])
  })

  it('cross-field rule can produce warnings when severity is warning', async () => {
    const crossWarnRule = {
      type: 'cross-field',
      relatedField: 'pass',
      comparator: (value, related) => value === related,
      severity: 'warning'
    }
    validator.registerField('passConfirm', [crossWarnRule])

    const res = await validator.validateField('passConfirm', 'xyz', { pass: 'abc' })
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['Cross-field validation failed'])
  })

  it('getFieldValidation returns default for unknown field and actual for known', async () => {
    const unknown = validator.getFieldValidation('unknown')
    expect(unknown).toEqual({ valid: true, errors: [], warnings: [] })

    validator.registerField('known', [{ type: 'required' }])
    await validator.validateField('known', '')
    const known = validator.getFieldValidation('known')
    expect(known.valid).toBe(false)
    expect(known.errors).toEqual(['Field is required'])
  })

  it('hasErrors returns true when any field has errors', async () => {
    validator.registerField('f1', [{ type: 'required' }])
    validator.registerField('f2', [])
    await validator.validateField('f1', '')
    await validator.validateField('f2', 'ok')

    expect(validator.hasErrors()).toBe(true)
  })

  it('clearValidation resets specific field or all fields', async () => {
    validator.registerField('f1', [{ type: 'required' }])
    validator.registerField('f2', [{ type: 'required' }])

    await validator.validateField('f1', '')
    await validator.validateField('f2', '')

    expect(validator.getFieldValidation('f1').valid).toBe(false)
    expect(validator.getFieldValidation('f2').valid).toBe(false)

    validator.clearValidation('f1')
    expect(validator.getFieldValidation('f1')).toEqual({ valid: true, errors: [], warnings: [] })
    expect(validator.getFieldValidation('f2').valid).toBe(false)

    validator.clearValidation()
    expect(validator.validationResults).toEqual({})
  })

  it('getErrorSummary returns fields that have errors or warnings only', async () => {
    validator.registerField('a', [{ type: 'required' }])
    const warnRule = () => ({ valid: false, severity: 'warning', message: 'Heads up' })
    validator.registerField('b', [warnRule])
    validator.registerField('c', [])

    await validator.validateField('a', '')
    await validator.validateField('b', 'value')
    await validator.validateField('c', 'ok')

    const summary = validator.getErrorSummary()
    expect(Object.keys(summary).sort()).toEqual(['a', 'b'])
    expect(summary.a.errors).toEqual(['Field is required'])
    expect(summary.a.warnings).toEqual([])
    expect(summary.b.errors).toEqual([])
    expect(summary.b.warnings).toEqual(['Heads up'])
    expect(summary.c).toBeUndefined()
  })
})