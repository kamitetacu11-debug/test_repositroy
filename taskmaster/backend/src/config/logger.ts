import pino from 'pino';
import { config } from './index.js';

export const logger = pino({
  level: config.logLevel,
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: config.nodeEnv,
  },
});

export const createChildLogger = (module: string) => {
  return logger.child({ module });
};
