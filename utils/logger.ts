/**
 * Simple logger for MoRead application
 * Provides timestamped, leveled logging for debugging and traceability
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Read log level from environment, default to 'debug' in development
const CURRENT_LEVEL = import.meta.env.DEV ? 'debug' : 'info'

class AppLogger {
  private prefix: string

  constructor(module: string) {
    this.prefix = `[${module}]`
  }

  private format(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString()
    return `${timestamp} ${this.prefix} [${level.toUpperCase()}] ${message}`
  }

  debug(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS.debug >= LOG_LEVELS[CURRENT_LEVEL as LogLevel]) {
      console.debug(this.format('debug', message), ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS.info >= LOG_LEVELS[CURRENT_LEVEL as LogLevel]) {
      console.info(this.format('info', message), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS.warn >= LOG_LEVELS[CURRENT_LEVEL as LogLevel]) {
      console.warn(this.format('warn', message), ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (LOG_LEVELS.error >= LOG_LEVELS[CURRENT_LEVEL as LogLevel]) {
      console.error(this.format('error', message), ...args)
    }
  }

  // Log function entry with parameters
  trace(fn: string, params?: Record<string, unknown>): void {
    this.debug(`→ ${fn}`, params || '')
  }

  // Log function exit
  done(fn: string, result?: unknown): void {
    this.debug(`← ${fn}`, result !== undefined ? result : '')
  }
}

// Factory function
export function createLogger(module: string): AppLogger {
  return new AppLogger(module)
}

export default createLogger
