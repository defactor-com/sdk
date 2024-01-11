import { AssistedClientProvider } from '../../src'
import { loadEnv } from '../test-util'

jest.setTimeout(50000)

describe('AssistedClientProvider', () => {
  const contractAddress = '0x75154e846dD894C3d2361Cc1d4C03278E0bF38A1'
  let providerUrl: string

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
  })

  it('get the right liquidation protocol fee', async () => {
    const contractInstance = new AssistedClientProvider(
      contractAddress,
      providerUrl
    )
    const liquidationProtocolFee =
      await contractInstance.LIQUIDATION_PROTOCOL_FEE()

    expect(liquidationProtocolFee).toBe(BigInt('5'))
  })
})
