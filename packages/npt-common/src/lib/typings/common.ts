/**
 * T or {@code undefined}.
 */
export type Optional<T> = T | undefined;

/**
 * Simple async function type
 */
export type AsyncFunction<R> = (...args: any[]) => Promise<R>;
