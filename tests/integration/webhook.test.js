"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integration tests for webhook endpoint
 */
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const webhook_1 = require("../../src/routes/webhook");
const setup_1 = require("../setup");
// Mock WhatsApp provider for testing
const mockWhatsAppProvider = {
    parseIncoming: jest.fn(),
    sendText: jest.fn(),
    validateWebhook: jest.fn(),
};
describe('Webhook Integration Tests', () => {
    let app;
    beforeEach(() => {
        // Create Express app with webhook routes
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use(express_1.default.urlencoded({ extended: true }));
        app.use('/', (0, webhook_1.createWebhookRouter)(setup_1.testPrisma, mockWhatsAppProvider));
        // Reset mocks
        jest.clearAllMocks();
    });
    describe('POST /whatsapp', () => {
        test('should process meal entry and return hint', async () => {
            // Mock provider responses
            mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
            mockWhatsAppProvider.parseIncoming.mockResolvedValue({
                from: '+1234567890',
                type: 'text',
                text: 'grilled chicken and salad',
                timestamp: new Date(),
            });
            mockWhatsAppProvider.sendText.mockResolvedValue({
                success: true,
                messageId: 'msg123',
            });
            const response = await (0, supertest_1.default)(app)
                .post('/whatsapp')
                .send({
                From: 'whatsapp:+1234567890',
                Body: 'grilled chicken and salad',
                MessageSid: 'test123',
            });
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.type).toBe('meal_logged');
            // Verify provider methods were called
            expect(mockWhatsAppProvider.validateWebhook).toHaveBeenCalled();
            expect(mockWhatsAppProvider.parseIncoming).toHaveBeenCalled();
            expect(mockWhatsAppProvider.sendText).toHaveBeenCalled();
            // Check that meal was created in database
            const meal = await setup_1.testPrisma.meal.findFirst({
                where: { rawText: 'grilled chicken and salad' },
            });
            expect(meal).toBeTruthy();
            expect(meal.tags.protein).toBe(true);
            expect(meal.tags.veggies).toBe(true);
            // Check that user was created
            const user = await setup_1.testPrisma.user.findFirst({
                where: { phone: '+1234567890' },
            });
            expect(user).toBeTruthy();
            // Check message logs
            const incomingLog = await setup_1.testPrisma.messageLog.findFirst({
                where: { direction: 'IN' },
            });
            expect(incomingLog).toBeTruthy();
            const outgoingLog = await setup_1.testPrisma.messageLog.findFirst({
                where: { direction: 'OUT' },
            });
            expect(outgoingLog).toBeTruthy();
        });
        test('should process preference command and return confirmation', async () => {
            // Mock provider responses
            mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
            mockWhatsAppProvider.parseIncoming.mockResolvedValue({
                from: '+1234567890',
                type: 'text',
                text: 'set goal: fat_loss',
                timestamp: new Date(),
            });
            mockWhatsAppProvider.sendText.mockResolvedValue({
                success: true,
                messageId: 'msg456',
            });
            const response = await (0, supertest_1.default)(app)
                .post('/whatsapp')
                .send({
                From: 'whatsapp:+1234567890',
                Body: 'set goal: fat_loss',
                MessageSid: 'test456',
            });
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.type).toBe('preference_update');
            // Check that preferences were updated
            const user = await setup_1.testPrisma.user.findFirst({
                where: { phone: '+1234567890' },
                include: { preferences: true },
            });
            expect(user?.preferences?.goal).toBe('fat_loss');
            // Verify confirmation message was sent
            expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
                to: '+1234567890',
                text: expect.stringContaining('Goal set to: Fat Loss'),
            });
        });
        test('should handle invalid webhook gracefully', async () => {
            mockWhatsAppProvider.validateWebhook.mockReturnValue(false);
            const response = await (0, supertest_1.default)(app)
                .post('/whatsapp')
                .send({
                invalid: 'data',
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid webhook');
        });
        test('should handle message too long error', async () => {
            const longMessage = 'a'.repeat(1001); // Exceeds 1000 character limit
            mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
            mockWhatsAppProvider.parseIncoming.mockResolvedValue({
                from: '+1234567890',
                type: 'text',
                text: longMessage,
                timestamp: new Date(),
            });
            mockWhatsAppProvider.sendText.mockResolvedValue({
                success: true,
                messageId: 'msg789',
            });
            const response = await (0, supertest_1.default)(app)
                .post('/whatsapp')
                .send({
                From: 'whatsapp:+1234567890',
                Body: longMessage,
                MessageSid: 'test789',
            });
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Message too long');
            // Verify error message was sent to user
            expect(mockWhatsAppProvider.sendText).toHaveBeenCalledWith({
                to: '+1234567890',
                text: 'Message too long. Please keep it under 1000 characters.',
            });
        });
        test('should handle processing errors gracefully', async () => {
            mockWhatsAppProvider.validateWebhook.mockReturnValue(true);
            mockWhatsAppProvider.parseIncoming.mockRejectedValue(new Error('Parse error'));
            mockWhatsAppProvider.sendText.mockResolvedValue({
                success: true,
                messageId: 'error123',
            });
            const response = await (0, supertest_1.default)(app)
                .post('/whatsapp')
                .send({
                From: 'whatsapp:+1234567890',
                Body: 'test message',
                MessageSid: 'error123',
            });
            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Internal server error');
        });
    });
    describe('GET /health', () => {
        test('should return health status', async () => {
            const response = await (0, supertest_1.default)(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
            expect(response.body.timestamp).toBeDefined();
        });
    });
});
//# sourceMappingURL=webhook.test.js.map