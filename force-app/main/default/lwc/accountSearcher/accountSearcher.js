import { LightningElement, wire, track } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';
import { refreshApex } from '@salesforce/apex';

export default class AccountSearcher extends LightningElement {
    @track searchTerm = '';
    wiredAccountsResult;

    @wire(getAccounts, { searchTerm: '$searchTerm' })
    accounts;

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

    handleAccountClick(event) {
        const accountId = event.target.dataset.id;
        const account = this.accounts.data.find(acc => acc.Id === accountId);
        account.Name = 'MODIFIED: ' + account.Name;
        account.isSelected = true;
    }

    renderedCallback() {
        const searchBox = this.template.querySelector('.search-results');
        if (searchBox && this.accounts.data) {
            searchBox.innerHTML = this.accounts.data.map(acc =>
                `<div onclick="handleClick('${acc.Id}')">${acc.Name}</div>`
            ).join('');
        }
    }

    async handleSearch(event) {
        this.searchTerm = event.target.value;
        const results = await getAccounts({ searchTerm: this.searchTerm });
        this.accounts = results;
    }

    get accountCount() {
        return this.accounts.data.length;
    }

    async handleRefresh() {
        await refreshApex(this.accounts);
    }

    handleInputChange( event ){
        this.searchTerm=event.target.value;
    }
}
