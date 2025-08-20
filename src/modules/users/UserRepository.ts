/**
 * User repository for database operations
 */
import { PrismaClient, User, Preferences } from '@prisma/client';

export type UserWithPreferences = User & {
  preferences: Preferences | null;
};

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find user by phone number
   */
  async findByPhone(phone: string): Promise<UserWithPreferences | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      include: { preferences: true },
    });
  }

  /**
   * Create a new user
   */
  async create(phone: string, language = 'he'): Promise<UserWithPreferences> {
    return this.prisma.user.create({
      data: {
        phone,
        language,
        preferences: {
          create: {
            goal: 'general',
            tone: 'friendly',
            reportTime: '21:30',
            reportFormat: 'text',
            focus: JSON.stringify([]),
            thresholds: JSON.stringify({ lateHour: 21 }),
          },
        },
      },
      include: { preferences: true },
    });
  }

  /**
   * Upsert user - create if not exists, return existing if exists
   */
  async upsert(phone: string, language = 'he'): Promise<UserWithPreferences> {
    const existingUser = await this.findByPhone(phone);
    if (existingUser) {
      return existingUser;
    }
    return this.create(phone, language);
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserWithPreferences | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { preferences: true },
    });
  }

  /**
   * Get all users for daily reports
   */
  async getAllUsersForReports(): Promise<UserWithPreferences[]> {
    return this.prisma.user.findMany({
      include: { preferences: true },
      where: {
        preferences: {
          isNot: null,
        },
      },
    });
  }
} 