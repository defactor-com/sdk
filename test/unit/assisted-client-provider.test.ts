import { AssistedClientProvider } from '../../src'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  COLLATERAL_TOKEN,
  COLLATERAL_TOKEN_CHAINLINK,
  INSTANCE_ETH_ADDRESS,
  TESTING_PRIVATE_KEY,
  loadEnv
} from '../test-util'

jest.setTimeout(50000)

describe('AssistedClientProvider', () => {
  let providerUrl: string
  let contractInstance: AssistedClientProvider

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
  })

  beforeEach(() => {
    contractInstance = new AssistedClientProvider(
      INSTANCE_ETH_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
  })

  it('get the right liquidation protocol fee', async () => {
    const liquidationProtocolFee =
      await contractInstance.LIQUIDATION_PROTOCOL_FEE()

    expect(liquidationProtocolFee).toBe(BigInt('5'))
  })

  it('throws an error if collateralToken is not a valid address', async () => {
    await expect(
      contractInstance.createPool({
        collateralToken: 'invalid',
        collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
        collateralTokenFactor: 10,
        collateralTokenPercentage: 15,
        interest: 10,
        endTime: 1911925999
      })
    ).rejects.toThrow(
      'Collateral token does not follow the ethereum address format'
    )
  })

  it('throws an error if collateralTokenChainlink is not a valid address', async () => {
    await expect(
      contractInstance.createPool({
        collateralToken: COLLATERAL_TOKEN,
        collateralTokenChainlink: 'invalid',
        collateralTokenFactor: 10,
        collateralTokenPercentage: 15,
        interest: 10,
        endTime: 1911925999
      })
    ).rejects.toThrow(
      'Collateral token chainlink does not follow the ethereum address format'
    )
  })

  it('throws an error if sender address is not admin', async () => {
    await expect(
      contractInstance.createPool({
        collateralToken: COLLATERAL_TOKEN,
        collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
        collateralTokenFactor: 10,
        collateralTokenPercentage: 15,
        interest: 10,
        endTime: 1911925999
      })
    ).rejects.toThrow('Sender address is not admin')
  })

  it('logs a message if the pool is ready to be created', async () => {
    contractInstance = new AssistedClientProvider(
      INSTANCE_ETH_ADDRESS,
      providerUrl,
      ADMIN_TESTING_PRIVATE_KEY
    )

    await contractInstance.createPool({
      collateralToken: COLLATERAL_TOKEN,
      collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
      collateralTokenFactor: 10,
      collateralTokenPercentage: 15,
      interest: 10,
      endTime: 1911925999
    })

    expect(true).toBe(true)
  })
})
