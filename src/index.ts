/**
 * Food Coach Application - Main Entry Point
 * WhatsApp-based nutrition tracking and coaching system
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './lib/logger';
import { TwilioProvider } from './lib/provider/TwilioProvider';
import { ReportScheduler } from './modules/reports/ReportScheduler';
import { createWebhookRouter } from './routes/webhook';
import { createDebugRouter } from './routes/debug';

async function bootstrap(): Promise<void> {
  try {
    logger.info('🚀 Starting Food Coach application...', {
      nodeEnv: config.nodeEnv,
      port: config.port,
    });

    // Initialize Prisma client
    const prisma = new PrismaClient({
      log: config.nodeEnv === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['warn', 'error'],
    });

    // Test database connection
    await prisma.$connect();
    logger.info('📊 Database connected successfully');

    // Initialize WhatsApp provider
    const whatsAppProvider = new TwilioProvider();
    logger.info('📱 WhatsApp provider initialized');

    // Initialize report scheduler
    const reportScheduler = new ReportScheduler(prisma, whatsAppProvider);
    await reportScheduler.start();
    logger.info('⏰ Report scheduler started');

    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    app.use((req, _res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      next();
    });

    // Routes
    app.use('/webhooks', createWebhookRouter(prisma, whatsAppProvider));
    app.use('/debug', createDebugRouter(prisma, reportScheduler));

    // Health check
    app.get('/healthz', (_req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv,
      });
    });

    // 404 handler
    app.use('*', (_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Global error handler
    app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled application error', { error, url: req.url });
      res.status(500).json({ error: 'Internal server error' });
    });

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🌟 Food Coach server running on port ${config.port}`);
      logger.info('📋 Available endpoints:');
      logger.info('  POST /webhooks/whatsapp - WhatsApp webhook');
      logger.info('  GET  /healthz - Health check');
      if (config.nodeEnv === 'development') {
        logger.info('  POST /debug/run-daily-report - Manual daily report trigger');
        logger.info('  GET  /debug/user/:phone - Get user info');
        logger.info('  GET  /debug/stats/:userId - Get user stats');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`📴 Received ${signal}, starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('🔌 HTTP server closed');
      });

      reportScheduler.stop();
      logger.info('⏰ Report scheduler stopped');

      await prisma.$disconnect();
      logger.info('📊 Database disconnected');

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start application', { error });
    console.error('Detailed error:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
}); 