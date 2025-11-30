import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import AdvancedFormValidator from '../../../../../../force-app/main/default/lwc/advancedFormValidator/advancedFormValidator'

describe('AdvancedFormValidator', () => {
  let element

  const createComponent = () => {
    const el = createElement('c-advanced-form-validator', { is: AdvancedFormValidator })
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    jest.useFakeTimers()
    element = createComponent()
  })

  afterEach(() => {
    jest.clearAllMocks()
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild)
    }
    jest.useRealTimers()
  })

  it('registerField initializes rules, dependencies and initial validation results', () => {
    element.registerField('name', [{ type: 'required', message: 'Required' }], ['email'])

    expect(element.validationRules.get('name')).toEqual([{ type: 'required', message: 'Required' }])
    expect(element.fieldDependencies.get('name')).toEqual(['email'])
    expect(element.validationResults['name']).toEqual({ valid: true, errors: [], warnings: [] })
  })

  it('registerField without dependencies does not set fieldDependencies for that field', () => {
    element.registerField('age', [{ type: 'range', min: 18, max: 99 }])

    expect(element.validationRules.get('age')).toEqual([{ type: 'range', min: 18, max: 99 }])
    expect(element.fieldDependencies.has('age')).toBe(false)
  })

  it('required rule marks field invalid when value is empty/undefined', async () => {
    element.registerField('username', [{ type: 'required', message: 'Username is required' }])

    const result = await element.validateField('username', '')
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['Username is required'])
    expect(result.warnings).toEqual([])

    const result2 = await element.validateField('username', undefined)
    expect(result2.valid).toBe(false)
    expect(result2.errors).toEqual(['Username is required'])
  })

  it('required rule passes when value is non-empty', async () => {
    element.registerField('username', [{ type: 'required', message: 'Username is required' }])

    const result = await element.validateField('username', 'john')
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('pattern rule validates strings by regex and ignores empty values', async () => {
    element.registerField('code', [{ type: 'pattern', pattern: '^[A-Z]{3}[0-9]{2}$', message: 'Bad code' }])

    const okEmpty = await element.validateField('code', '')
    expect(okEmpty.valid).toBe(true)
    expect(okEmpty.errors).toEqual([])

    const bad = await element.validateField('code', 'abc12')
    expect(bad.valid).toBe(false)
    expect(bad.errors).toEqual(['Bad code'])

    const good = await element.validateField('code', 'ABC12')
    expect(good.valid).toBe(true)
    expect(good.errors).toEqual([])
  })

  it('length rule enforces min and max on string length and ignores empty values', async () => {
    element.registerField('nickname', [{ type: 'length', min: 2, max: 5, message: 'Length must be between 2 and 5' }])

    const emptyRes = await element.validateField('nickname', '')
    expect(emptyRes.valid).toBe(true)
    expect(emptyRes.errors).toEqual([])

    const tooShort = await element.validateField('nickname', 'A')
    expect(tooShort.valid).toBe(false)
    expect(tooShort.errors).toEqual(['Length must be between 2 and 5'])

    const tooLong = await element.validateField('nickname', 'ABCDEFG')
    expect(tooLong.valid).toBe(false)
    expect(tooLong.errors).toEqual(['Length must be between 2 and 5'])

    const ok = await element.validateField('nickname', 'Alex')
    expect(ok.valid).toBe(true)
    expect(ok.errors).toEqual([])
  })

  it('range rule requires numeric values and enforces min/max; ignores empty', async () => {
    element.registerField('age', [{ type: 'range', min: 18, max: 65 }])

    const emptyRes = await element.validateField('age', '')
    expect(emptyRes.valid).toBe(true)

    const notNumeric = await element.validateField('age', 'abc')
    expect(notNumeric.valid).toBe(false)
    expect(notNumeric.errors).toEqual(['Value must be numeric'])

    const tooLow = await element.validateField('age', '17')
    expect(tooLow.valid).toBe(false)
    expect(tooLow.errors[0]).toContain('Value must be between')

    const tooHigh = await element.validateField('age', 70)
    expect(tooHigh.valid).toBe(false)
    expect(tooHigh.errors[0]).toContain('Value must be between')

    const ok = await element.validateField('age', 30)
    expect(ok.valid).toBe(true)
  })

  it('function rule in rules array can return a warning without affecting validity', async () => {
    const warnRule = (value) => {
      if (value === 'edge') {
        return { valid: false, message: 'Edge case', severity: 'warning' }
      }
      return { valid: true }
    }
    element.registerField('status', [warnRule])

    const res = await element.validateField('status', 'edge', {})
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['Edge case'])
  })

  it('custom type rule invokes provided validator function and collects errors', async () => {
    const validatorFn = jest.fn().mockResolvedValue({ valid: false, message: 'Custom fail', severity: 'error' })
    element.registerField('custom', [{ type: 'custom', validator: validatorFn }])

    const res = await element.validateField('custom', 'x', {})
    expect(validatorFn).toHaveBeenCalledWith('x', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Custom fail'])
    expect(res.warnings).toEqual([])
  })

  it('conditional rule skips nested rule when condition returns false', async () => {
    const condition = jest.fn().mockResolvedValue(false)
    element.registerField('field', [{
      type: 'conditional',
      condition,
      rule: { type: 'required', message: 'Must not trigger' }
    }])

    const res = await element.validateField('field', '', {})
    expect(condition).toHaveBeenCalled()
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
  })

  it('conditional rule executes nested rule when condition true', async () => {
    const condition = jest.fn().mockResolvedValue(true)
    element.registerField('field', [{
      type: 'conditional',
      condition,
      rule: { type: 'required', message: 'Need value' }
    }])

    const res = await element.validateField('field', '', {})
    expect(condition).toHaveBeenCalled()
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Need value'])
  })

  it('cross-field rule compares against related field value', async () => {
    const comparator = (value, related) => value === related
    element.registerField('passwordConfirm', [{
      type: 'cross-field',
      relatedField: 'password',
      comparator,
      message: 'Passwords do not match'
    }])

    const res = await element.validateField('passwordConfirm', 'abc', { password: 'def' })
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Passwords do not match'])

    const res2 = await element.validateField('passwordConfirm', 'abc', { password: 'abc' })
    expect(res2.valid).toBe(true)
    expect(res2.errors).toEqual([])
  })

  it('registerAsyncValidator stores validators and validateField collects async errors', async () => {
    element.registerField('email', [])
    const asyncValidator = jest.fn().mockResolvedValue({ valid: false, message: 'Email taken', severity: 'error' })
    element.registerAsyncValidator('email', asyncValidator)

    const res = await element.validateField('email', 'user@example.com', {})
    expect(asyncValidator).toHaveBeenCalledWith('user@example.com', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Email taken'])
    expect(res.warnings).toEqual([])
  })

  it('async validator can create warnings without invalidating field', async () => {
    element.registerField('handle', [])
    const warnAsync = jest.fn().mockResolvedValue({ valid: false, message: 'Unusual handle', severity: 'warning' })
    element.registerAsyncValidator('handle', warnAsync)

    const res = await element.validateField('handle', 'weird_handle', {})
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['Unusual handle'])
  })

  it('validateField revalidates dependent fields when provided in formData', async () => {
    element.registerField('a', [], ['b'])
    element.registerField('b', [{ type: 'required', message: 'B required' }])
    const formData = { a: 'valueA', b: '' }

    const res = await element.validateField('a', 'valueA', formData)
    expect(res.valid).toBe(true)
    const bResult = element.getFieldValidation('b')
    expect(bResult.valid).toBe(false)
    expect(bResult.errors).toEqual(['B required'])
  })

  it('validateForm validates all registered fields and aggregates counts', async () => {
    element.registerField('name', [{ type: 'required', message: 'Name required' }])
    element.registerField('note', [
      (value) => value === 'warn' ? ({ valid: false, message: 'Just a warning', severity: 'warning' }) : ({ valid: true })
    ])
    const formData = { name: '', note: 'warn' }

    const formRes = await element.validateForm(formData)
    expect(formRes.valid).toBe(false)
    expect(formRes.errorCount).toBe(1)
    expect(formRes.warningCount).toBe(1)
    expect(formRes.results.name.valid).toBe(false)
    expect(formRes.results.note.valid).toBe(true)
    expect(formRes.results.note.warnings).toEqual(['Just a warning'])
    expect(element.validationResults).toEqual(formRes.results)
  })

  it('getFieldValidation returns default valid result for unknown field', () => {
    const res = element.getFieldValidation('unknown')
    expect(res).toEqual({ valid: true, errors: [], warnings: [] })
  })

  it('getFieldValidation returns last computed result for a field', async () => {
    element.registerField('zip', [{ type: 'length', min: 5, max: 5, message: 'ZIP must be 5 chars' }])
    const res = await element.validateField('zip', '123')
    const readBack = element.getFieldValidation('zip')
    expect(readBack).toEqual(res)
  })

  it('hasErrors reflects presence of invalid fields (warnings do not count as errors)', async () => {
    element.registerField('field1', [{ type: 'required' }])
    element.registerField('field2', [
      () => ({ valid: false, message: 'warn only', severity: 'warning' })
    ])

    await element.validateField('field1', '')
    await element.validateField('field2', 'x')
    expect(element.hasErrors()).toBe(true)

    await element.validateField('field1', 'ok')
    expect(element.hasErrors()).toBe(false)
  })

  it('clearValidation(fieldName) resets only that field; clearValidation() resets all', async () => {
    element.registerField('alpha', [{ type: 'required', message: 'need' }])
    element.registerField('beta', [{ type: 'required', message: 'need' }])

    await element.validateField('alpha', '')
    await element.validateField('beta', '')

    expect(element.getFieldValidation('alpha').valid).toBe(false)
    expect(element.getFieldValidation('beta').valid).toBe(false)

    element.clearValidation('alpha')
    expect(element.getFieldValidation('alpha')).toEqual({ valid: true, errors: [], warnings: [] })
    expect(element.getFieldValidation('beta').valid).toBe(false)

    element.clearValidation()
    expect(element.validationResults).toEqual({})
  })

  it('getErrorSummary returns fields with errors or warnings', async () => {
    element.registerField('f1', [{ type: 'required', message: 'req' }])
    element.registerField('f2', [
      () => ({ valid: false, message: 'warn', severity: 'warning' })
    ])
    element.registerField('f3', [])

    await element.validateField('f1', '')
    await element.validateField('f2', 'x')
    await element.validateField('f3', 'ok')

    const summary = element.getErrorSummary()
    expect(Object.keys(summary).sort()).toEqual(['f1', 'f2'])
    expect(summary.f1.errors).toEqual(['req'])
    expect(summary.f1.warnings).toEqual([])
    expect(summary.f2.errors).toEqual([])
    expect(summary.f2.warnings).toEqual(['warn'])
  })

  it('validateField clears existing async timers when present before executing async validators', async () => {
    element.registerField('timerField', [])
    const asyncValidator = jest.fn().mockResolvedValue({ valid: true })
    element.registerAsyncValidator('timerField', asyncValidator)

    const ctSpy = jest.spyOn(global, 'clearTimeout')
    const list = element.asyncValidators.get('timerField')
    const timerId = setTimeout(() => {}, 1000)
    list[0].timer = timerId

    const res = await element.validateField('timerField', 'value', {})
    expect(ctSpy).toHaveBeenCalledWith(timerId)
    expect(res.valid).toBe(true)
  })

  it('validateField updates validationResults for the field being validated', async () => {
    element.registerField('target', [{ type: 'required', message: 'target required' }])

    const res = await element.validateField('target', '')
    expect(element.validationResults['target']).toEqual(res)

    const res2 = await element.validateField('target', 'ok')
    expect(element.validationResults['target']).toEqual(res2)
    expect(res2.valid).toBe(true)
  })
})