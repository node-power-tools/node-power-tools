import { double, power } from './number'

describe('ProductInfoServiceImpl unit tests', () => {
  it('double', async () => {
    expect(double(2)).toStrictEqual(4)
  })

  it('power', async () => {
    expect(power(2, 4)).toStrictEqual(16)
  })
})
