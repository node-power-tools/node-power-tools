/**
 * Simple logging function
 */
export interface NptLogFunctions<T extends NptLogger> {
  (msg: string, ...metadata: unknown[]): T
}

/**
 * Logger wrapper interface
 */
export interface NptLogger {
  all: NptLogFunctions<NptLogger>
  debug: NptLogFunctions<NptLogger>
  error: NptLogFunctions<NptLogger>
  info: NptLogFunctions<NptLogger>
  trace: NptLogFunctions<NptLogger>
  warn: NptLogFunctions<NptLogger>
}
