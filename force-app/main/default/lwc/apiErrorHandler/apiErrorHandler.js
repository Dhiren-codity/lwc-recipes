import { LightningElement, api } from 'lwc';

export default class ApiErrorHandler extends LightningElement {
    @api
    parseError(error) {
        if (!error) {
            return {
                message: 'An unknown error occurred',
                type: 'unknown',
                details: null
            };
        }

        if (error.body) {
            if (Array.isArray(error.body)) {
                return this._parseErrorArray(error.body);
            }
            if (error.body.message) {
                return this._parseErrorMessage(error.body);
            }
            if (error.body.fieldErrors) {
                return this._parseFieldErrors(error.body.fieldErrors);
            }
            if (error.body.pageErrors) {
                return this._parsePageErrors(error.body.pageErrors);
            }
        }

        if (error.message) {
            return {
                message: error.message,
                type: 'standard',
                details: null
            };
        }

        if (typeof error === 'string') {
            return {
                message: error,
                type: 'string',
                details: null
            };
        }

        return {
            message: 'An unexpected error occurred',
            type: 'unexpected',
            details: JSON.stringify(error)
        };
    }

    _parseErrorArray(errors) {
        const messages = errors.map((err) => err.message || 'Unknown error');
        return {
            message: messages.join(', '),
            type: 'multiple',
            details: errors
        };
    }

    _parseErrorMessage(body) {
        return {
            message: body.message,
            type: body.errorCode || 'standard',
            details: body
        };
    }

    _parseFieldErrors(fieldErrors) {
        const messages = [];
        Object.keys(fieldErrors).forEach((field) => {
            fieldErrors[field].forEach((error) => {
                messages.push(`${field}: ${error.message}`);
            });
        });
        return {
            message: messages.join(', '),
            type: 'field_validation',
            details: fieldErrors
        };
    }

    _parsePageErrors(pageErrors) {
        const messages = pageErrors.map((err) => err.message);
        return {
            message: messages.join(', '),
            type: 'page_validation',
            details: pageErrors
        };
    }

    @api
    handleError(error, fallbackMessage = 'An error occurred') {
        const parsed = this.parseError(error);
        return parsed.message || fallbackMessage;
    }

    @api
    getErrorDetails(error) {
        const parsed = this.parseError(error);
        return {
            userMessage: parsed.message,
            errorType: parsed.type,
            technicalDetails: parsed.details,
            timestamp: new Date().toISOString()
        };
    }

    @api
    isRetryableError(error) {
        const parsed = this.parseError(error);
        const retryableTypes = [
            'NETWORK_ERROR',
            'TIMEOUT',
            'SERVICE_UNAVAILABLE',
            'TOO_MANY_REQUESTS'
        ];
        return retryableTypes.includes(parsed.type);
    }

    @api
    logError(error, context = {}) {
        const errorDetails = this.getErrorDetails(error);
        const logEntry = {
            ...errorDetails,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.error('API Error:', logEntry);
        return logEntry;
    }
}
