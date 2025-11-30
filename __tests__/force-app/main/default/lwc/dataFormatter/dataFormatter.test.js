import {
    describe,
    it,
    expect,
    jest,
    beforeEach,
    afterEach
} from '@jest/globals';
import { createElement } from 'lwc';
import DataFormatter from '../../../../../../force-app/main/default/lwc/dataFormatter/dataFormatter';

describe('DataFormatter LWC Utility Methods', () => {
    let el;

    function makeEl() {
        const element = createElement('c-data-formatter', {
            is: DataFormatter
        });
        document.body.appendChild(element);
        return element;
    }

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    describe('formatPhoneNumber', () => {
        it('returns empty string for falsy input', () => {
            el = makeEl();
            expect(el.formatPhoneNumber(undefined)).toBe('');
            expect(el.formatPhoneNumber(null)).toBe('');
            expect(el.formatPhoneNumber('')).toBe('');
        });

        it('formats 10-digit US numbers', () => {
            el = makeEl();
            expect(el.formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
            expect(el.formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
        });

        it('formats 11-digit numbers with leading 1 as +1 (US)', () => {
            el = makeEl();
            expect(el.formatPhoneNumber('+1 (234) 567-8901')).toBe(
                '+1 (234) 567-8901'
            );
            expect(el.formatPhoneNumber('12345678901')).toBe(
                '+1 (234) 567-8901'
            );
        });

        it('returns original string for 11 digits not starting with 1', () => {
            el = makeEl();
            expect(el.formatPhoneNumber('21234567890')).toBe('21234567890');
        });

        it('returns original string for non-digit inputs that do not match patterns', () => {
            el = makeEl();
            expect(el.formatPhoneNumber('foo')).toBe('foo');
            expect(el.formatPhoneNumber('12-34')).toBe('12-34');
        });
    });

    describe('formatCurrency', () => {
        it('returns empty string for null/undefined', () => {
            el = makeEl();
            expect(el.formatCurrency(null)).toBe('');
            expect(el.formatCurrency(undefined)).toBe('');
        });

        it('formats numeric amount with default USD', () => {
            el = makeEl();
            const amount = 1234.5;
            const expected = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount);
            expect(el.formatCurrency(amount)).toBe(expected);
        });

        it('formats numeric string amount', () => {
            el = makeEl();
            const amount = '1000';
            const expected = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(Number(amount));
            expect(el.formatCurrency(amount)).toBe(expected);
        });

        it('returns original value for non-numeric strings', () => {
            el = makeEl();
            expect(el.formatCurrency('abc')).toBe('abc');
        });

        it('formats with specified currency code', () => {
            el = makeEl();
            const amount = 1234.5;
            const expected = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount);
            expect(el.formatCurrency(amount, 'EUR')).toBe(expected);
        });
    });

    describe('formatDate', () => {
        function expectedFormatted(dateString, formatName) {
            const date = new Date(dateString);
            let opts;
            switch (formatName) {
                case 'short':
                    opts = {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                    };
                    break;
                case 'medium':
                    opts = { year: 'numeric', month: 'short', day: 'numeric' };
                    break;
                case 'long':
                    opts = { year: 'numeric', month: 'long', day: 'numeric' };
                    break;
                case 'full':
                    opts = {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    };
                    break;
                default:
                    opts = {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                    };
            }
            return new Intl.DateTimeFormat('en-US', opts).format(date);
        }

        it('returns empty string for falsy input', () => {
            el = makeEl();
            expect(el.formatDate('')).toBe('');
            expect(el.formatDate(null)).toBe('');
            expect(el.formatDate(undefined)).toBe('');
        });

        it('returns original string for invalid dates', () => {
            el = makeEl();
            expect(el.formatDate('not-a-date')).toBe('not-a-date');
        });

        it('formats date in short format by default', () => {
            el = makeEl();
            const ds = '2024-07-15T12:00:00Z';
            const expected = expectedFormatted(ds, 'short');
            expect(el.formatDate(ds)).toBe(expected);
        });

        it('formats date in medium, long and full formats', () => {
            el = makeEl();
            const ds = '2024-07-15T12:00:00Z';
            expect(el.formatDate(ds, 'medium')).toBe(
                expectedFormatted(ds, 'medium')
            );
            expect(el.formatDate(ds, 'long')).toBe(
                expectedFormatted(ds, 'long')
            );
            expect(el.formatDate(ds, 'full')).toBe(
                expectedFormatted(ds, 'full')
            );
        });

        it('falls back to short options for unknown format values', () => {
            el = makeEl();
            const ds = '2024-07-15T12:00:00Z';
            const expected = expectedFormatted(ds, 'short');
            expect(el.formatDate(ds, 'unknown-format')).toBe(expected);
        });
    });

    describe('formatPercentage', () => {
        it('returns empty string for null/undefined', () => {
            el = makeEl();
            expect(el.formatPercentage(null)).toBe('');
            expect(el.formatPercentage(undefined)).toBe('');
        });

        it('formats numeric and numeric string values with default decimals', () => {
            el = makeEl();
            expect(el.formatPercentage(0.256)).toBe('25.60%');
            expect(el.formatPercentage('0.5')).toBe('50.00%');
        });

        it('respects custom decimals and rounds appropriately', () => {
            el = makeEl();
            expect(el.formatPercentage(0.255, 0)).toBe('26%');
            expect(el.formatPercentage(0.1234, 3)).toBe('12.340%');
        });

        it('returns original value for non-numeric strings', () => {
            el = makeEl();
            expect(el.formatPercentage('abc')).toBe('abc');
        });
    });

    describe('formatFileSize', () => {
        it('returns 0 Bytes for falsy or zero values', () => {
            el = makeEl();
            expect(el.formatFileSize(0)).toBe('0 Bytes');
            expect(el.formatFileSize(undefined)).toBe('0 Bytes');
            expect(el.formatFileSize(null)).toBe('0 Bytes');
        });

        it('formats bytes correctly for Bytes unit', () => {
            el = makeEl();
            expect(el.formatFileSize(500)).toBe('500.00 Bytes');
        });

        it('formats bytes correctly for KB and rounds', () => {
            el = makeEl();
            expect(el.formatFileSize(1024)).toBe('1.00 KB');
            expect(el.formatFileSize(1536)).toBe('1.50 KB');
        });

        it('formats bytes correctly for MB', () => {
            el = makeEl();
            expect(el.formatFileSize(1048576)).toBe('1.00 MB');
        });
    });

    describe('formatName', () => {
        it('joins first and last name', () => {
            el = makeEl();
            expect(el.formatName('Jane', 'Doe')).toBe('Jane Doe');
        });

        it('includes middle name when provided', () => {
            el = makeEl();
            expect(el.formatName('Jane', 'Doe', 'Ann')).toBe('Jane Ann Doe');
        });

        it('filters out falsy name parts', () => {
            el = makeEl();
            expect(el.formatName(undefined, 'Doe')).toBe('Doe');
            expect(el.formatName('Jane', undefined, '')).toBe('Jane');
        });
    });

    describe('formatAddress', () => {
        it('returns empty string when address is falsy', () => {
            el = makeEl();
            expect(el.formatAddress(null)).toBe('');
            expect(el.formatAddress(undefined)).toBe('');
        });

        it('formats full address including postal code', () => {
            el = makeEl();
            const address = {
                street: '123 Main St',
                city: 'Springfield',
                state: 'IL',
                postalCode: '62704',
                country: 'USA'
            };
            const expected = '123 Main St\nSpringfield, IL 62704\nUSA';
            expect(el.formatAddress(address)).toBe(expected);
        });

        it('formats address without postal code but with trailing space before newline', () => {
            el = makeEl();
            const address = {
                street: '123 Main St',
                city: 'Springfield',
                state: 'IL',
                country: 'USA'
            };
            const expected = '123 Main St\nSpringfield, IL \nUSA';
            expect(el.formatAddress(address)).toBe(expected);
        });

        it('omits state when city is missing and places country on new line', () => {
            el = makeEl();
            const address1 = {
                street: '123 Main St',
                state: 'CA',
                country: 'USA'
            };
            expect(el.formatAddress(address1)).toBe('123 Main St\nUSA');

            const address2 = { city: 'Metropolis', country: 'USA' };
            expect(el.formatAddress(address2)).toBe('Metropolis\nUSA');
        });
    });

    describe('truncateText', () => {
        it('returns original text when null/undefined or within max length', () => {
            el = makeEl();
            expect(el.truncateText(undefined, 10)).toBeUndefined();
            expect(el.truncateText(null, 10)).toBeNull();
            expect(el.truncateText('Hello', 10)).toBe('Hello');
        });

        it('truncates and appends default suffix', () => {
            el = makeEl();
            expect(el.truncateText('HelloWorld', 5)).toBe('He...');
        });

        it('truncates with custom suffix', () => {
            el = makeEl();
            expect(el.truncateText('HelloWorld', 8, '--')).toBe('HelloW--');
        });
    });

    describe('capitalizeWords', () => {
        it('returns empty string for falsy input', () => {
            el = makeEl();
            expect(el.capitalizeWords(undefined)).toBe('');
            expect(el.capitalizeWords(null)).toBe('');
            expect(el.capitalizeWords('')).toBe('');
        });

        it('capitalizes first letter of each word', () => {
            el = makeEl();
            expect(el.capitalizeWords('hello world')).toBe('Hello World');
            expect(el.capitalizeWords('multiple words here')).toBe(
                'Multiple Words Here'
            );
        });

        it('capitalizes letters after apostrophes due to word boundary handling', () => {
            el = makeEl();
            expect(el.capitalizeWords("john's book")).toBe("John'S Book");
        });
    });

    describe('sanitizeText', () => {
        it('returns empty string for falsy input', () => {
            el = makeEl();
            expect(el.sanitizeText(undefined)).toBe('');
            expect(el.sanitizeText(null)).toBe('');
            expect(el.sanitizeText('')).toBe('');
        });

        it('escapes special HTML characters including slash', () => {
            el = makeEl();
            const input = '<div class="x">It\'s / ok</div>';
            const expected =
                '&lt;div class=&quot;x&quot;&gt;It&#x27;s &#x2F; ok&lt;&#x2F;div&gt;';
            expect(el.sanitizeText(input)).toBe(expected);
        });
    });
});
