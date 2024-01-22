import { ERC20CollateralPool } from '../../src/erc20-collateral-pool'
import { SelfProvider } from '../../src/self-provider'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  COLLATERAL_TOKEN,
  COLLATERAL_TOKEN_CHAINLINK,
  EDGE_BIGINT,
  ERC20_COLLATERAL_POOL_ETH_ADDRESS,
  TESTING_PRIVATE_KEY,
  loadEnv
} from '../test-util'

jest.setTimeout(50000)

describe('SelfProvider - ERC20CollateralPool', () => {
  let providerUrl: string
  let provider: SelfProvider<ERC20CollateralPool>

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
  })

  beforeEach(() => {
    provider = new SelfProvider(
      ERC20CollateralPool,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
  })

  describe('Constant Variables', () => {
    it('get the right liquidation protocol fee', async () => {
      const liquidationProtocolFee =
        await provider.contract.LIQUIDATION_PROTOCOL_FEE()

      expect(liquidationProtocolFee).toBe(BigInt('5'))
    })
  })

  describe('Views', () => {
    it('get a pool by id', async () => {
      const pool = await provider.contract.getPool(BigInt(0))

      const coldPoolData = {
        collateralTokenAmount: BigInt(0),
        endTime: BigInt(1711925999),
        collateralDetails: {
          collateralToken: '0x81da82b49CD9Ee7b7d67B4655784581f30590eA1',
          collateralTokenChainlink:
            '0x997a6BCe1372baca6Bbb8db382Cb12F2dDca2b45',
          collateralTokenFactor: BigInt(115),
          collateralTokenPercentage: BigInt(50)
        },
        interest: BigInt(10)
      }

      expect({
        collateralTokenAmount: pool.collateralTokenAmount,
        endTime: pool.endTime,
        collateralDetails: {
          collateralToken: pool.collateralDetails.collateralToken,
          collateralTokenChainlink:
            pool.collateralDetails.collateralTokenChainlink,
          collateralTokenFactor: pool.collateralDetails.collateralTokenFactor,
          collateralTokenPercentage:
            pool.collateralDetails.collateralTokenPercentage
        },
        interest: pool.interest
      }).toEqual(coldPoolData)
    })

    it('get error because wrong pool id', async () => {
      await expect(provider.contract.getPool(EDGE_BIGINT)).rejects.toThrow(
        `Pool id ${EDGE_BIGINT.toString()} does not exist`
      )
    })
  })

  it('throws an error if collateralToken is not a valid address', async () => {
    await expect(
      provider.contract.createPool({
        endTime: 1911925999,
        interest: 10,
        collateralDetails: {
          collateralToken: 'invalid',
          collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
          collateralTokenFactor: 10,
          collateralTokenPercentage: 15
        }
      })
    ).rejects.toThrow(
      'Collateral token does not follow the ethereum address format'
    )
  })

  it('throws an error if collateralTokenChainlink is not a valid address', async () => {
    await expect(
      provider.contract.createPool({
        endTime: 1911925999,
        interest: 10,
        collateralDetails: {
          collateralToken: COLLATERAL_TOKEN,
          collateralTokenChainlink: 'invalid',
          collateralTokenFactor: 10,
          collateralTokenPercentage: 15
        }
      })
    ).rejects.toThrow(
      'Collateral token chainlink does not follow the ethereum address format'
    )
  })

  it('throws an error if sender address is not admin', async () => {
    await expect(
      provider.contract.createPool({
        endTime: 1911925999,
        interest: 10,
        collateralDetails: {
          collateralToken: COLLATERAL_TOKEN,
          collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
          collateralTokenFactor: 10,
          collateralTokenPercentage: 15
        }
      })
    ).rejects.toThrow('Sender address is not admin')
  })

  it('logs a message if the pool is ready to be created', async () => {
    provider = new SelfProvider(
      ERC20CollateralPool,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      providerUrl,
      ADMIN_TESTING_PRIVATE_KEY
    )

    await provider.contract.createPool({
      endTime: 1911925999,
      interest: 10,
      collateralDetails: {
        collateralToken: COLLATERAL_TOKEN,
        collateralTokenChainlink: COLLATERAL_TOKEN_CHAINLINK,
        collateralTokenFactor: 10,
        collateralTokenPercentage: 15
      }
    })

    expect(true).toBe(true)
  })
})
