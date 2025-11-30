import { LightningElement, api, track } from 'lwc';

export default class AdvancedFormValidator extends LightningElement {
    @track validationResults = {};
    @track validationRules = new Map();
    @track fieldDependencies = new Map();
    @track asyncValidators = new Map();

    @api
    registerField(fieldName, rules = [], dependencies = []) {
        this.validationRules.set(fieldName, rules);
        if (dependencies.length > 0) {
            this.fieldDependencies.set(fieldName, dependencies);
        }
        this.validationResults[fieldName] = {
            valid: true,
            errors: [],
            warnings: []
        };
    }

    @api
    registerAsyncValidator(fieldName, validatorFn, debounceMs = 300) {
        if (!this.asyncValidators.has(fieldName)) {
            this.asyncValidators.set(fieldName, []);
        }
        this.asyncValidators.get(fieldName).push({
            validator: validatorFn,
            debounce: debounceMs,
            timer: null
        });
    }

    @api
    async validateField(fieldName, value, formData = {}) {
        const rules = this.validationRules.get(fieldName) || [];
        const errors = [];
        const warnings = [];

        const rulePromises = rules.map((rule) =>
            this._executeRule(rule, value, fieldName, formData)
        );
        const ruleResults = await Promise.all(rulePromises);

        ruleResults.forEach((result) => {
            if (!result.valid) {
                if (result.severity === 'warning') {
                    warnings.push(result.message);
                } else {
                    errors.push(result.message);
                }
            }
        });

        const asyncValidators = this.asyncValidators.get(fieldName) || [];
        const asyncPromises = asyncValidators.map((asyncVal) => {
            if (asyncVal.timer) {
                clearTimeout(asyncVal.timer);
            }
            return asyncVal.validator(value, formData);
        });

        const asyncResults = await Promise.all(asyncPromises);
        asyncResults.forEach((asyncResult) => {
            if (!asyncResult.valid) {
                if (asyncResult.severity === 'warning') {
                    warnings.push(asyncResult.message);
                } else {
                    errors.push(asyncResult.message);
                }
            }
        });

        this.validationResults[fieldName] = {
            valid: errors.length === 0,
            errors,
            warnings
        };

        const dependencies = this.fieldDependencies.get(fieldName) || [];
        const depPromises = dependencies
            .filter((depField) => formData[depField] !== undefined)
            .map((depField) =>
                this.validateField(depField, formData[depField], formData)
            );
        await Promise.all(depPromises);

        return this.validationResults[fieldName];
    }

    @api
    async validateForm(formData) {
        const results = {};
        const fieldNames = Array.from(this.validationRules.keys());

        const validationPromises = fieldNames.map(async (fieldName) => {
            const value = formData[fieldName];
            const result = await this.validateField(fieldName, value, formData);
            return { fieldName, result };
        });

        const validatedFields = await Promise.all(validationPromises);
        validatedFields.forEach(({ fieldName, result }) => {
            results[fieldName] = result;
        });

        this.validationResults = results;
        return {
            valid: Object.values(results).every((r) => r.valid),
            results,
            errorCount: Object.values(results).reduce(
                (sum, r) => sum + r.errors.length,
                0
            ),
            warningCount: Object.values(results).reduce(
                (sum, r) => sum + r.warnings.length,
                0
            )
        };
    }

    async _executeRule(rule, value, fieldName, formData) {
        if (typeof rule === 'function') {
            return rule(value, formData);
        }

        switch (rule.type) {
            case 'required':
                return this._validateRequired(value, rule);
            case 'pattern':
                return this._validatePattern(value, rule);
            case 'length':
                return this._validateLength(value, rule);
            case 'range':
                return this._validateRange(value, rule);
            case 'custom':
                return rule.validator(value, formData);
            case 'conditional':
                return this._validateConditional(
                    value,
                    fieldName,
                    formData,
                    rule
                );
            case 'cross-field':
                return this._validateCrossField(
                    value,
                    fieldName,
                    formData,
                    rule
                );
            default:
                return { valid: true };
        }
    }

    _validateRequired(value, rule) {
        const valid = value !== null && value !== undefined && value !== '';
        return {
            valid,
            message: valid ? '' : rule.message || 'Field is required',
            severity: rule.severity || 'error'
        };
    }

    _validatePattern(value, rule) {
        if (!value) return { valid: true };
        const regex = new RegExp(rule.pattern);
        const valid = regex.test(value);
        return {
            valid,
            message: valid ? '' : rule.message || 'Invalid format',
            severity: rule.severity || 'error'
        };
    }

    _validateLength(value, rule) {
        if (!value) return { valid: true };
        const length = value.length;
        const valid =
            (!rule.min || length >= rule.min) &&
            (!rule.max || length <= rule.max);
        return {
            valid,
            message: valid
                ? ''
                : rule.message ||
                  `Length must be between ${rule.min} and ${rule.max}`,
            severity: rule.severity || 'error'
        };
    }

    _validateRange(value, rule) {
        if (value === null || value === undefined || value === '')
            return { valid: true };
        const num = Number(value);
        if (isNaN(num)) {
            return {
                valid: false,
                message: 'Value must be numeric',
                severity: rule.severity || 'error'
            };
        }
        const valid =
            (!rule.min || num >= rule.min) && (!rule.max || num <= rule.max);
        return {
            valid,
            message: valid
                ? ''
                : rule.message ||
                  `Value must be between ${rule.min} and ${rule.max}`,
            severity: rule.severity || 'error'
        };
    }

    async _validateConditional(value, fieldName, formData, rule) {
        const condition = await rule.condition(formData);
        if (!condition) {
            return { valid: true };
        }
        return this._executeRule(rule.rule, value, fieldName, formData);
    }

    _validateCrossField(value, fieldName, formData, rule) {
        const relatedValue = formData[rule.relatedField];
        const valid = rule.comparator(value, relatedValue, formData);
        return {
            valid,
            message: valid
                ? ''
                : rule.message || `Cross-field validation failed`,
            severity: rule.severity || 'error'
        };
    }

    @api
    getFieldValidation(fieldName) {
        return (
            this.validationResults[fieldName] || {
                valid: true,
                errors: [],
                warnings: []
            }
        );
    }

    @api
    hasErrors() {
        return Object.values(this.validationResults).some((r) => !r.valid);
    }

    @api
    clearValidation(fieldName) {
        if (fieldName) {
            this.validationResults[fieldName] = {
                valid: true,
                errors: [],
                warnings: []
            };
        } else {
            this.validationResults = {};
        }
    }

    @api
    getErrorSummary() {
        const summary = {};
        Object.entries(this.validationResults).forEach(([field, result]) => {
            if (!result.valid || result.warnings.length > 0) {
                summary[field] = {
                    errors: result.errors,
                    warnings: result.warnings
                };
            }
        });
        return summary;
    }
}
