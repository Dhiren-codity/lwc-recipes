import { describe, it, expect, jest, afterEach } from '@jest/globals'
import { createElement } from 'lwc'
import DataFormatter from '../../../../../../force-app/main/default/lwc/dataFormatter/dataFormatter'

function createComponent() {
  const element = createElement('c-data-formatter', { is: DataFormatter })
  document.body.appendChild(element)
  return element
}

afterEach(() => {
  jest.clearAllMocks()
  document.body.innerHTML = ''
})

describe('DataFormatter.formatPhoneNumber', () => {
  it('returns empty string for falsy input', () => {
    const cmp = createComponent()
    expect(cmp.formatPhoneNumber('')).toBe('')
    expect(cmp.formatPhoneNumber(undefined)).toBe('')
    expect(cmp.formatPhoneNumber(null)).toBe('')
  })

  it('formats 10-digit numbers as (XXX) XXX-XXXX', () => {
    const cmp = createComponent()
    expect(cmp.formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890')
    expect(cmp.formatPhoneNumber('(987)654 3210')).toBe('(987) 654-3210')
  })

  it('formats 11-digit numbers starting with 1 as +1 (XXX) XXX-XXXX', () => {
    const cmp = createComponent()
    expect(cmp.formatPhoneNumber('1 (234) 567-8901')).toBe('+1 (234) 567-8901')
    expect(cmp.formatPhoneNumber('1-800-123-4567')).toBe('+1 (800) 123-4567')
  })

  it('returns original phone when not 10 digits or 11 with leading 1', () => {
    const cmp = createComponent()
    expect(cmp.formatPhoneNumber('123456789')).toBe('123456789')
    expect(cmp.formatPhoneNumber('abc-def')).toBe('abc-def')
  })
})

describe('DataFormatter.formatCurrency', () => {
  it('returns empty string for null/undefined', () => {
    const cmp = createComponent()
    expect(cmp.formatCurrency(null)).toBe('')
    expect(cmp.formatCurrency(undefined)).toBe('')
  })

  it('returns original value when amount is NaN', () => {
    const cmp = createComponent()
    expect(cmp.formatCurrency('abc')).toBe('abc')
  })

  it('formats number as USD by default', () => {
    const cmp = createComponent()
    const amount = 1234.56
    const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    expect(cmp.formatCurrency(amount)).toBe(expected)
  })

  it('formats number with specified currency', () => {
    const cmp = createComponent()
    const amount = 99.99
    const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
    expect(cmp.formatCurrency(amount, 'EUR')).toBe(expected)
  })
})

describe('DataFormatter.formatDate', () => {
  it('returns empty string for falsy', () => {
    const cmp = createComponent()
    expect(cmp.formatDate('')).toBe('')
    expect(cmp.formatDate(undefined)).toBe('')
    expect(cmp.formatDate(null)).toBe('')
  })

  it('returns original string for invalid date', () => {
    const cmp = createComponent()
    expect(cmp.formatDate('not a date')).toBe('not a date')
  })

  it('formats using short option by default and when unknown format is provided', () => {
    const cmp = createComponent()
    const str = '2020-05-15T12:00:00Z'
    const date = new Date(str)
    const expectedShort = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date)
    expect(cmp.formatDate(str)).toBe(expectedShort)
    expect(cmp.formatDate(str, 'weird')).toBe(expectedShort)
  })

  it('formats using medium, long, and full options', () => {
    const cmp = createComponent()
    const str = '2023-01-02T12:00:00Z'
    const date = new Date(str)

    const expectedMedium = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
    const expectedLong = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
    const expectedFull = new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date)

    expect(cmp.formatDate(str, 'medium')).toBe(expectedMedium)
    expect(cmp.formatDate(str, 'long')).toBe(expectedLong)
    expect(cmp.formatDate(str, 'full')).toBe(expectedFull)
  })
})

describe('DataFormatter.formatPercentage', () => {
  it('returns empty string for null/undefined', () => {
    const cmp = createComponent()
    expect(cmp.formatPercentage(null)).toBe('')
    expect(cmp.formatPercentage(undefined)).toBe('')
  })

  it('returns original value when value is NaN', () => {
    const cmp = createComponent()
    expect(cmp.formatPercentage('abc')).toBe('abc')
  })

  it('formats percentage with default decimals', () => {
    const cmp = createComponent()
    expect(cmp.formatPercentage(0.123)).toBe('12.30%')
    expect(cmp.formatPercentage('0.5')).toBe('50.00%')
    expect(cmp.formatPercentage(0)).toBe('0.00%')
  })

  it('formats percentage with specified decimals', () => {
    const cmp = createComponent()
    expect(cmp.formatPercentage(0.1234, 0)).toBe('12%')
    expect(cmp.formatPercentage(0.129, 1)).toBe('12.9%')
  })
})

