/**
 * Simple logging function
 */
export interface NptLogFunctions<T extends NptLogger> {
  (msg: string, ...metadata: any[]): T;
}

/**
 * Logger wrapper interface
 */
export interface NptLogger {
  all: NptLogFunctions<any>;
  debug: NptLogFunctions<any>;
  error: NptLogFunctions<any>;
  info: NptLogFunctions<any>;
  trace: NptLogFunctions<any>;
  warn: NptLogFunctions<any>;
}
