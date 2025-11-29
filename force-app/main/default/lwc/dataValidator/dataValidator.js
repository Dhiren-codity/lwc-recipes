import { LightningElement, api } from 'lwc';

export default class DataValidator extends LightningElement {
    @api
    validateEmail(email) {
        if (!email) {
            return { valid: false, error: 'Email is required' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const valid = emailRegex.test(email);

        return {
            valid,
            error: valid ? null : 'Invalid email format'
        };
    }

    @api
    validatePhone(phone) {
        if (!phone) {
            return { valid: false, error: 'Phone is required' };
        }

        const cleaned = phone.replace(/\D/g, '');
        const valid = cleaned.length >= 10 && cleaned.length <= 15;

        return {
            valid,
            error: valid ? null : 'Phone must be 10-15 digits'
        };
    }

    @api
    validateDate(dateString) {
        if (!dateString) {
            return { valid: false, error: 'Date is required' };
        }

        const date = new Date(dateString);
        const valid = !isNaN(date.getTime());

        return {
            valid,
            error: valid ? null : 'Invalid date format'
        };
    }

    @api
    validateRequired(value, fieldName = 'Field') {
        const valid = value !== null && value !== undefined && value !== '';

        return {
            valid,
            error: valid ? null : `${fieldName} is required`
        };
    }

    @api
    validateLength(value, min, max) {
        if (!value) {
            return { valid: false, error: 'Value is required' };
        }

        const length = value.length;
        const valid = length >= min && length <= max;

        return {
            valid,
            error: valid ? null : `Length must be between ${min} and ${max}`
        };
    }

    @api
    validateNumericRange(value, min, max) {
        const num = Number(value);

        if (isNaN(num)) {
            return { valid: false, error: 'Value must be numeric' };
        }

        const valid = num >= min && num <= max;

        return {
            valid,
            error: valid ? null : `Value must be between ${min} and ${max}`
        };
    }

    @api
    validatePostalCode(postalCode, country = 'US') {
        if (!postalCode) {
            return { valid: false, error: 'Postal code is required' };
        }

        let regex;
        switch (country) {
            case 'US':
                regex = /^\d{5}(-\d{4})?$/;
                break;
            case 'CA':
                regex = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;
                break;
            case 'UK':
                regex = /^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i;
                break;
            default:
                return { valid: true, error: null };
        }

        const valid = regex.test(postalCode);

        return {
            valid,
            error: valid ? null : `Invalid ${country} postal code format`
        };
    }
}
