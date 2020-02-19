import * as path from 'path'
import winston, { Logger, LoggerOptions } from 'winston'

/**
 * Create a {@link Logger} with configuration from config file.
 *
 * @param options optional {@link LoggerOptions} for configuration.
 */
export const createLogger = (options?: LoggerOptions): Logger => {
  const logger = winston.createLogger(options || {})

  if (options) {
    logger.configure(options)
  }

  return logger
}

/**
 * Create a {@link Logger} with a child context.
 *
 * @param additionalContext The child context
 * @param options optional {@link LoggerOptions} for configuration.
 */
export const createContextLogger = (additionalContext: any, options?: LoggerOptions): Logger => createLogger(options).child(additionalContext)

/**
 * Create a {@link Logger} with a child context that carries context of the file in which it is executing
 *
 * @param fileNameWithPath The full path to the file.
 * @param additionalContext any additional context
 * @param options optional {@link LoggerOptions} for configuration.
 */
export const createLoggerWithFileContext = (fileNameWithPath: string, additionalContext: any = {}, options?: LoggerOptions): Logger => {
  const file = extractShortFileName(fileNameWithPath)
  const context = { ...additionalContext, appModule: file }

  return createContextLogger(context, options)
}

/**
 * Extract the file name from a given path.
 *
 * @param fileNameWithPath the fully qualified file name
 */
export const extractShortFileName = (fileNameWithPath: string): string | undefined => {

  if (fileNameWithPath) {
    return path.basename(fileNameWithPath, path.extname(fileNameWithPath))
  }

  return undefined
}
