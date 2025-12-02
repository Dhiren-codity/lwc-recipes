# Custom Review Instructions for LWC Recipes

## Review Philosophy

- Only comment when you have HIGH CONFIDENCE (>65%) that an issue exists
- Be concise: one sentence per comment when possible
- Focus on actionable feedback, not observations
- This is a Salesforce Lightning Web Components (LWC) demo repository - prioritize component best practices

## Priority Areas

### Security & Safety

- XSS vulnerabilities in component templates
- Improper handling of user input in JavaScript controllers
- Missing @wire security checks
- Insecure API endpoint usage
- Missing CRUD/FLS checks in Apex controllers

### Correctness Issues

- Incorrect LWC lifecycle hooks usage
- Missing error handling in @wire adapters
- Race conditions in asynchronous operations
- Incorrect property/method decorators (@api, @track, @wire)
- Memory leaks (event listeners not removed)

### Lightning Web Components Best Practices

- Public API misuse (@api properties not properly validated)
- Improper component communication (events vs properties)
- Missing null checks for @wire data
- Inefficient DOM queries
- Incorrect use of slots and templates

### Apex Best Practices

- Missing SOQL injection prevention
- Bulk operations not following best practices (governor limits)
- Missing test coverage indicators
- Sharing violations (@AuraEnabled without proper security)

## Skip These (Low Value)

Do not comment on:

- **Prettier formatting** (CI checks this with `npm run prettier:verify`)
- **ESLint warnings** (CI checks this)
- **Jest test failures** (CI runs `npm run test:unit`)
- **Salesforce CLI warnings** (CI validates)
- Minor naming suggestions unless truly confusing
- Comments about adding more tests (this is a demo repo)

## CI Pipeline Context

**Important:** You review PRs immediately, before CI completes. Do not flag issues that CI will catch.

### What Our CI Checks

Our CI pipeline (`.github/workflows/ci.yml`) automatically runs:

**Formatting & Linting:**

- `npm run prettier:verify` - Prettier code formatting
- ESLint for JavaScript
- Salesforce Code Analyzer (PMD, ESLint-LWC rules)

**Testing:**

- `npm run test:unit` - Jest unit tests for LWC components
- `npm run test:unit:coverage` - Code coverage validation
- Apex unit tests (if applicable)

**Salesforce Validation:**

- Salesforce CLI validation
- Metadata deployment validation
- Package installation testing

**DO NOT comment on:**

- Formatting issues (Prettier handles this)
- ESLint warnings (CI catches these)
- Test failures (CI will report)
- Missing semicolons, indentation, etc.

## Response Format

Follow this structure for all comments:

1. **State the problem** (1 sentence)
2. **Why it matters** (1 sentence, if needed - skip if obvious)
3. **Suggested fix** (code snippet or specific action)

Example:

```
This @wire adapter lacks error handling for failed data fetch.
If the wire fails, the component will show stale/undefined data to users.
Add error handling: `@wire(getRecord, { recordId: '$recordId' }) wiredRecord({ error, data }) { if (error) { /* handle */ } }`
```

## When to Stay Silent

If you're uncertain whether something is an issue, don't comment.
Better to miss a borderline issue than to create noise with low-confidence suggestions.

---

## Project-Specific Context

### Repository: LWC Recipes

- **Type:** Salesforce Lightning Web Components demo/tutorial repository
- **Purpose:** Showcase LWC patterns and best practices
- **Framework:** Lightning Web Components (LWC), Apex, Salesforce Platform
- **Testing:** Jest for LWC unit tests

### LWC-Specific Patterns

**Good Patterns** (don't flag these):

- Using `@api` for public properties
- Using `@wire` for reactive data fetching
- Using lifecycle hooks (`connectedCallback`, `disconnectedCallback`)
- Using events for child-to-parent communication
- Using public properties for parent-to-child communication

**Bad Patterns** (flag these):

- Direct DOM manipulation without `querySelector`
- Missing error handling in `@wire` adapters
- Not removing event listeners in `disconnectedCallback`
- Using `@track` unnecessarily (LWC auto-tracks)
- Mutating @wire data directly

### Apex-Specific Patterns

**Good Patterns**:

- `@AuraEnabled(cacheable=true)` for read-only operations
- WITH SECURITY_ENFORCED in SOQL
- Bulkified operations (no SOQL in loops)

**Bad Patterns**:

- SOQL in loops
- Missing null checks after DML
- No try-catch around DML operations
- Hardcoded IDs

---

## Confidence Threshold

**Threshold:** 85% (higher than default)

Only report issues where you are **highly confident** it's a real problem.
When in doubt, skip the comment.

---

## Examples from This Codebase

### Example 1: Missing Wire Error Handling ❌

**Bad:**

```javascript
@wire(getRecord, { recordId: '$recordId' })
record;
```

**Good:**

```javascript
@wire(getRecord, { recordId: '$recordId' })
wiredRecord({ error, data }) {
    if (data) {
        this.record = data;
        this.error = undefined;
    } else if (error) {
        this.error = error;
        this.record = undefined;
    }
}
```

### Example 2: SOQL Injection ❌

**Bad:**

```apex
String query = 'SELECT Id FROM Account WHERE Name = \'' + accountName + '\'';
List<Account> accounts = Database.query(query);
```

**Good:**

```apex
List<Account> accounts = [SELECT Id FROM Account WHERE Name = :accountName];
```

### Example 3: Missing Event Cleanup ❌

**Bad:**

```javascript
connectedCallback() {
    window.addEventListener('resize', this.handleResize);
}
```

**Good:**

```javascript
connectedCallback() {
    window.addEventListener('resize', this.handleResize);
}

disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize);
}
```

---
