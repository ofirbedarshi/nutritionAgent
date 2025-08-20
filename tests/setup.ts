/**
 * Jest test setup configuration
 */
import { PrismaClient } from '@prisma/client';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234567890';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_123456789012345678901234';
process.env.TWILIO_PHONE_NUMBER = 'whatsapp:+1234567890';
process.env.LOG_LEVEL = 'error';
// CRITICAL: Mock OpenAI key to prevent real API calls during testing
process.env.OPENAI_API_KEY = 'sk-test-mock-key-for-testing-only-not-real';

// Global test database instance
let testPrisma: PrismaClient;

beforeAll(async () => {
  testPrisma = new PrismaClient({
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

export { testPrisma }; 