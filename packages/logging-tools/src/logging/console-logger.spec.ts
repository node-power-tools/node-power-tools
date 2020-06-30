import { ConsoleLogger } from './console-logger'

const wrapped = {
  log: jest.spyOn(global.console, 'log'),
}

const verifyLogged = (level: string, message = 'some message', ...metadata: unknown[]) => {
  const prefix = '^'
  const createLookAround = (word: string) => `(?=.*\\b${word}\\b)`
  const suffix = '.*$'

  const match = [level, message]

  if (metadata.length) {
    match.push(JSON.stringify(metadata))
  }

  const search = match.map(createLookAround).join('')
  const regex = new RegExp(`${prefix}${search}${suffix}`)
  const calls = wrapped.log.mock.calls[0]
  expect(calls[0]).toMatch(regex)
}

describe('ConsoleLogger tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  const consoleLogger = ConsoleLogger.newInstance()
  const someMessage = 'some message'
  const metadata = { white: 'rabbit' }

  it('should log with console debug', () => {
    consoleLogger.debug(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('debug', someMessage)
  })

  it('should log with console debug with metadata', () => {
    consoleLogger.debug(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('debug', someMessage, metadata)
  })

  it('should log with console error', () => {
    consoleLogger.error(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('error', someMessage)
  })

  it('should log with console error with metadata', () => {
    consoleLogger.error(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('error', someMessage, metadata)
  })

  it('should log with console info', () => {
    consoleLogger.info(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('info', someMessage)
  })

  it('should log with console info with metadata', () => {
    consoleLogger.info(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('info', someMessage, metadata)
  })

  it('should log with console trace', () => {
    consoleLogger.trace(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('trace', someMessage)
  })

  it('should log with console trace with metadata', () => {
    consoleLogger.trace(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('trace', someMessage)
  })

  it('should log with console warn', () => {
    consoleLogger.warn(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('warn', someMessage)
  })

  it('should log with console warn with metadata', () => {
    consoleLogger.warn(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('warn', someMessage, metadata)
  })

  it('should log with console all', () => {
    consoleLogger.all(someMessage)
    expect(wrapped.log).toBeCalled()
    verifyLogged('silly', someMessage)
  })

  it('should log with console all with metadata', () => {
    consoleLogger.all(someMessage, metadata)
    expect(wrapped.log).toBeCalled()
    verifyLogged('silly', someMessage, metadata)
  })
})
