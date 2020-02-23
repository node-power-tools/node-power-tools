import { DateTimeFormatter, LocalDateTime } from '@js-joda/core'
import { NptLogger } from './logger'

/**
 * A very basic console logger
 */
export class ConsoleLogger implements NptLogger {
  static readonly DT_FORMAT = DateTimeFormatter.ofPattern('MM-dd-yy HH:mm:ss.SSS')

  public static newInstance(): ConsoleLogger {
    return new ConsoleLogger()
  }

  private handleLogMessage = (level: string, message: string, ...metadata: any[]): ConsoleLogger => {
    if (metadata) {
      console.log(`${ConsoleLogger.DT_FORMAT.format(LocalDateTime.now())}: ${level}: ${message}: ${JSON.stringify(metadata)}`)
    } else {
      console.log(`${ConsoleLogger.DT_FORMAT.format(LocalDateTime.now())}: ${level}: ${message}`)
    }
    return this
  }

  all(msg: string, ...metadata: any[]): ConsoleLogger {
    return this.handleLogMessage('silly', msg, metadata)
  }

  debug(msg: string, ...metadata: any[]): ConsoleLogger {
    return this.handleLogMessage('debug', msg, metadata)
  }

  error(msg: string, ...metadata: any[]): ConsoleLogger {
    return this.handleLogMessage('error', msg, metadata)
  }

  info(msg: string, ...metadata: any[]): ConsoleLogger {
    return this.handleLogMessage('info', msg, metadata)
  }

  trace(msg: string, ...metadata: any[]): ConsoleLogger {
    return this.handleLogMessage('trace', msg, metadata)
  }

  warn(msg: string, ...metadata: any[]): ConsoleLogger {
    return this.handleLogMessage('warn', msg, metadata)
  }
}

