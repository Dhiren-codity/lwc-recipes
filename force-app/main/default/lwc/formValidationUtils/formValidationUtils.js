export const ValidationRuleBuilder = {
    required(message = 'Field is required') {
        return {
            type: 'required',
            message,
            severity: 'error'
        };
    },

    pattern(pattern, message = 'Invalid format') {
        return {
            type: 'pattern',
            pattern,
            message,
            severity: 'error'
        };
    },

    length(min, max, message) {
        return {
            type: 'length',
            min,
            max,
            message: message || `Length must be between ${min} and ${max}`,
            severity: 'error'
        };
    },

    range(min, max, message) {
        return {
            type: 'range',
            min,
            max,
            message: message || `Value must be between ${min} and ${max}`,
            severity: 'error'
        };
    },

    custom(validator, message = 'Validation failed') {
        return {
            type: 'custom',
            validator,
            message,
            severity: 'error'
        };
    },

    conditional(condition, rule) {
        return {
            type: 'conditional',
            condition,
            rule,
            severity: 'error'
        };
    },

    crossField(relatedField, comparator, message) {
        return {
            type: 'cross-field',
            relatedField,
            comparator,
            message: message || 'Cross-field validation failed',
            severity: 'error'
        };
    },

    email(message = 'Invalid email format') {
        return this.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
    },

    phone(message = 'Invalid phone number') {
        return this.pattern(/^\+?[\d\s\-()]{10,}$/, message);
    },

    url(message = 'Invalid URL format') {
        return this.pattern(
            /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
            message
        );
    },

    zipCode(country = 'US', message) {
        const patterns = {
            US: /^\d{5}(-\d{4})?$/,
            CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
            UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/
        };
        return this.pattern(
            patterns[country] || patterns.US,
            message || `Invalid ${country} postal code`
        );
    },

    creditCard(message = 'Invalid credit card number') {
        return this.custom(async (value) => {
            if (!value) return { valid: true };
            const cleaned = value.replace(/\s/g, '');
            if (!/^\d{13,19}$/.test(cleaned)) {
                return { valid: false, message };
            }
            let sum = 0;
            let isEven = false;
            for (let i = cleaned.length - 1; i >= 0; i--) {
                let digit = parseInt(cleaned[i], 10);
                if (isEven) {
                    digit *= 2;
                    if (digit > 9) digit -= 9;
                }
                sum += digit;
                isEven = !isEven;
            }
            const valid = sum % 10 === 0;
            return { valid, message: valid ? '' : message };
        }, message);
    },

    greaterThan(fieldName, message) {
        return this.crossField(
            fieldName,
            (value, relatedValue) => {
                if (!value || !relatedValue) return true;
                return Number(value) > Number(relatedValue);
            },
            message || `Value must be greater than ${fieldName}`
        );
    },

    lessThan(fieldName, message) {
        return this.crossField(
            fieldName,
            (value, relatedValue) => {
                if (!value || !relatedValue) return true;
                return Number(value) < Number(relatedValue);
            },
            message || `Value must be less than ${fieldName}`
        );
    },

    matchField(fieldName, message) {
        return this.crossField(
            fieldName,
            (value, relatedValue) => value === relatedValue,
            message || `Value must match ${fieldName}`
        );
    },

    uniqueInArray(array, message = 'Value must be unique') {
        return this.custom(async (value) => {
            if (!value || !array) return { valid: true };
            const valid = !array.includes(value);
            return { valid, message: valid ? '' : message };
        }, message);
    },

    asyncRemoteValidation(
        endpoint,
        params = {},
        message = 'Validation failed'
    ) {
        return this.custom(async (value, formData) => {
            if (!value) return { valid: true };
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value, ...params, formData })
                });
                const result = await response.json();
                return {
                    valid: result.valid,
                    message: result.valid ? '' : result.message || message
                };
            } catch {
                return {
                    valid: false,
                    message: 'Validation service unavailable'
                };
            }
        }, message);
    }
};

export const FormValidationHelpers = {
    sanitizeInput(value, type = 'text') {
        if (!value) return value;

        switch (type) {
            case 'email':
                return value.toLowerCase().trim();
            case 'phone':
                return value.replace(/[^\d+\-()]/g, '');
            case 'number':
                return value.replace(/[^\d.-]/g, '');
            case 'alphanumeric':
                return value.replace(/[^a-zA-Z0-9]/g, '');
            case 'text':
            default:
                return value.trim();
        }
    },

    formatErrorMessage(fieldName, errors) {
        if (!errors || errors.length === 0) return '';
        const fieldLabel = fieldName.replace(/([A-Z])/g, ' $1').trim();
        return `${fieldLabel}: ${errors.join(', ')}`;
    },

    groupValidationResults(results) {
        const grouped = {
            errors: [],
            warnings: [],
            valid: []
        };

        Object.entries(results).forEach(([field, result]) => {
            if (result.errors.length > 0) {
                grouped.errors.push({ field, messages: result.errors });
            }
            if (result.warnings.length > 0) {
                grouped.warnings.push({ field, messages: result.warnings });
            }
            if (result.valid && result.warnings.length === 0) {
                grouped.valid.push(field);
            }
        });

        return grouped;
    },

    createDebouncer(wait) {
        let timeout;
        return {
            schedule(func) {
                clearTimeout(timeout);
                timeout = wait;
                func();
            },
            cancel() {
                clearTimeout(timeout);
            }
        };
    },

    calculatePasswordStrength(password) {
        if (!password) return { strength: 0, label: 'None', feedback: [] };

        let strength = 0;
        const feedback = [];

        if (password.length >= 8) {
            strength += 1;
        } else {
            feedback.push('Use at least 8 characters');
        }

        if (password.length >= 12) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/\d/.test(password)) {
            strength += 1;
        } else {
            feedback.push('Add numbers');
        }

        if (/[^a-zA-Z\d]/.test(password)) {
            strength += 1;
        } else {
            feedback.push('Add special characters');
        }

        if (/(.)\1{2,}/.test(password)) {
            strength -= 1;
            feedback.push('Avoid repeated characters');
        }

        const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
        const index = Math.max(0, Math.min(strength - 1, labels.length - 1));

        return {
            strength: Math.max(0, strength),
            label: labels[index] || 'Weak',
            feedback
        };
    }
};
