import { Logger } from 'winston'
import { NptLogger } from './logger'

/**
 * A Winston logger wrapper
 */
export class WinstonLogger implements NptLogger {
  readonly _wrapped: Logger

  private constructor(wrapped: Logger) {
    this._wrapped = wrapped
  }

  public static wrap(logger: Logger): WinstonLogger {
    return new WinstonLogger(logger)
  }

  private handleLogMessage = (level: string, message: string, ...metadata: any[]): WinstonLogger => {
    this._wrapped.log(level, message, metadata)
    return this
  }

  all(msg: string, ...metadata: any[]): WinstonLogger {
    return this.handleLogMessage('silly', msg, metadata)
  }

  debug(msg: string, ...metadata: any[]): WinstonLogger {
    return this.handleLogMessage('debug', msg, metadata)
  }

  error(msg: string, ...metadata: any[]): WinstonLogger {
    return this.handleLogMessage('error', msg, metadata)
  }

  info(msg: string, ...metadata: any[]): WinstonLogger {
    return this.handleLogMessage('info', msg, metadata)
  }

  trace(msg: string, ...metadata: any[]): WinstonLogger {
    return this.handleLogMessage('trace', msg, metadata)
  }

  warn(msg: string, ...metadata: any[]): WinstonLogger {
    return this.handleLogMessage('warn', msg, metadata)
  }
}

