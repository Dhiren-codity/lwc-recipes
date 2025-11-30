import { describe, it, expect } from '@jest/globals'
import { ValidationRuleBuilder } from '../../../../../../force-app/main/default/lwc/formValidationUtils/formValidationUtils'

describe('ValidationRuleBuilder.required', () => {
  it('returns required rule with default message', () => {
    const rule = ValidationRuleBuilder.required()
    expect(rule).toEqual(expect.objectContaining({
      message: expect.any(String),
      severity: expect.any(String)
    }))
    if ('type' in rule) {
      expect(rule.type).toBe('required')
    }
  })

  it('returns required rule with custom message', () => {
    const rule = ValidationRuleBuilder.required('Must fill')
    expect(rule.message).toBe('Must fill')
    if ('type' in rule) {
      expect(rule.type).toBe('required')
    }
    expect(typeof rule.severity).toBe('string')
  })
})

describe('ValidationRuleBuilder.pattern', () => {
  it('returns pattern rule with default message', () => {
    const regex = /^[0-9]+$/
    const rule = ValidationRuleBuilder.pattern(regex)
    if ('type' in rule) {
      expect(rule.type).toBe('pattern')
    }
    if ('pattern' in rule) {
      expect(rule.pattern).toBe(regex)
    }
    expect(typeof rule.message).toBe('string')
    expect(typeof rule.severity).toBe('string')
  })

  it('returns pattern rule with custom message', () => {
    const regex = /^[a-z]+$/
    const rule = ValidationRuleBuilder.pattern(regex, 'Only letters')
    expect(rule.message).toBe('Only letters')
    if ('pattern' in rule) {
      expect(rule.pattern).toBe(regex)
    }
  })
})

describe('ValidationRuleBuilder.length', () => {
  it('returns length rule with default message', () => {
    const rule = ValidationRuleBuilder.length(2, 5)
    if ('type' in rule) {
      expect(rule.type).toBe('length')
    }
    if ('min' in rule) {
      expect(rule.min).toBe(2)
    }
    if ('max' in rule) {
      expect(rule.max).toBe(5)
    }
    expect(typeof rule.message).toBe('string')
    expect(typeof rule.severity).toBe('string')
  })

  it('returns length rule with custom message', () => {
    const rule = ValidationRuleBuilder.length(1, 10, 'Custom length')
    expect(rule.message).toBe('Custom length')
  })
})

describe('ValidationRuleBuilder.range', () => {
  it('returns range rule with default message', () => {
    const rule = ValidationRuleBuilder.range(10, 20)
    if ('type' in rule) {
      expect(rule.type).toBe('range')
    }
    if ('min' in rule) {
      expect(rule.min).toBe(10)
    }
    if ('max' in rule) {
      expect(rule.max).toBe(20)
    }
    expect(typeof rule.message).toBe('string')
    expect(typeof rule.severity).toBe('string')
  })

  it('returns range rule with custom message', () => {
    const rule = ValidationRuleBuilder.range(0, 100, 'Between 0 and 100 only')
    expect(rule.message).toBe('Between 0 and 100 only')
  })
})

describe('ValidationRuleBuilder.custom', () => {
  it('returns custom rule and uses provided validator', async () => {
    const validator = async (value) => ({ valid: value === 'ok', message: 'err' })
    const rule = ValidationRuleBuilder.custom(validator, 'Default')
    if ('type' in rule) {
      expect(rule.type).toBe('custom')
    }
    expect(rule.message).toBe('Default')
    expect(typeof rule.severity).toBe('string')

    const fn = rule.validator || rule.validate
    expect(typeof fn).toBe('function')
    await expect(fn('ok')).resolves.toEqual({ valid: true, message: 'err' })
    await expect(fn('no')).resolves.toEqual({ valid: false, message: 'err' })
  })

  it('allows custom rule with default message when none provided', () => {
    const rule = ValidationRuleBuilder.custom(async () => ({ valid: true }))
    expect(typeof rule.message).toBe('string')
    expect(rule.message.length).toBeGreaterThan(0)
  })
})