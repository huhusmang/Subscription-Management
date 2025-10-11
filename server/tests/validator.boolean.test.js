const { createValidator } = require('../utils/validator');

describe('Validator Boolean Method - SQLite Boolean Support', () => {
    let validator;

    beforeEach(() => {
        validator = createValidator();
    });

    describe('Standard boolean values', () => {
        test('should accept true', () => {
            validator.boolean(true, 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });

        test('should accept false', () => {
            validator.boolean(false, 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });
    });

    describe('SQLite integer boolean values', () => {
        test('should accept 1 as true', () => {
            validator.boolean(1, 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });

        test('should accept 0 as false', () => {
            validator.boolean(0, 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });
    });

    describe('String boolean values', () => {
        test('should accept "1" as true', () => {
            validator.boolean('1', 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });

        test('should accept "0" as false', () => {
            validator.boolean('0', 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });

        test('should accept "true"', () => {
            validator.boolean('true', 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });

        test('should accept "false"', () => {
            validator.boolean('false', 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });
    });

    describe('Null and undefined values', () => {
        test('should accept undefined', () => {
            validator.boolean(undefined, 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });

        test('should accept null', () => {
            validator.boolean(null, 'test_field');
            expect(validator.hasErrors()).toBe(false);
        });
    });

    describe('Invalid values', () => {
        test('should reject integer 2', () => {
            validator.boolean(2, 'test_field');
            expect(validator.hasErrors()).toBe(true);
            expect(validator.getErrors()[0].message).toContain('must be a boolean (true/false) or integer boolean (0/1)');
        });

        test('should reject negative integers', () => {
            validator.boolean(-1, 'test_field');
            expect(validator.hasErrors()).toBe(true);
        });

        test('should reject string "yes"', () => {
            validator.boolean('yes', 'test_field');
            expect(validator.hasErrors()).toBe(true);
        });

        test('should reject string "no"', () => {
            validator.boolean('no', 'test_field');
            expect(validator.hasErrors()).toBe(true);
        });

        test('should reject array', () => {
            validator.boolean([], 'test_field');
            expect(validator.hasErrors()).toBe(true);
        });

        test('should reject object', () => {
            validator.boolean({}, 'test_field');
            expect(validator.hasErrors()).toBe(true);
        });
    });

    describe('Error message', () => {
        test('should provide informative error message', () => {
            validator.boolean('invalid', 'is_enabled');
            expect(validator.hasErrors()).toBe(true);
            const error = validator.getErrors()[0];
            expect(error.field).toBe('is_enabled');
            expect(error.message).toBe('is_enabled must be a boolean (true/false) or integer boolean (0/1)');
        });
    });

    describe('Issue #27 specific test cases', () => {
        test('should handle SQLite returned values from notification settings', () => {
            // Simulate values returned from SQLite database
            const sqliteData = {
                is_enabled: 1,
                repeat_notification: 0
            };

            validator
                .boolean(sqliteData.is_enabled, 'is_enabled')
                .boolean(sqliteData.repeat_notification, 'repeat_notification');

            expect(validator.hasErrors()).toBe(false);
        });

        test('should handle mixed boolean types in update request', () => {
            // Simulate a mixed request with both boolean and integer values
            const updateData = {
                is_enabled: true,      // Direct boolean
                repeat_notification: 0  // SQLite integer
            };

            validator
                .boolean(updateData.is_enabled, 'is_enabled')
                .boolean(updateData.repeat_notification, 'repeat_notification');

            expect(validator.hasErrors()).toBe(false);
        });
    });
});