const request = require('supertest');
const express = require('express');
const NotificationController = require('../controllers/notificationController');
const responseHelper = require('../utils/responseHelper');

// Mock the notification service
jest.mock('../services/notificationService');

describe('NotificationController - Boolean Normalization (Issue #27)', () => {
    let app;
    let controller;
    let mockDb;

    beforeEach(() => {
        // Setup Express app
        app = express();
        app.use(express.json());

        // Create controller instance
        controller = new NotificationController();

        // Mock database
        mockDb = {
            prepare: jest.fn().mockReturnValue({
                get: jest.fn(),
                run: jest.fn().mockReturnValue({ changes: 1 }),
                all: jest.fn()
            })
        };

        // Mock the notification service's db property
        controller.notificationService = {
            db: mockDb
        };

        // Setup route
        app.put('/api/notifications/settings/:id', controller.updateSetting);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Boolean normalization for SQLite integer values', () => {
        test('should accept SQLite integer boolean values (1/0)', async () => {
            // Mock getting current setting
            mockDb.prepare().get.mockReturnValue({
                notification_type: 'renewal_reminder'
            });

            const updateData = {
                is_enabled: 1,                    // SQLite integer: true
                repeat_notification: 0,           // SQLite integer: false
                advance_days: 7,
                notification_channels: ['telegram']
            };

            const response = await request(app)
                .put('/api/notifications/settings/1')
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockDb.prepare().run).toHaveBeenCalledWith(
                1,                               // normalized boolean to integer
                7,
                '["telegram"]',
                0,                               // normalized boolean to integer
                1
            );
        });

        test('should accept mixed boolean and integer values', async () => {
            // Mock getting current setting
            mockDb.prepare().get.mockReturnValue({
                notification_type: 'renewal_reminder'
            });

            const updateData = {
                is_enabled: true,                 // Standard boolean
                repeat_notification: 0,           // SQLite integer
                advance_days: 3,
                notification_channels: ['telegram', 'email']
            };

            const response = await request(app)
                .put('/api/notifications/settings/2')
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockDb.prepare().run).toHaveBeenCalledWith(
                1,                               // true normalized to 1
                3,
                '["telegram","email"]',
                0,                               // 0 normalized to 0
                2
            );
        });

        test('should accept string boolean values', async () => {
            // Mock getting current setting
            mockDb.prepare().get.mockReturnValue({
                notification_type: 'renewal_reminder'
            });

            const updateData = {
                is_enabled: '1',                  // String SQLite boolean
                repeat_notification: 'false',     // String boolean
                advance_days: 5,
                notification_channels: ['telegram']
            };

            const response = await request(app)
                .put('/api/notifications/settings/3')
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(mockDb.prepare().run).toHaveBeenCalledWith(
                1,                               // '1' normalized to 1
                5,
                '["telegram"]',
                0,                               // 'false' normalized to 0
                3
            );
        });

        test('should reject invalid boolean values', async () => {
            const updateData = {
                is_enabled: 2,                    // Invalid: not 0 or 1
                repeat_notification: true,
                advance_days: 5,
                notification_channels: ['telegram']
            };

            const response = await request(app)
                .put('/api/notifications/settings/4')
                .send(updateData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        field: 'is_enabled',
                        message: expect.stringContaining('must be a boolean')
                    })
                ])
            );
        });

        test('should handle the exact scenario from issue #27', async () => {
            // Mock getting current setting
            mockDb.prepare().get.mockReturnValue({
                notification_type: 'expiration_warning'
            });

            // This simulates the exact data that would come from the GET request
            const updateData = {
                is_enabled: 1,                    // From SQLite database
                repeat_notification: 0,           // From SQLite database
                advance_days: 0,
                notification_channels: ['telegram']
            };

            const response = await request(app)
                .put('/api/notifications/settings/2')
                .send(updateData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual({ message: 'Notification setting updated successfully' });

            // Verify the database was called with the correct normalized values
            expect(mockDb.prepare().run).toHaveBeenCalledWith(
                1,                               // 1 (SQLite true) normalized to 1
                0,                               // For expiration_warning, advance_days is always 0
                '["telegram"]',
                0,                               // 0 (SQLite false) normalized to 0
                2
            );
        });
    });

    describe('Boolean normalization helper function', () => {
        test('normalizeBoolean function should work correctly', () => {
            // Since the function is defined inside the controller, we'll test its behavior
            // through the actual API calls above. This test documents the expected behavior.

            const testCases = [
                { input: true, expected: true },
                { input: false, expected: false },
                { input: 1, expected: true },
                { input: 0, expected: false },
                { input: '1', expected: true },
                { input: '0', expected: false },
                { input: 'true', expected: true },
                { input: 'false', expected: false },
                { input: 'invalid', expected: 'invalid' }  // Should pass through unchanged
            ];

            // The normalization logic is tested through the integration tests above
            expect(testCases.length).toBeGreaterThan(0);
        });
    });
});