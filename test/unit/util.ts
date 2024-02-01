import { ERC20CollateralPool } from '../../src/erc20-collateral-pool'
import { SelfProvider } from '../../src/self-provider'
import { Pool } from '../../src/types/erc20-collateral-token'
import { normalizeEcp } from '../../src/util'
import {
  ERC20_COLLATERAL_POOL_ETH_ADDRESS,
  TESTING_PRIVATE_KEY,
  loadEnv
} from '../test-util'

jest.setTimeout(50000)

describe('Utils', () => {
  let providerUrl: string
  let provider: SelfProvider<ERC20CollateralPool>
  let unformattedPool: Pool

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
    provider = new SelfProvider(
      ERC20CollateralPool,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )

    unformattedPool = await provider.contract.getPool(BigInt(0))
  })

  describe('Normalizer', () => {
    it('success - data normalized successfully', async () => {
      const pool = normalizeEcp(unformattedPool)
      const coldPoolData = {
        collateralTokenAmount: BigInt(0).toString(),
        endTime: BigInt(1711925999).toString(),
        collateralDetails: {
          collateralToken: '0x81da82b49CD9Ee7b7d67B4655784581f30590eA1',
          collateralTokenChainlink:
            '0x997a6BCe1372baca6Bbb8db382Cb12F2dDca2b45',
          collateralTokenFactor: BigInt(115).toString(),
          collateralTokenPercentage: BigInt(50).toString()
        }
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
        }
      }).toEqual(coldPoolData)
    })
  })
})
