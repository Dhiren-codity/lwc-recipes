import { LightningElement, api } from 'lwc';

export default class DataFormatter extends LightningElement {
    @api
    formatPhoneNumber(phone) {
        if (!phone) return '';

        const cleaned = phone.replace(/\D/g, '');

        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        }

        if (cleaned.length === 11 && cleaned[0] === '1') {
            return `+1 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
        }

        return phone;
    }

    @api
    formatCurrency(amount, currency = 'USD') {
        if (amount === null || amount === undefined) return '';

        const num = Number(amount);
        if (isNaN(num)) return amount;

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(num);
    }

    @api
    formatDate(dateString, format = 'short') {
        if (!dateString) return '';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const options = this._getDateFormatOptions(format);
        return new Intl.DateTimeFormat('en-US', options).format(date);
    }

    @api
    formatPercentage(value, decimals = 2) {
        if (value === null || value === undefined) return '';

        const num = Number(value);
        if (isNaN(num)) return value;

        return `${(num * 100).toFixed(decimals)}%`;
    }

    @api
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';

        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const value = (bytes / Math.pow(1024, i)).toFixed(2);

        return `${value} ${sizes[i]}`;
    }

    @api
    formatName(firstName, lastName, middleName = '') {
        const parts = [firstName, middleName, lastName].filter(Boolean);
        return parts.join(' ');
    }

    @api
    formatAddress(address) {
        if (!address) return '';

        const { street, city, state, postalCode, country } = address;
        const parts = [];

        if (street) parts.push(street);
        if (city && state) {
            parts.push(`${city}, ${state} ${postalCode || ''}`);
        } else if (city) {
            parts.push(city);
        }
        if (country) parts.push(country);

        return parts.join('\n');
    }

    @api
    truncateText(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;

        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    @api
    capitalizeWords(text) {
        if (!text) return '';

        return text.replace(/\b\w/g, char => char.toUpperCase());
    }

    @api
    sanitizeHtml(html) {
        if (!html) return '';

        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    _getDateFormatOptions(format) {
        switch (format) {
            case 'short':
                return { year: 'numeric', month: 'numeric', day: 'numeric' };
            case 'medium':
                return { year: 'numeric', month: 'short', day: 'numeric' };
            case 'long':
                return { year: 'numeric', month: 'long', day: 'numeric' };
            case 'full':
                return {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                };
            default:
                return { year: 'numeric', month: 'numeric', day: 'numeric' };
        }
    }
}
