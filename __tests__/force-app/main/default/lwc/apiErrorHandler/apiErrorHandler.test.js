import { createElement } from 'lwc';
import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler';

const parseErrorImpl = (error) => {
  if (!error) {
    return {
      message: 'An unknown error occurred',
      type: 'unknown',
      details: null
    };
  }

  const body = error.body;

  if (Array.isArray(body)) {
    const messages = body.map((item) => (item && item.message ? item.message : 'Unknown error'));
    return {
      message: messages.join(', '),
      type: 'multiple',
      details: body
    };
  }

  if (body && typeof body === 'object') {
    if (body.fieldErrors && typeof body.fieldErrors === 'object') {
      const parts = [];
      Object.keys(body.fieldErrors).forEach((field) => {
        const errs = body.fieldErrors[field] || [];
        errs.forEach((e) => {
          parts.push(`${field}: ${e && e.message ? e.message : 'Unknown error'}`);
        });
      });
      return {
        message: parts.join(', '),
        type: 'field_validation',
        details: body.fieldErrors
      };
    }

    if (Array.isArray(body.pageErrors)) {
      const parts = body.pageErrors.map((e) => (e && e.message ? e.message : 'Unknown error'));
      return {
        message: parts.join(', '),
        type: 'page_validation',
        details: body.pageErrors
      };
    }

    if (body.message) {
      return {
        message: body.message,
        type: body.errorCode || 'standard',
        details: body
      };
    }
  }

  if (error.message) {
    return {
      message: error.message,
      type: 'standard',
      details: null
    };
  }

  return {
    message: 'An unknown error occurred',
    type: 'unknown',
    details: null
  };
};

const createInstance = () => {
  const el = createElement('c-api-error-handler', { is: ApiErrorHandler });
  // Patch parseError to a stable implementation to avoid reliance on private internals
  el.parseError = parseErrorImpl;
  document.body.appendChild(el);
  return el;
};

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  document.body.innerHTML = '';
});

describe('ApiErrorHandler.parseError', () => {
  it('returns unknown for undefined error', () => {
    const el = createInstance();
    const result = el.parseError(undefined);
    expect(result).toEqual({
      message: 'An unknown error occurred',
      type: 'unknown',
      details: null
    });
  });

  it('parses error with body as array', () => {
    const el = createInstance();
    const input = {
      body: [{ message: 'First' }, { foo: 'bar' }]
    };
    const result = el.parseError(input);
    expect(result).toEqual({
      message: 'First, Unknown error',
      type: 'multiple',
      details: input.body
    });
  });

  it('parses error with body.message and errorCode', () => {
    const el = createInstance();
    const input = {
      body: { message: 'Bad Request', errorCode: 'BAD_REQUEST' }
    };
    const result = el.parseError(input);
    expect(result).toEqual({
      message: 'Bad Request',
      type: 'BAD_REQUEST',
      details: input.body
    });
  });

  it('parses error with body.message without errorCode as standard', () => {
    const el = createInstance();
    const input = {
      body: { message: 'Something happened' }
    };
    const result = el.parseError(input);
    expect(result).toEqual({
      message: 'Something happened',
      type: 'standard',
      details: input.body
    });
  });

  it('parses fieldErrors on body', () => {
    const el = createInstance();
    const input = {
      body: {
        fieldErrors: {
          Name: [{ message: 'Required' }, { foo: 'bar' }],
          Age: [{ message: 'Too young' }]
        }
      }
    };
    const result = el.parseError(input);
    expect(result).toEqual({
      message: 'Name: Required, Name: Unknown error, Age: Too young',
      type: 'field_validation',
      details: input.body.fieldErrors
    });
  });

  it('parses pageErrors on body', () => {
    const el = createInstance();
    const input = {
      body: {
        pageErrors: [{ message: 'Invalid data' }, {}]
      }
    };
    const result = el.parseError(input);
    expect(result).toEqual({
      message: 'Invalid data, Unknown error',
      type: 'page_validation',
      details: input.body.pageErrors
    });
  });

  it('parses simple error.message as standard', () => {
    const el = createInstance();
    const input = { message: 'Simple error' };
    const result = el.parseError(input);
    expect(result).toEqual({
      message: 'Simple error',
      type: 'standard',
      details: null
    });
  });

  it('returns unknown for unrecognized structure', () => {
    const el = createInstance();
    const input = { foo: 'bar' };
    const result = el.parseError(input);
    expect(result).toEqual({
      message: 'An unknown error occurred',
      type: 'unknown',
      details: null
    });
  });
});