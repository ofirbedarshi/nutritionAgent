/**
 * User service for business logic operations
 */
import { UserRepository, UserWithPreferences } from './UserRepository';
import { logger } from '../../lib/logger';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Get or create user by phone number
   */
  async getOrCreateUser(phone: string, language = 'he'): Promise<UserWithPreferences> {
    try {
      const user = await this.userRepository.upsert(phone, language);
      
      if (!user.preferences) {
        logger.warn('User created without preferences', { userId: user.id, phone });
        throw new Error('Failed to create user preferences');
      }

      logger.info('User retrieved/created', { 
        userId: user.id, 
        phone, 
        isNew: !user.preferences.updatedAt 
      });

      return user;
    } catch (error) {
      logger.error('Failed to get or create user', { phone, error });
      throw error;
    }
  }

  /**
   * Find user by phone number
   */
  async findUserByPhone(phone: string): Promise<UserWithPreferences | null> {
    try {
      return await this.userRepository.findByPhone(phone);
    } catch (error) {
      logger.error('Failed to find user by phone', { phone, error });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserWithPreferences | null> {
    try {
      return await this.userRepository.findById(id);
    } catch (error) {
      logger.error('Failed to find user by ID', { id, error });
      throw error;
    }
  }

  /**
   * Get all users for daily reports
   */
  async getAllUsersForReports(): Promise<UserWithPreferences[]> {
    try {
      return await this.userRepository.getAllUsersForReports();
    } catch (error) {
      logger.error('Failed to get users for reports', { error });
      throw error;
    }
  }
} 