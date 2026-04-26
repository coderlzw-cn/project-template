import { INestApplication, Logger } from '@nestjs/common';

export function registerProcessHooks(app: INestApplication) {
  const logger = new Logger('Bootstrap');
  let shuttingDown = false;

  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.warn(`Received ${signal}, shutting down application...`);

    try {
      await app.close();
    } catch (error) {
      logger.error('Failed to close Nest application cleanly', error instanceof Error ? error.stack : String(error));
      exitCode = 1;
    }

    process.exit(exitCode);
  };

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection', reason instanceof Error ? reason.stack : String(reason));
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error.stack ?? error.message);
    void shutdown('uncaughtException', 1);
  });

  process.on('warning', (warning) => {
    logger.warn(`${warning.name}: ${warning.message}`);
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}
