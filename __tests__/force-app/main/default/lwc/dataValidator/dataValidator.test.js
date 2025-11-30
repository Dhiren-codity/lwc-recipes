import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import DataValidator from '../../../../../../force-app/main/default/lwc/dataValidator/dataValidator'

let element

beforeEach(() => {
  element = createElement('c-data-validator', { is: DataValidator })
  document.body.appendChild(element)
})

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
  jest.clearAllMocks()
})

describe('DataValidator.validateEmail', () => {
  it('returns required error when email is empty string', () => {
    const result = element.validateEmail('')
    expect(result).toEqual({ valid: false, error: 'Email is required' })
  })

  it('returns required error when email is null', () => {
    const result = element.validateEmail(null)
    expect(result).toEqual({ valid: false, error: 'Email is required' })
  })

  it('accepts valid email format', () => {
    const result = element.validateEmail('user@example.com')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects invalid email format', () => {
    const result = element.validateEmail('user@domain')
    expect(result).toEqual({ valid: false, error: 'Invalid email format' })
  })

  it('rejects email with trailing space', () => {
    const result = element.validateEmail('user@example.com ')
    expect(result).toEqual({ valid: false, error: 'Invalid email format' })
  })
})

describe('DataValidator.validatePhone', () => {
  it('returns required error when phone is empty', () => {
    const result = element.validatePhone('')
    expect(result).toEqual({ valid: false, error: 'Phone is required' })
  })

  it('accepts 10-digit phone with punctuation', () => {
    const result = element.validatePhone('(123) 456-7890')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('accepts 15-digit phone', () => {
    const result = element.validatePhone('123456789012345')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects too short phone', () => {
    const result = element.validatePhone('123')
    expect(result).toEqual({ valid: false, error: 'Phone must be 10-15 digits' })
  })

  it('rejects too long phone', () => {
    const result = element.validatePhone('1234567890123456')
    expect(result).toEqual({ valid: false, error: 'Phone must be 10-15 digits' })
  })
})

describe('DataValidator.validateDate', () => {
  it('returns required error when date is empty', () => {
    const result = element.validateDate('')
    expect(result).toEqual({ valid: false, error: 'Date is required' })
  })

  it('accepts valid ISO date string', () => {
    const result = element.validateDate('2020-01-01')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('accepts valid ISO datetime string', () => {
    const result = element.validateDate('2020-01-01T00:00:00Z')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects invalid date string', () => {
    const result = element.validateDate('not a date')
    expect(result).toEqual({ valid: false, error: 'Invalid date format' })
  })

  it('rejects impossible date', () => {
    const result = element.validateDate('2024-02-30')
    expect(result).toEqual({ valid: false, error: 'Invalid date format' })
  })
})

describe('DataValidator.validateRequired', () => {
  it('returns default field required error for empty string', () => {
    const result = element.validateRequired('')
    expect(result).toEqual({ valid: false, error: 'Field is required' })
  })

  it('returns custom field name in error', () => {
    const result = element.validateRequired('', 'Name')
    expect(result).toEqual({ valid: false, error: 'Name is required' })
  })

  it('treats number 0 as valid', () => {
    const result = element.validateRequired(0)
    expect(result).toEqual({ valid: true, error: null })
  })

  it('treats boolean false as valid', () => {
    const result = element.validateRequired(false)
    expect(result).toEqual({ valid: true, error: null })
  })

  it('treats empty array as valid per implementation', () => {
    const result = element.validateRequired([])
    expect(result).toEqual({ valid: true, error: null })
  })
})

describe('DataValidator.validateLength', () => {
  it('returns required error when value is empty string', () => {
    const result = element.validateLength('', 1, 5)
    expect(result).toEqual({ valid: false, error: 'Value is required' })
  })

  it('validates string length within range', () => {
    const result = element.validateLength('abc', 2, 4)
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects string shorter than min', () => {
    const result = element.validateLength('a', 2, 5)
    expect(result).toEqual({ valid: false, error: 'Length must be between 2 and 5' })
  })

  it('validates array length at bounds', () => {
    const result = element.validateLength([1, 2, 3], 2, 3)
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects non-length value by failing range check', () => {
    const result = element.validateLength(123, 1, 5)
    expect(result).toEqual({ valid: false, error: 'Length must be between 1 and 5' })
  })
})

describe('DataValidator.validateNumericRange', () => {
  it('accepts numeric string within inclusive range', () => {
    const result = element.validateNumericRange('5', 1, 10)
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects non-numeric value', () => {
    const result = element.validateNumericRange('abc', 1, 10)
    expect(result).toEqual({ valid: false, error: 'Value must be numeric' })
  })

  it('treats empty string as 0 and validates within range', () => {
    const result = element.validateNumericRange('', 0, 0)
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects number above max', () => {
    const result = element.validateNumericRange(11, 1, 10)
    expect(result).toEqual({ valid: false, error: 'Value must be between 1 and 10' })
  })

  it('rejects number below min', () => {
    const result = element.validateNumericRange(-1, 0, 10)
    expect(result).toEqual({ valid: false, error: 'Value must be between 0 and 10' })
  })
})

describe('DataValidator.validatePostalCode', () => {
  it('returns required error when postal code is empty', () => {
    const result = element.validatePostalCode('', 'US')
    expect(result).toEqual({ valid: false, error: 'Postal code is required' })
  })

  it('accepts valid US ZIP 5', () => {
    const result = element.validatePostalCode('12345', 'US')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('accepts valid US ZIP+4', () => {
    const result = element.validatePostalCode('12345-6789', 'US')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects invalid US ZIP', () => {
    const result = element.validatePostalCode('1234', 'US')
    expect(result).toEqual({ valid: false, error: 'Invalid US postal code format' })
  })

  it('accepts valid CA postal code with space, case-insensitive', () => {
    const result = element.validatePostalCode('k1a 0b1', 'CA')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects CA postal code with hyphen', () => {
    const result = element.validatePostalCode('K1A-0B1', 'CA')
    expect(result).toEqual({ valid: false, error: 'Invalid CA postal code format' })
  })

  it('accepts UK code matching simplified pattern', () => {
    const result = element.validatePostalCode('E1 6AN', 'UK')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('rejects UK format not matching simplified pattern', () => {
    const result = element.validatePostalCode('SW1A 1AA', 'UK')
    expect(result).toEqual({ valid: false, error: 'Invalid UK postal code format' })
  })

  it('defaults to US when country omitted', () => {
    const result = element.validatePostalCode('12345')
    expect(result).toEqual({ valid: true, error: null })
  })

  it('returns valid for unsupported country without validation', () => {
    const result = element.validatePostalCode('75001', 'FR')
    expect(result).toEqual({ valid: true, error: null })
  })
})