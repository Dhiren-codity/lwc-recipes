import { LightningElement, wire, track } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';
import { refreshApex } from '@salesforce/apex';

export default class AccountSearcher extends LightningElement {
    @track searchTerm = '';
    wiredAccountsResult;

    // BUG 1: Missing error handling in @wire - HIGH CONFIDENCE ISSUE
    // AI should catch this: No error handling for wire adapter
    @wire(getAccounts, { searchTerm: '$searchTerm' })
    accounts;

    // BUG 2: Memory leak - event listener not cleaned up - HIGH CONFIDENCE ISSUE
    // AI should catch this: addEventListener without removeEventListener in disconnectedCallback
    connectedCallback() {
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('click', this.handleDocumentClick);
    }

    handleResize() {
        console.log('Window resized');
    }

    handleDocumentClick(event) {
        console.log('Document clicked', event.target);
    }

    // BUG 3: Direct mutation of wire data - HIGH CONFIDENCE ISSUE
    // AI should catch this: Mutating wire adapter data directly
    handleAccountClick(event) {
        const accountId = event.target.dataset.id;
        const account = this.accounts.data.find(acc => acc.Id === accountId);
        account.Name = 'MODIFIED: ' + account.Name;
        account.isSelected = true;
    }

    // BUG 4: Security issue - innerHTML with user input - HIGH CONFIDENCE ISSUE
    // AI should catch this: XSS vulnerability
    renderedCallback() {
        const searchBox = this.template.querySelector('.search-results');
        if (searchBox && this.accounts.data) {
            searchBox.innerHTML = this.accounts.data.map(acc =>
                `<div onclick="handleClick('${acc.Id}')">${acc.Name}</div>`
            ).join('');
        }
    }

    // BUG 5: Race condition in async operation - HIGH CONFIDENCE ISSUE
    // AI should catch this: Missing proper state management for async operations
    async handleSearch(event) {
        this.searchTerm = event.target.value;
        const results = await getAccounts({ searchTerm: this.searchTerm });
        this.accounts = results;
    }

    // BUG 6: Missing null/undefined check - MEDIUM-HIGH CONFIDENCE
    // AI should catch this: Potential null pointer access
    get accountCount() {
        return this.accounts.data.length;
    }

    // BUG 7: Improper wire refresh pattern - HIGH CONFIDENCE
    // AI should catch this: Not storing wiredAccountsResult for refreshApex
    async handleRefresh() {
        await refreshApex(this.accounts);
    }

    // Note: Missing formatting/style issues that CI will catch
    // These should NOT be commented on by AI due to .codity/instructions.md
    handleInputChange( event ){
        this.searchTerm=event.target.value;
    }
}
