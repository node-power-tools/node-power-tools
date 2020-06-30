/**
 * Simple logging function
 */
export interface NptLogFunctions<T extends NptLogger<T>> {
  (msg: string, ...metadata: unknown[]): T
}

/**
 * Logger wrapper interface
 */
export interface NptLogger<T extends NptLogger<T>> {
  all: NptLogFunctions<T>
  debug: NptLogFunctions<T>
  error: NptLogFunctions<T>
  info: NptLogFunctions<T>
  trace: NptLogFunctions<T>
  warn: NptLogFunctions<T>
}
