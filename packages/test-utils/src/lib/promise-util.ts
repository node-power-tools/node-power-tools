export const buildPromise = <T>(dataObject: T): Promise<T> => {
  return new Promise<T>((resolve) => resolve(dataObject))
}
