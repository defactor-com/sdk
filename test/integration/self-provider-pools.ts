import { Pools } from '../../src/pools'
import { SelfProvider } from '../../src/self-provider'
import {
  EDGE_BIGINT,
  POOLS_ETH_ADDRESS,
  TESTING_PRIVATE_KEY,
  USD_TOKEN_ADDRESS,
  loadEnv
} from '../test-util'

jest.setTimeout(50000)

describe('SelfProvider - ERC20CollateralPool', () => {
  let providerUrl: string
  let provider: SelfProvider<Pools>

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
  })

  beforeEach(() => {
    provider = new SelfProvider(
      Pools,
      POOLS_ETH_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
  })

  describe('Constant Variables', () => {
    it('get usd token address', async () => {
      const usdTokenAddress = await provider.contract.USD_ADDRESS()

      expect(usdTokenAddress).toBe(USD_TOKEN_ADDRESS)
    })
  })

  describe('Views', () => {
    it('get a pool by id', async () => {
      const pool = await provider.contract.getPool(BigInt(0))

      const coldPoolData = {
        softCap: pool.softCap,
        hardCap: pool.hardCap,
        deadline: pool.deadline
      }

      expect({
        softCap: BigInt(230),
        hardCap: BigInt(300),
        deadline: BigInt(1911925999)
      }).toEqual(coldPoolData)
    })

    it('get error because wrong pool id', async () => {
      await expect(
        provider.contract.getPool(BigInt(EDGE_BIGINT))
      ).rejects.toThrow(`Pool id ${EDGE_BIGINT.toString()} does not exist`)
    })
  })

  it('creates a pool', async () => {
    await provider.contract.createPool({
      softCap: BigInt(230),
      hardCap: BigInt(300),
      deadline: BigInt(1911925999),
      collateralTokens: [
        {
          contractAddress: USD_TOKEN_ADDRESS,
          amount: BigInt(500),
          id: null
        }
      ]
    })

    expect(true).toBe(true)
  })
})