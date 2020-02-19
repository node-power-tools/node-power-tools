/**
 * Async sleep for the specified period of time in milliseconds
 *
 * @param sleepTimeMs Time in milliseconds to sleep
 */
export const sleep = async (sleepTimeMs: number): Promise<number> => new Promise(resolve => setTimeout(resolve, sleepTimeMs))
