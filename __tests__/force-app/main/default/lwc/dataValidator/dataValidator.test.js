import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { createElement } from 'lwc';
import DataValidator from '../../../../../../force-app/main/default/lwc/dataValidator/dataValidator';

function createInstance() {
    const el = createElement('c-data-validator', { is: DataValidator });
    document.body.appendChild(el);
    return el;
}

afterEach(() => {
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
});

describe('DataValidator.validateEmail', () => {
    it('returns required error when email is empty string', () => {
        const cmp = createInstance();
        const res = cmp.validateEmail('');
        expect(res).toEqual({ valid: false, error: 'Email is required' });
    });

    it('returns required error when email is null', () => {
        const cmp = createInstance();
        const res = cmp.validateEmail(null);
        expect(res).toEqual({ valid: false, error: 'Email is required' });
    });

    it('returns valid for a standard email format', () => {
        const cmp = createInstance();
        const res = cmp.validateEmail('user@example.com');
        expect(res).toEqual({ valid: true, error: null });
    });

    it('returns invalid for an incorrect email format', () => {
        const cmp = createInstance();
        const res = cmp.validateEmail('user@domain');
        expect(res).toEqual({ valid: false, error: 'Invalid email format' });
    });
});

describe('DataValidator.validatePhone', () => {
    it('returns required error when phone is missing', () => {
        const cmp = createInstance();
        const res = cmp.validatePhone('');
        expect(res).toEqual({ valid: false, error: 'Phone is required' });
    });

    it('accepts a 10-digit phone number', () => {
        const cmp = createInstance();
        const res = cmp.validatePhone('1234567890');
        expect(res).toEqual({ valid: true, error: null });
    });

    it('accepts phone numbers with separators', () => {
        const cmp = createInstance();
        const res = cmp.validatePhone('(123) 456-7890');
        expect(res).toEqual({ valid: true, error: null });
    });

    it('accepts exactly 15 digits', () => {
        const cmp = createInstance();
        const res = cmp.validatePhone('123456789012345');
        expect(res).toEqual({ valid: true, error: null });
    });

    it('rejects 9 digits as too short', () => {
        const cmp = createInstance();
        const res = cmp.validatePhone('123456789');
        expect(res).toEqual({
            valid: false,
            error: 'Phone must be 10-15 digits'
        });
    });

    it('rejects 16 digits as too long', () => {
        const cmp = createInstance();
        const res = cmp.validatePhone('1234567890123456');
        expect(res).toEqual({
            valid: false,
            error: 'Phone must be 10-15 digits'
        });
    });

    it('rejects non-numeric content', () => {
        const cmp = createInstance();
        const res = cmp.validatePhone('abc');
        expect(res).toEqual({
            valid: false,
            error: 'Phone must be 10-15 digits'
        });
    });
});

describe('DataValidator.validateDate', () => {
    it('returns required error when date is missing', () => {
        const cmp = createInstance();
        const res = cmp.validateDate('');
        expect(res).toEqual({ valid: false, error: 'Date is required' });
    });

    it('accepts a valid ISO date string', () => {
        const cmp = createInstance();
        const res = cmp.validateDate('2024-01-01');
        expect(res).toEqual({ valid: true, error: null });
    });

    it('rejects an invalid date string', () => {
        const cmp = createInstance();
        const res = cmp.validateDate('not-a-date');
        expect(res).toEqual({ valid: false, error: 'Invalid date format' });
    });

    it('accepts a Date object representing a valid date', () => {
        const cmp = createInstance();
        const res = cmp.validateDate(new Date('2024-06-01T00:00:00Z'));
        expect(res).toEqual({ valid: true, error: null });
    });
});

describe('DataValidator.validateRequired', () => {
    it('rejects null/undefined/empty string with default message', () => {
        const cmp = createInstance();
        expect(cmp.validateRequired(null)).toEqual({
            valid: false,
            error: 'Field is required'
        });
        expect(cmp.validateRequired(undefined)).toEqual({
            valid: false,
            error: 'Field is required'
        });
        expect(cmp.validateRequired('')).toEqual({
            valid: false,
            error: 'Field is required'
        });
    });

    it('uses custom field name in error message', () => {
        const cmp = createInstance();
        const res = cmp.validateRequired('', 'Name');
        expect(res).toEqual({ valid: false, error: 'Name is required' });
    });

    it('treats 0 and false as valid values', () => {
        const cmp = createInstance();
        expect(cmp.validateRequired(0)).toEqual({ valid: true, error: null });
        expect(cmp.validateRequired(false)).toEqual({
            valid: true,
            error: null
        });
    });
});

