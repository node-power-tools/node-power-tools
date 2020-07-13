import VError from 'verror'

export const toErrorStack = (e: Error): string => `${e.message}\n${VError.fullStack(e)}`

export abstract class NPTError extends VError {
  protected constructor(name: string, message: string, cause?: Error) {
    super(
      {
        name,
        cause,
      },
      message,
    )

    Error.captureStackTrace(this, this.constructor)
  }
}
