"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPrisma = void 0;
/**
 * Jest test setup configuration
 */
const client_1 = require("@prisma/client");
// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.TWILIO_PHONE_NUMBER = 'whatsapp:+1234567890';
process.env.LOG_LEVEL = 'silent';
// Global test database instance
let testPrisma;
beforeAll(async () => {
    exports.testPrisma = testPrisma = new client_1.PrismaClient({
        datasources: {
            db: {
                url: 'file:./test.db',
            },
        },
    });
    // Run migrations for test database
    const { execSync } = require('child_process');
    execSync('DATABASE_URL="file:./test.db" npx prisma migrate deploy', { stdio: 'inherit' });
});
beforeEach(async () => {
    // Clean database before each test
    await testPrisma.messageLog.deleteMany();
    await testPrisma.meal.deleteMany();
    await testPrisma.preferences.deleteMany();
    await testPrisma.user.deleteMany();
});
afterAll(async () => {
    await testPrisma.$disconnect();
});
//# sourceMappingURL=setup.js.map