describe('DataValidator.validateLength', () => {
    it('requires value when empty string is provided', () => {
        const cmp = createInstance();
        const res = cmp.validateLength('', 1, 5);
        expect(res).toEqual({ valid: false, error: 'Value is required' });
    });

    it('accepts string within min and max length', () => {
        const cmp = createInstance();
        const res = cmp.validateLength('abc', 2, 5);
        expect(res).toEqual({ valid: true, error: null });
    });

    it('rejects string shorter than min', () => {
        const cmp = createInstance();
        const res = cmp.validateLength('a', 2, 5);
        expect(res).toEqual({
            valid: false,
            error: 'Length must be between 2 and 5'
        });
    });

    it('rejects string longer than max', () => {
        const cmp = createInstance();
        const res = cmp.validateLength('abcdef', 2, 5);
        expect(res).toEqual({
            valid: false,
            error: 'Length must be between 2 and 5'
        });
    });

    it('handles arrays with length correctly', () => {
        const cmp = createInstance();
        expect(cmp.validateLength([1, 2, 3], 2, 3)).toEqual({
            valid: true,
            error: null
        });
        expect(cmp.validateLength([], 1, 3)).toEqual({
            valid: false,
            error: 'Length must be between 1 and 3'
        });
    });

    it('returns length error for non-length values like numbers', () => {
        const cmp = createInstance();
        const res = cmp.validateLength(123, 1, 4);
        expect(res).toEqual({
            valid: false,
            error: 'Length must be between 1 and 4'
        });
    });
});

describe('DataValidator.validateNumericRange', () => {
    it('rejects non-numeric values', () => {
        const cmp = createInstance();
        const res = cmp.validateNumericRange('abc', 1, 10);
        expect(res).toEqual({ valid: false, error: 'Value must be numeric' });
    });

    it('accepts numeric strings within range inclusive', () => {
        const cmp = createInstance();
        const res = cmp.validateNumericRange('5', 1, 10);
        expect(res).toEqual({ valid: true, error: null });
    });

    it('accepts lower and upper bounds inclusively', () => {
        const cmp = createInstance();
        expect(cmp.validateNumericRange(1, 1, 10)).toEqual({
            valid: true,
            error: null
        });
        expect(cmp.validateNumericRange(10, 1, 10)).toEqual({
            valid: true,
            error: null
        });
    });

    it('rejects below min', () => {
        const cmp = createInstance();
        const res = cmp.validateNumericRange(0, 1, 10);
        expect(res).toEqual({
            valid: false,
            error: 'Value must be between 1 and 10'
        });
    });

    it('rejects above max', () => {
        const cmp = createInstance();
        const res = cmp.validateNumericRange(11, 1, 10);
        expect(res).toEqual({
            valid: false,
            error: 'Value must be between 1 and 10'
        });
    });
});

describe('DataValidator.validatePostalCode', () => {
    it('returns required error when postal code is missing', () => {
        const cmp = createInstance();
        const res = cmp.validatePostalCode('');
        expect(res).toEqual({ valid: false, error: 'Postal code is required' });
    });

    it('validates US ZIP codes', () => {
        const cmp = createInstance();
        expect(cmp.validatePostalCode('12345', 'US')).toEqual({
            valid: true,
            error: null
        });
        expect(cmp.validatePostalCode('12345-6789', 'US')).toEqual({
            valid: true,
            error: null
        });
        expect(cmp.validatePostalCode('1234', 'US')).toEqual({
            valid: false,
            error: 'Invalid US postal code format'
        });
    });

    it('validates Canadian postal codes (case-insensitive and optional space)', () => {
        const cmp = createInstance();
        expect(cmp.validatePostalCode('K1A 0B1', 'CA')).toEqual({
            valid: true,
            error: null
        });
        expect(cmp.validatePostalCode('k1a0b1', 'CA')).toEqual({
            valid: true,
            error: null
        });
        expect(cmp.validatePostalCode('123 456', 'CA')).toEqual({
            valid: false,
            error: 'Invalid CA postal code format'
        });
    });

    it('validates UK postal codes per implemented pattern', () => {
        const cmp = createInstance();
        expect(cmp.validatePostalCode('EC1 1BB', 'UK')).toEqual({
            valid: true,
            error: null
        });
        expect(cmp.validatePostalCode('SW1A 1AA', 'UK')).toEqual({
            valid: false,
            error: 'Invalid UK postal code format'
        });
    });

    it('returns valid for unsupported countries (default case)', () => {
        const cmp = createInstance();
        const res = cmp.validatePostalCode('75008', 'FR');
        expect(res).toEqual({ valid: true, error: null });
    });

    it('treats lowercase country code "uk" as default (not UK validation)', () => {
        const cmp = createInstance();
        const res = cmp.validatePostalCode('SW1A 1AA', 'uk');
        expect(res).toEqual({ valid: true, error: null });
    });
});
