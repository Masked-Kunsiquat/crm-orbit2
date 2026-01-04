/**
 * Standardized logging utility for CRM Orbit
 *
 * Features:
 * - Module-based logging with automatic prefixes
 * - Debug flag support (works with Expo Go/dev server via __DEV__)
 * - Consistent formatting across the application
 * - Type-safe log levels
 * - Human-readable output with timestamps
 *
 * Usage:
 *   import { createLogger } from '@utils/logger';
 *
 *   const logger = createLogger('MyModule');
 *   logger.info('User logged in', { userId: '123' });
 *   logger.debug('Cache hit', { key: 'user:123' });
 *   logger.error('Failed to save', error);
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerConfig {
  /** Enable debug logging (defaults to __DEV__ if available) */
  enableDebug?: boolean;
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Custom timestamp formatter */
  formatTimestamp?: () => string;
  /** Silence all logs (useful during batch operations like event replay) */
  silenced?: boolean;
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/** Global logger configuration */
let globalConfig: LoggerConfig = {
  enableDebug: typeof __DEV__ !== "undefined" ? __DEV__ : false,
  minLevel: "debug",
  formatTimestamp: () => new Date().toISOString(),
  silenced: false,
};

/**
 * Configure global logger settings
 */
export const configureLogger = (config: Partial<LoggerConfig>): void => {
  globalConfig = { ...globalConfig, ...config };
};

/**
 * Get current logger configuration
 */
export const getLoggerConfig = (): Readonly<LoggerConfig> => {
  return { ...globalConfig };
};

/**
 * Silence all logs (useful during batch operations like event replay)
 */
export const silenceLogs = (): void => {
  globalConfig.silenced = true;
};

/**
 * Re-enable logs after silencing
 */
export const unsilenceLogs = (): void => {
  globalConfig.silenced = false;
};

/** Log level priorities for filtering */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Format log message with timestamp and module prefix
 */
const formatMessage = (
  level: LogLevel,
  module: string,
  message: string,
): string => {
  const timestamp =
    globalConfig.formatTimestamp?.() || new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  return `[${timestamp}] ${levelStr} [${module}] ${message}`;
};

/**
 * Check if a log level should be displayed
 */
const shouldLog = (level: LogLevel): boolean => {
  // Don't log if silenced
  if (globalConfig.silenced) {
    return false;
  }

  const minLevel = globalConfig.minLevel || "debug";
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
};

/**
 * Serialize arguments for logging
 */
const serializeArgs = (args: unknown[]): string => {
  if (args.length === 0) return "";

  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `Error: ${arg.message}\n${arg.stack || ""}`;
      }
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ");
};

/**
 * Create a logger instance for a specific module
 *
 * @param moduleName - Name of the module (e.g., 'Auth', 'ContactReducer', 'API')
 * @returns Logger instance with debug, info, warn, and error methods
 *
 * @example
 * ```typescript
 * const logger = createLogger('UserService');
 * logger.info('User created', { id: '123', email: 'user@example.com' });
 * logger.debug('Cache check', { key: 'user:123', hit: true });
 * logger.error('Failed to delete user', error);
 * ```
 */
export const createLogger = (moduleName: string): Logger => {
  const log = (level: LogLevel, message: string, ...args: unknown[]): void => {
    // Skip debug logs if debug is disabled
    if (level === "debug" && !globalConfig.enableDebug) {
      return;
    }

    // Skip logs below minimum level
    if (!shouldLog(level)) {
      return;
    }

    const formattedMessage = formatMessage(level, moduleName, message);
    const serializedArgs = serializeArgs(args);
    const fullMessage = serializedArgs
      ? `${formattedMessage}\n${serializedArgs}`
      : formattedMessage;

    // Use appropriate console method
    switch (level) {
      case "debug":
      case "info":
        console.log(fullMessage);
        break;
      case "warn":
        console.warn(fullMessage);
        break;
      case "error":
        console.error(fullMessage);
        break;
    }
  };

  return {
    debug: (message: string, ...args: unknown[]) =>
      log("debug", message, ...args),
    info: (message: string, ...args: unknown[]) =>
      log("info", message, ...args),
    warn: (message: string, ...args: unknown[]) =>
      log("warn", message, ...args),
    error: (message: string, ...args: unknown[]) =>
      log("error", message, ...args),
  };
};

/**
 * Default logger for general application use
 */
export const logger = createLogger("App");