describe('DataFormatter.formatFileSize', () => {
  it('returns 0 Bytes for falsy or zero', () => {
    const cmp = createComponent()
    expect(cmp.formatFileSize(0)).toBe('0 Bytes')
    expect(cmp.formatFileSize(undefined)).toBe('0 Bytes')
    expect(cmp.formatFileSize(null)).toBe('0 Bytes')
  })

  it('formats sizes for bytes and KB', () => {
    const cmp = createComponent()
    expect(cmp.formatFileSize(1)).toBe('1.00 Bytes')
    expect(cmp.formatFileSize(1024)).toBe('1.00 KB')
    expect(cmp.formatFileSize(1536)).toBe('1.50 KB')
  })

  it('formats MB and larger', () => {
    const cmp = createComponent()
    expect(cmp.formatFileSize(1024 * 1024)).toBe('1.00 MB')
    expect(cmp.formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB')
  })
})

describe('DataFormatter.formatName', () => {
  it('joins first, middle, and last names', () => {
    const cmp = createComponent()
    expect(cmp.formatName('John', 'Doe', 'Q')).toBe('John Q Doe')
  })

  it('omits missing parts and trims spaces', () => {
    const cmp = createComponent()
    expect(cmp.formatName('John', 'Doe')).toBe('John Doe')
    expect(cmp.formatName('', 'Doe')).toBe('Doe')
    expect(cmp.formatName('John', '')).toBe('John')
    expect(cmp.formatName('', '')).toBe('')
  })
})

describe('DataFormatter.formatAddress', () => {
  it('returns empty string for falsy', () => {
    const cmp = createComponent()
    expect(cmp.formatAddress(null)).toBe('')
    expect(cmp.formatAddress(undefined)).toBe('')
  })

  it('formats full address with street, city, state, postalCode, and country', () => {
    const cmp = createComponent()
    const address = {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '90210',
      country: 'USA'
    }
    const expected = '123 Main St\nAnytown, CA 90210\nUSA'
    expect(cmp.formatAddress(address)).toBe(expected)
  })

  it('formats address with only street and city', () => {
    const cmp = createComponent()
    const address = {
      street: '456 Elm St',
      city: 'Somewhere'
    }
    const expected = '456 Elm St\nSomewhere'
    expect(cmp.formatAddress(address)).toBe(expected)
  })

  it('formats address with city and state but no postal code (includes trailing space)', () => {
    const cmp = createComponent()
    const address = {
      city: 'Metropolis',
      state: 'NY'
    }
    const expected = 'Metropolis, NY '
    expect(cmp.formatAddress(address)).toBe(expected)
  })

  it('formats address with street and country but no city/state', () => {
    const cmp = createComponent()
    const address = {
      street: '789 Oak Ave',
      country: 'Canada'
    }
    const expected = '789 Oak Ave\nCanada'
    expect(cmp.formatAddress(address)).toBe(expected)
  })

  it('returns empty string for empty address object', () => {
    const cmp = createComponent()
    expect(cmp.formatAddress({})).toBe('')
  })
})

describe('DataFormatter.truncateText', () => {
  it('returns original text when shorter or equal to max length', () => {
    const cmp = createComponent()
    expect(cmp.truncateText('short', 10)).toBe('short')
    expect(cmp.truncateText('exactly10', 9 + 1)).toBe('exactly10')
  })

  it('truncates text and appends default suffix', () => {
    const cmp = createComponent()
    expect(cmp.truncateText('Hello World', 8)).toBe('Hello...')
  })

  it('truncates text with custom suffix', () => {
    const cmp = createComponent()
    expect(cmp.truncateText('Hello World', 8, '***')).toBe('Hello***')
  })
})

describe('DataFormatter.capitalizeWords', () => {
  it('returns empty string for falsy', () => {
    const cmp = createComponent()
    expect(cmp.capitalizeWords('')).toBe('')
    expect(cmp.capitalizeWords(undefined)).toBe('')
  })

  it('capitalizes first letter of each word, preserving other letters', () => {
    const cmp = createComponent()
    expect(cmp.capitalizeWords('john doe')).toBe('John Doe')
    expect(cmp.capitalizeWords('hello WORLD')).toBe('Hello WORLD')
    expect(cmp.capitalizeWords('multi-word-name')).toBe('Multi-Word-Name')
  })
})

describe('DataFormatter.sanitizeText', () => {
  it('returns empty string for falsy', () => {
    const cmp = createComponent()
    expect(cmp.sanitizeText('')).toBe('')
    expect(cmp.sanitizeText(undefined)).toBe('')
  })

  it('replaces special characters with HTML entities', () => {
    const cmp = createComponent()
    const input = '<script>alert("x")</script>'
    const expected = '&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;'
    expect(cmp.sanitizeText(input)).toBe(expected)
  })

  it('leaves safe text unchanged', () => {
    const cmp = createComponent()
    const input = 'safe text 123'
    expect(cmp.sanitizeText(input)).toBe('safe text 123')
  })

  it('sanitizes single and double quotes and slashes', () => {
    const cmp = createComponent()
    const input = `He said: "It's 50/50."`
    const expected = 'He said: &quot;It&#x27;s 50&#x2F;50.&quot;'
    expect(cmp.sanitizeText(input)).toBe(expected)
  })
})

describe('DataFormatter._getDateFormatOptions', () => {
  it('returns correct options for short, medium, long, and full', () => {
    const cmp = createComponent()
    expect(cmp._getDateFormatOptions('short')).toEqual({ year: 'numeric', month: 'numeric', day: 'numeric' })
    expect(cmp._getDateFormatOptions('medium')).toEqual({ year: 'numeric', month: 'short', day: 'numeric' })
    expect(cmp._getDateFormatOptions('long')).toEqual({ year: 'numeric', month: 'long', day: 'numeric' })
    expect(cmp._getDateFormatOptions('full')).toEqual({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  })

  it('defaults to short options for unknown format', () => {
    const cmp = createComponent()
    expect(cmp._getDateFormatOptions('unknown')).toEqual({ year: 'numeric', month: 'numeric', day: 'numeric' })
  })
})