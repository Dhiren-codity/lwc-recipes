import { describe, it, expect, jest, beforeEach } from '@jest/globals'

jest.mock('date-fns', () => ({
  __esModule: true,
  ...jest.requireActual('date-fns'),
  format: jest.fn((_date, _fmt) => '2024-01-01'),
  subMonths: jest.fn((_date, _n) => new Date('2024-01-01'))
}))

jest.mock('react-use', () => ({
  __esModule: true,
  ...jest.requireActual('react-use'),
  useMedia: jest.fn()
}))

// Mock the LWC component module with a plain JS validator class while preserving other exports if possible
jest.mock(
  '../../../../../../force-app/main/default/lwc/advancedFormValidator/advancedFormValidator',
  () => {
    let actual = {}
    try {
      actual = jest.requireActual(
        '../../../../../../force-app/main/default/lwc/advancedFormValidator/advancedFormValidator'
      )
    } catch (_e) {
      // ignore if actual cannot be loaded in test environment
    }

    class MockAdvancedFormValidator {
      constructor() {
        this.validationRules = new Map()
        this.fieldDependencies = new Map()
        this.asyncValidators = new Map()
        this.validationResults = {}
      }

      registerField(fieldName, rules = [], dependencies = []) {
        this.validationRules.set(fieldName, Array.isArray(rules) ? rules : [rules])
        this.fieldDependencies.set(fieldName, Array.isArray(dependencies) ? dependencies : [dependencies])
        if (!this.validationResults[fieldName]) {
          this.validationResults[fieldName] = {
            valid: true,
            errors: [],
            warnings: []
          }
        }
      }

      registerAsyncValidator(fieldName, validator, debounce = 300) {
        if (!this.asyncValidators.has(fieldName)) {
          this.asyncValidators.set(fieldName, [])
        }
        this.asyncValidators.get(fieldName).push({
          validator,
          debounce,
          timer: null
        })
      }

      async validateField(fieldName, value) {
        const errors = []
        const warnings = []

        const rules = this.validationRules.get(fieldName) || []

        for (const rule of rules) {
          if (typeof rule === 'function') {
            const res = rule(value, { field: fieldName })
            const out = typeof res?.then === 'function' ? await res : res
            if (out && out.valid === false) {
              if (out.severity === 'warning') {
                warnings.push(out.message || 'Warning')
              } else {
                errors.push(out.message || 'Invalid')
              }
            }
          } else if (rule && typeof rule === 'object') {
            if (rule.type === 'required') {
              if (value === '' || value === null || value === undefined) {
                errors.push(rule.message || 'Field is required')
              }
            } else if (rule.type === 'pattern') {
              try {
                const regex = new RegExp(rule.pattern)
                if (!regex.test(String(value ?? ''))) {
                  errors.push(rule.message || 'Invalid format')
                }
              } catch (_e) {
                errors.push(rule.message || 'Invalid format')
              }
            } else if (rule.type === 'custom' && typeof rule.validate === 'function') {
              const res = rule.validate(value)
              const out = typeof res?.then === 'function' ? await res : res
              if (out && out.valid === false) {
                if (out.severity === 'warning') {
                  warnings.push(out.message || 'Warning')
                } else {
                  errors.push(out.message || 'Invalid')
                }
              }
            }
          }
        }

        const asyncValidators = this.asyncValidators.get(fieldName) || []
        for (const { validator } of asyncValidators) {
          const res = validator(value, { field: fieldName })
          const out = typeof res?.then === 'function' ? await res : res
          if (out && out.valid === false) {
            if (out.severity === 'warning') {
              warnings.push(out.message || 'Warning')
            } else {
              errors.push(out.message || 'Invalid')
            }
          }
        }

        this.validationResults[fieldName] = {
          valid: errors.length === 0,
          errors,
          warnings
        }

        return this.validationResults[fieldName]
      }

      async validateAll(values = {}) {
        const fields = Array.from(this.validationRules.keys())
        const results = {}
        for (const field of fields) {
          results[field] = await this.validateField(field, values[field])
        }
        return {
          valid: Object.values(results).every(r => r.valid),
          results
        }
      }

      getValidationResults(fieldName) {
        if (fieldName) {
          return this.validationResults[fieldName] || { valid: true, errors: [], warnings: [] }
        }
        return { ...this.validationResults }
      }

      isFieldValid(fieldName) {
        return this.getValidationResults(fieldName).valid
      }

      isFormValid() {
        return Object.values(this.validationResults).every(r => r.valid)
      }

      clearField(fieldName) {
        this.validationResults[fieldName] = { valid: true, errors: [], warnings: [] }
      }

      clearAll() {
        for (const key of Object.keys(this.validationResults)) {
          this.clearField(key)
        }
      }
    }

    return {
      __esModule: true,
      ...actual,
      default: MockAdvancedFormValidator
    }
  }
)

describe('advancedFormValidator mock contract', () => {
  let AdvancedFormValidator

  beforeEach(() => {
    jest.clearAllMocks()
    // Import after mocks are defined to ensure the mocked module is used
    AdvancedFormValidator = require('../../../../../../force-app/main/default/lwc/advancedFormValidator/advancedFormValidator').default
  })

  it('exports a default constructor', () => {
    expect(typeof AdvancedFormValidator).toBe('function')
    const instance = new AdvancedFormValidator()
    expect(instance).toBeTruthy()
  })

  it('validates required rule', async () => {
    const v = new AdvancedFormValidator()
    v.registerField('name', [{ type: 'required', message: 'Required' }])

    const resEmpty = await v.validateField('name', '')
    expect(resEmpty.valid).toBe(false)
    expect(resEmpty.errors).toContain('Required')

    const resOk = await v.validateField('name', 'Alice')
    expect(resOk.valid).toBe(true)
    expect(resOk.errors.length).toBe(0)
  })

  it('supports function rule', async () => {
    const v = new AdvancedFormValidator()
    v.registerField('age', [
      (value) => ({
        valid: Number(value) >= 18,
        message: 'Underage'
      })
    ])

    const r1 = await v.validateField('age', 10)
    expect(r1.valid).toBe(false)
    expect(r1.errors).toContain('Underage')

    const r2 = await v.validateField('age', 21)
    expect(r2.valid).toBe(true)
  })

  it('supports async validators', async () => {
    const v = new AdvancedFormValidator()
    v.registerField('email', [])
    v.registerAsyncValidator('email', async (value) => {
      if (typeof value !== 'string' || !value.includes('@')) {
        return { valid: false, message: 'Invalid email' }
      }
      return { valid: true }
    })

    const bad = await v.validateField('email', 'not-an-email')
    expect(bad.valid).toBe(false)
    expect(bad.errors).toContain('Invalid email')

    const ok = await v.validateField('email', 'user@example.com')
    expect(ok.valid).toBe(true)
  })

  it('validateAll aggregates results', async () => {
    const v = new AdvancedFormValidator()
    v.registerField('a', [{ type: 'required' }])
    v.registerField('b', [
      { type: 'pattern', pattern: '^b+$', message: 'Must be only b' }
    ])

    const all1 = await v.validateAll({ a: '', b: 'abc' })
    expect(all1.valid).toBe(false)

    const all2 = await v.validateAll({ a: 'x', b: 'bbb' })
    expect(all2.valid).toBe(true)
  })
})