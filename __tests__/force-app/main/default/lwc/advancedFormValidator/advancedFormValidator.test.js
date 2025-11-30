import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import AdvancedFormValidator from '../../../../../../force-app/main/default/lwc/advancedFormValidator/advancedFormValidator'

function newComponent() {
  const element = createElement('c-advanced-form-validator', { is: AdvancedFormValidator })
  document.body.appendChild(element)
  return element
}

afterEach(() => {
  jest.clearAllMocks()
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
})

describe('AdvancedFormValidator - registration', () => {
  it('registerField initializes rules, dependencies, and initial validation results', () => {
    const element = newComponent()
    const ruleFn = (v) => ({ valid: true })
    element.registerField('name', [ruleFn], ['dep1'])

    expect(element.validationRules.get('name')).toEqual([ruleFn])
    expect(element.fieldDependencies.get('name')).toEqual(['dep1'])
    expect(element.getFieldValidation('name')).toEqual({ valid: true, errors: [], warnings: [] })
  })

  it('registerAsyncValidator stores validators with debounce and accumulates multiple validators', () => {
    const element = newComponent()
    const v1 = jest.fn().mockResolvedValue({ valid: true })
    const v2 = jest.fn().mockResolvedValue({ valid: true })
    element.registerField('email', [])
    element.registerAsyncValidator('email', v1, 500)
    element.registerAsyncValidator('email', v2)

    const arr = element.asyncValidators.get('email')
    expect(arr).toHaveLength(2)
    expect(arr[0].validator).toBe(v1)
    expect(arr[0].debounce).toBe(500)
    expect(arr[0].timer).toBeNull()
    expect(arr[1].validator).toBe(v2)
    expect(arr[1].debounce).toBe(300)
  })
})

