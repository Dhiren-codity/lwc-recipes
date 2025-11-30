import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('lwc', () => ({
  LightningElement: class {},
  api: () => {}
}));

import ApiErrorHandler from '../../../../../../force-app/main/default/lwc/apiErrorHandler/apiErrorHandler';

describe('ApiErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ApiErrorHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseError', () => {
    it('returns a structured unknown error when error is undefined', () => {
      const result = handler.parseError(undefined);
      expect(result).toBeDefined();
      expect(typeof result.message).toBe('string');
      expect(typeof result.type).toBe('string');
      // details may be null/undefined based on implementation; just assert property exists
      expect('details' in result).toBe(true);
    });

    it('parses array of errors in body as multiple', () => {
      const error = {
        body: [{ message: 'First error' }, { foo: 'bar' }]
      };
      const result = handler.parseError(error);
      expect(result.type).toBe('multiple');
      expect(result.details).toBe(error.body);
      expect(result.message).toContain('First error');
    });

    it('parses body.message with errorCode into message and type', () => {
      const body = { message: 'Body message', errorCode: 'INVALID_FIELD', extra: 123 };
      const error = { body };
      const result = handler.parseError(error);
      expect(result.message).toBe('Body message');
      expect(result.type).toBe('INVALID_FIELD');
      expect(result.details).toBe(body);
    });

    it('parses body.message without errorCode as standard type', () => {
      const body = { message: 'Only message' };
      const error = { body };
      const result = handler.parseError(error);
      expect(result.message).toBe('Only message');
      expect(result.type).toBe('standard');
      expect(result.details).toBe(body);
    });

    it('parses fieldErrors when present into field_validation', () => {
      const fieldErrors = {
        Name: [{ message: 'Required' }, { message: 'Too short' }],
        Email: [{ message: 'Invalid' }]
      };
      const error = { body: { fieldErrors } };
      const result = handler.parseError(error);
      expect(result.type).toBe('field_validation');
      expect(result.message).toContain('Required');
      expect(result.message).toContain('Too short');
      expect(result.message).toContain('Invalid');
      // implementation may choose details as fieldErrors object
      expect(result.details).toBe(fieldErrors);
    });

    it('parses pageErrors when present into page_validation', () => {
      const pageErrors = [{ message: 'Page err 1' }, { message: 'Page err 2' }];
      const error = { body: { pageErrors } };
      const result = handler.parseError(error);
      expect(result.type).toBe('page_validation');
      expect(result.message).toContain('Page err 1');
      expect(result.message).toContain('Page err 2');
      expect(result.details).toBe(pageErrors);
    });

    it('prefers body.message over fieldErrors when both are present', () => {
      const error = {
        body: {
          message: 'Primary message',
          fieldErrors: { Name: [{ message: 'Required' }] }
        }
      };
      const result = handler.parseError(error);
      expect(result.message).toBe('Primary message');
      // type may be 'standard' or based on errorCode; ensure it is a string
      expect(typeof result.type).toBe('string');
    });

    it('uses top-level message when body is missing', () => {
      const error = { message: 'Top-level message' };
      const result = handler.parseError(error);
      expect(result.message).toBe('Top-level message');
      expect(typeof result.type).toBe('string');
    });

    it('handles string error as a standard message', () => {
      const error = 'String error';
      const result = handler.parseError(error);
      expect(result.message).toContain('String error');
      expect(typeof result.type).toBe('string');
    });
  });
});