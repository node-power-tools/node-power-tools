import { mock } from 'jest-mock-extended'
import { Logger } from 'winston'

import { WinstonLogger } from './winston-logger'

const wrapped = mock<Logger>()

const verifyLogged = (level: string, message = 'some message', ..._: unknown[]) => {
  const prefix = '^'
  const createLookAround = (word: string) => `(?=.*\\b${word}\\b)`
  const suffix = '.*$'

  const match = [level, message]

  const search = match.map(createLookAround).join('')
  const regex = new RegExp(`${prefix}${search}${suffix}`)
  const calls = wrapped.log.mock.calls[0]
  expect(calls.join(' ')).toMatch(regex)
}

describe('WinstonLogger tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  const winstonLogger = WinstonLogger.wrap(wrapped)
  const someMessage = 'some winston message'
  const metadata = { white: 'bunny' }

  it('should log with winston debug', () => {
    winstonLogger.debug(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('debug', someMessage)
  })

  it('should log with winston debug with metadata', () => {
    winstonLogger.debug(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('debug', someMessage, metadata)
  })

  it('should log with winston error', () => {
    winstonLogger.error(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('error', someMessage)
  })

  it('should log with winston error with metadata', () => {
    winstonLogger.error(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('error', someMessage, metadata)
  })

  it('should log with winston info', () => {
    winstonLogger.info(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('info', someMessage)
  })

  it('should log with winston info with metadata', () => {
    winstonLogger.info(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('info', someMessage, metadata)
  })

  it('should log with winston trace', () => {
    winstonLogger.trace(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('trace', someMessage)
  })

  it('should log with winston trace with metadata', () => {
    winstonLogger.trace(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('trace', someMessage)
  })

  it('should log with winston warn', () => {
    winstonLogger.warn(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('warn', someMessage)
  })

  it('should log with winston warn with metadata', () => {
    winstonLogger.warn(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('warn', someMessage, metadata)
  })

  it('should log with winston all', () => {
    winstonLogger.all(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('silly', someMessage)
  })

  it('should log with winston all with metadata', () => {
    winstonLogger.all(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('silly', someMessage, metadata)
  })
})
