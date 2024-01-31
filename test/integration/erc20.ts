import { Erc20 } from '../../src/erc20'
import { ERC20CollateralPool } from '../../src/erc20-collateral-pool'
import { SelfProvider } from '../../src/self-provider'
import { sleep } from '../../src/util'
import {
  ERC20_COLLATERAL_POOL_ETH_ADDRESS,
  TESTING_PRIVATE_KEY,
  TESTING_PUBLIC_KEY,
  USD_TOKEN_ADDRESS,
  loadEnv
} from '../test-util'

jest.setTimeout(50000)

describe('SelfProvider - ERC20CollateralPool', () => {
  let providerUrl: string
  let provider: SelfProvider<ERC20CollateralPool>
  let erc20Contract: Erc20

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    providerUrl = process.env.PROVIDER_URL
    erc20Contract = new Erc20(
      USD_TOKEN_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
  })

  beforeEach(() => {
    provider = new SelfProvider(
      ERC20CollateralPool,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      providerUrl,
      TESTING_PRIVATE_KEY
    )
  })

  describe('ERC20 Token Standard', () => {
    it('failure - wrong address format', async () => {
      await expect(
        erc20Contract.approve('0xinvalid', BigInt(10))
      ).rejects.toThrow(
        `Collateral token does not follow the ethereum address format`
      )
    })

    it('failure - amount is equal to 0 or negative', async () => {
      const approveAmount = BigInt(0)
      const negativeApproveAmount = BigInt(-10)

      await expect(
        erc20Contract.approve(TESTING_PUBLIC_KEY, approveAmount)
      ).rejects.toThrow(`Amount cannot be negative or 0`)

      await expect(
        erc20Contract.approve(TESTING_PUBLIC_KEY, negativeApproveAmount)
      ).rejects.toThrow(`Amount cannot be negative or 0`)
    })

    it('success - approve and transfer amount', async () => {
      const approveAmount = BigInt(5_000000)

      await erc20Contract.approve(provider.contract.address, approveAmount)
      await sleep(3000)

      const trx = await provider.contract.lend(BigInt(0), approveAmount)

      expect({
        to: trx.to,
        from: trx.from
      }).toEqual({
        to: ERC20_COLLATERAL_POOL_ETH_ADDRESS,
        from: TESTING_PUBLIC_KEY
      })
    })
  })
})
