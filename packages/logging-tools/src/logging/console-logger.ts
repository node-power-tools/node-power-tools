import { DateTimeFormatter, LocalDateTime } from '@js-joda/core'

import { NptLogger } from './logger'

/**
 * A very basic console logger
 */
export class ConsoleLogger implements NptLogger<ConsoleLogger> {
  private constructor(private readonly dateTimeFormatter: DateTimeFormatter) {}

  /**
   * Factory for {@code ConsoleLogger}
   * @param dateFormat The date format for the logger.
   */
  public static newInstance(dateFormat = 'MM-dd-yy HH:mm:ss.SSS'): ConsoleLogger {
    const dateTimeFormatter = DateTimeFormatter.ofPattern(dateFormat)

    return new ConsoleLogger(dateTimeFormatter)
  }

  private handleLogMessage = (level: string, message: string, ...metadata: unknown[]): ConsoleLogger => {
    const prefix = this.dateTimeFormatter.format(LocalDateTime.now())

    if (metadata && metadata.length) {
      console.log(`${prefix}: ${level}: ${message}: ${JSON.stringify(metadata)}`)
    } else {
      console.log(`${prefix}: ${level}: ${message}`)
    }

    return this
  }

  all(msg: string, ...metadata: unknown[]): ConsoleLogger {
    return this.handleLogMessage('silly', msg, ...metadata)
  }

  debug(msg: string, ...metadata: unknown[]): ConsoleLogger {
    return this.handleLogMessage('debug', msg, ...metadata)
  }

  error(msg: string, ...metadata: unknown[]): ConsoleLogger {
    return this.handleLogMessage('error', msg, ...metadata)
  }

  info(msg: string, ...metadata: unknown[]): ConsoleLogger {
    return this.handleLogMessage('info', msg, ...metadata)
  }

  trace(msg: string, ...metadata: unknown[]): ConsoleLogger {
    return this.handleLogMessage('trace', msg, ...metadata)
  }

  warn(msg: string, ...metadata: unknown[]): ConsoleLogger {
    return this.handleLogMessage('warn', msg, ...metadata)
  }
}