describe('AdvancedFormValidator - validateField sync rules', () => {
  it('function rule producing warning results in warnings only and valid true', async () => {
    const element = newComponent()
    const warnRule = () => ({ valid: false, message: 'warn1', severity: 'warning' })
    element.registerField('field1', [warnRule])

    const res = await element.validateField('field1', 'v', {})
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['warn1'])
  })

  it('required rule failing produces default error and hasErrors true', async () => {
    const element = newComponent()
    element.registerField('f', [{ type: 'required' }])

    const res = await element.validateField('f', '', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Field is required'])
    expect(res.warnings).toEqual([])
    expect(element.hasErrors()).toBe(true)
  })

  it('pattern rule invalid uses default message', async () => {
    const element = newComponent()
    element.registerField('code', [{ type: 'pattern', pattern: '^[A-Z]+$' }])

    const res = await element.validateField('code', 'abc', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Invalid format'])
    expect(res.warnings).toEqual([])
  })

  it('length rule invalid uses default message with min and max', async () => {
    const element = newComponent()
    element.registerField('nick', [{ type: 'length', min: 2, max: 4 }])

    const res = await element.validateField('nick', 'a', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Length must be between 2 and 4'])
    expect(res.warnings).toEqual([])
  })

  it('range rule with non-numeric value returns "Value must be numeric"', async () => {
    const element = newComponent()
    element.registerField('age', [{ type: 'range', min: 1, max: 99 }])

    const res = await element.validateField('age', 'abc', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Value must be numeric'])
    expect(res.warnings).toEqual([])
  })

  it('range rule failure with severity warning results in warnings only', async () => {
    const element = newComponent()
    element.registerField('score', [{ type: 'range', min: 5, max: 10, severity: 'warning' }])

    const res = await element.validateField('score', 100, {})
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['Value must be between 5 and 10'])
  })

  it('custom rule validator returns its message on failure', async () => {
    const element = newComponent()
    const customValidator = jest.fn().mockResolvedValue({ valid: false, message: 'custom fail' })
    element.registerField('x', [{ type: 'custom', validator: customValidator }])

    const formData = { x: 5 }
    const res = await element.validateField('x', 5, formData)
    expect(customValidator).toHaveBeenCalledWith(5, formData)
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['custom fail'])
    expect(res.warnings).toEqual([])
  })

  it('conditional rule with false condition returns valid and ignores inner rule', async () => {
    const element = newComponent()
    const condition = jest.fn().mockResolvedValue(false)
    element.registerField('cf', [
      { type: 'conditional', condition, rule: { type: 'required', message: 'should not run' } }
    ])
    const formData = { cf: '' }
    const res = await element.validateField('cf', '', formData)
    expect(condition).toHaveBeenCalledWith(formData)
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual([])
  })

  it('conditional rule with true condition executes inner rule and fails accordingly', async () => {
    const element = newComponent()
    const condition = jest.fn().mockResolvedValue(true)
    element.registerField('ct', [
      { type: 'conditional', condition, rule: { type: 'required', message: 'Need' } }
    ])

    const res = await element.validateField('ct', '', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Need'])
    expect(res.warnings).toEqual([])
  })

  it('cross-field rule compares values and returns default message on failure', async () => {
    const element = newComponent()
    element.registerField('confirm', [
      { type: 'cross-field', relatedField: 'password', comparator: (v, rv) => v === rv }
    ])
    const formData = { password: 'abc', confirm: '123' }
    const res = await element.validateField('confirm', '123', formData)
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['Cross-field validation failed'])
    expect(res.warnings).toEqual([])
  })

  it('unknown rule type is treated as valid', async () => {
    const element = newComponent()
    element.registerField('u', [{ type: 'unknown', message: 'ignored' }])

    const res = await element.validateField('u', 'anything', {})
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual([])
  })
})

describe('AdvancedFormValidator - async validators and timers', () => {
  it('async validators are executed and aggregated into errors', async () => {
    const element = newComponent()
    element.registerField('af', [])
    const asyncV = jest.fn().mockResolvedValue({ valid: false, message: 'async error' })
    element.registerAsyncValidator('af', asyncV)

    const res = await element.validateField('af', 'v', {})
    expect(asyncV).toHaveBeenCalledWith('v', {})
    expect(res.valid).toBe(false)
    expect(res.errors).toEqual(['async error'])
    expect(res.warnings).toEqual([])
  })

  it('clearTimeout is called when async validator has an existing timer', async () => {
    const element = newComponent()
    element.registerField('af', [])
    const asyncV = jest.fn().mockResolvedValue({ valid: true })
    element.registerAsyncValidator('af', asyncV)

    const validators = element.asyncValidators.get('af')
    const timer = setTimeout(() => {}, 1000)
    validators[0].timer = timer

    const clearSpy = jest.spyOn(global, 'clearTimeout')
    await element.validateField('af', 'value', {})
    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(clearSpy).toHaveBeenCalledWith(timer)
  })
})

describe('AdvancedFormValidator - dependencies', () => {
  it('validating a field triggers validation for its dependent fields when present in formData', async () => {
    const element = newComponent()
    // password field depends on confirm
    element.registerField('password', [], ['confirm'])
    element.registerField('confirm', [
      { type: 'cross-field', relatedField: 'password', comparator: (v, rv) => v === rv }
    ])

    const formData = { password: 'abc', confirm: 'xyz' }
    const res = await element.validateField('password', 'abc', formData)
    expect(res.valid).toBe(true)
    const confirmResult = element.validationResults['confirm']
    expect(confirmResult.valid).toBe(false)
    expect(confirmResult.errors).toEqual(['Cross-field validation failed'])
  })
})

describe('AdvancedFormValidator - validateForm and aggregation', () => {
  it('validateForm aggregates results and counts errors and warnings', async () => {
    const element = newComponent()
    element.registerField('f1', [{ type: 'required', message: 'Need' }])
    element.registerField('f2', [{ type: 'pattern', pattern: '^\\d+$', message: 'Digits only', severity: 'warning' }])
    element.registerField('f3', [])
    const asyncV = jest.fn().mockResolvedValue({ valid: false, message: 'async err' })
    element.registerAsyncValidator('f3', asyncV)

    const formData = { f1: '', f2: 'abc', f3: 1 }
    const formResult = await element.validateForm(formData)

    expect(formResult.valid).toBe(false)
    expect(formResult.errorCount).toBe(2)
    expect(formResult.warningCount).toBe(1)
    expect(formResult.results.f1.errors).toEqual(['Need'])
    expect(formResult.results.f2.warnings).toEqual(['Digits only'])
    expect(formResult.results.f3.errors).toEqual(['async err'])
  })
})

describe('AdvancedFormValidator - getters and clearing results', () => {
  it('getFieldValidation returns default for non-existent field', () => {
    const element = newComponent()
    expect(element.getFieldValidation('nope')).toEqual({ valid: true, errors: [], warnings: [] })
  })

  it('clearValidation(fieldName) resets that field to default state', async () => {
    const element = newComponent()
    element.registerField('a', [{ type: 'required' }])

    await element.validateField('a', '', {})
    expect(element.hasErrors()).toBe(true)
    element.clearValidation('a')

    const resAfter = element.getFieldValidation('a')
    expect(resAfter).toEqual({ valid: true, errors: [], warnings: [] })
    expect(element.hasErrors()).toBe(false)
  })

  it('clearValidation() without args resets all validation results', async () => {
    const element = newComponent()
    element.registerField('a', [{ type: 'required' }])
    element.registerField('b', [{ type: 'required' }])
    await element.validateField('a', '', {})
    await element.validateField('b', '', {})

    expect(element.hasErrors()).toBe(true)
    element.clearValidation()
    expect(element.validationResults).toEqual({})
    expect(element.hasErrors()).toBe(false)
  })

  it('getErrorSummary returns only fields with errors or warnings and includes warnings even if valid', async () => {
    const element = newComponent()
    element.registerField('warnField', [{ type: 'range', min: 5, max: 10, severity: 'warning' }])
    element.registerField('okField', [{ type: 'pattern', pattern: '^\\d+$' }])

    await element.validateField('warnField', 100, {})
    await element.validateField('okField', '123', {})

    const summary = element.getErrorSummary()
    expect(Object.keys(summary)).toEqual(['warnField'])
    expect(summary.warnField.errors).toEqual([])
    expect(summary.warnField.warnings).toEqual(['Value must be between 5 and 10'])
  })

  it('hasErrors returns false when only warnings exist', async () => {
    const element = newComponent()
    element.registerField('onlyWarn', [{ type: 'pattern', pattern: '^\\d+$', message: 'warn digits', severity: 'warning' }])

    const res = await element.validateField('onlyWarn', 'abc', {})
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.warnings).toEqual(['warn digits'])
    expect(element.hasErrors()).toBe(false)
  })
})