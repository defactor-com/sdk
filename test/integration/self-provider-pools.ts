import { isAddress, isError } from 'ethers'

import { Erc20 } from '../../src'
import {
  cppErrorMessage,
  poolCommonErrorMessage
} from '../../src/error-messages'
import { Pools } from '../../src/pools'
import { SelfProvider } from '../../src/self-provider'
import { PoolInput } from '../../src/types/pools'
import {
  COLLATERAL_ERC20_TOKENS,
  MAX_BIGINT,
  POOLS_ETH_ADDRESS,
  TESTING_PRIVATE_KEY,
  USD_TOKEN_ADDRESS,
  approveCollateral,
  approveCreationFee,
  getRandomERC20Collaterals,
  getUnixEpochTimeInFuture,
  loadEnv,
  waitUntilConfirmationCompleted
} from '../test-util'

jest.setTimeout(50000)

describe('SelfProvider - Pools', () => {
  let provider: SelfProvider<Pools>
  let signerAddress: string
  let usdcTokenContract: Erc20
  const POOL_FEE = BigInt(200_000000)
  const firstPool: PoolInput = {
    softCap: BigInt(1_000000),
    hardCap: BigInt(5_000000),
    deadline: BigInt(getUnixEpochTimeInFuture(BigInt(86400 * 90))),
    collateralTokens: []
  }

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    usdcTokenContract = new Erc20(
      USD_TOKEN_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
    )

    provider = new SelfProvider(
      Pools,
      POOLS_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
    )

    signerAddress = provider.contract.signer?.address || ''

    if (!signerAddress) {
      throw new Error('signer address is not defined')
    }

    for (const collateral of COLLATERAL_ERC20_TOKENS) {
      if (!isAddress(collateral.address) || collateral.precision <= 0) {
        throw new Error(`the collateral ${collateral.address} is invalid`)
      }
    }

    const usdcApproved = await usdcTokenContract.allowance(
      signerAddress,
      provider.contract.address
    )

    if (usdcApproved >= POOL_FEE) {
      throw new Error(
        `the contract already has an allowance of ${usdcApproved / BigInt(10 ** 6)} USDC`
      )
    }
  })

  describe('Constant Variables', () => {
    it('success - get usd token address', async () => {
      const usdTokenAddress = await provider.contract.USD_ADDRESS()

      expect(usdTokenAddress).toBe(USD_TOKEN_ADDRESS)
    })
  })

  describe('Functions', () => {
    describe('createPool()', () => {
      it('failure - softCap no positive', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(-10_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.noNegativeSoftCapOrZero)
      })
      it('failure - hardCap is less than softCap', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(10_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.softCapMustBeLessThanHardCap)
      })
      it('failure - deadline is in the past', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.deadlineMustBeInFuture)
      })
      it('failure - one or more collateral token has invalid addresses', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            collateralTokens: [
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: BigInt(1_000000),
                id: null
              },
              {
                contractAddress: '0x7h1541v4l1d3x4mpl30f4n4ddr35537h3r3umn37',
                amount: BigInt(1_000000),
                id: null
              },
              {
                contractAddress: '0xInvalidAddress',
                amount: BigInt(1_000000),
                id: null
              }
            ]
          })
        ).rejects.toThrow(poolCommonErrorMessage.wrongAddressFormat)
      })
      it('failure - one or more collateral token has invalid amounts', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            collateralTokens: [
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: BigInt(1_000000),
                id: null
              },
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: BigInt(-1_000000),
                id: null
              }
            ]
          })
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })
      it('failure - the amount of 200 fee base tokens (USDC) was not approved', async () => {
        expect.assertions(1)

        const usdcApproved = await usdcTokenContract.allowance(
          signerAddress,
          provider.contract.address
        )

        if (usdcApproved >= POOL_FEE) return

        try {
          await provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            collateralTokens: []
          })
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('failure - the amount of one or more collateral token was not approved', async () => {
        expect.assertions(1)

        const collateralAmount = BigInt(5_000000)

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const usdcApproved = await usdcTokenContract.allowance(
          signerAddress,
          provider.contract.address
        )

        if (usdcApproved >= POOL_FEE + collateralAmount) return

        try {
          await provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: getUnixEpochTimeInFuture(BigInt(60)),
            collateralTokens: [
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: collateralAmount,
                id: null
              }
            ]
          })
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('failure - the amount to transfer exceeds balance', async () => {
        expect.assertions(1)
        try {
          const balance = await usdcTokenContract.balanceOf(signerAddress)

          await provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            collateralTokens: [
              {
                contractAddress: USD_TOKEN_ADDRESS,
                amount: BigInt(balance + BigInt(10 ** 6)),
                id: null
              }
            ]
          })
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('success - without collaterals', async () => {
        expect.assertions(1)

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const tx = await provider.contract.createPool(firstPool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
      it('success - softCap is equal to hardCap', async () => {
        expect.assertions(1)

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const tx = await provider.contract.createPool({
          softCap: BigInt(5_000000),
          hardCap: BigInt(5_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(86400 * 90)),
          collateralTokens: []
        })

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
      it('success - many collateral amounts of the same token (USDC)', async () => {
        expect.assertions(1)

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const collaterals = [1, 2, 1].map(amount => ({
          contractAddress: USD_TOKEN_ADDRESS,
          amount: BigInt(amount * 10 ** 6),
          id: null
        }))

        await approveCollateral(provider, signerAddress, collaterals, POOL_FEE)

        const tx = await provider.contract.createPool({
          softCap: BigInt(3_000000),
          hardCap: BigInt(6_000000),
          deadline: BigInt(getUnixEpochTimeInFuture(BigInt(86400 * 90))),
          collateralTokens: collaterals
        })

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
      it('success - different collaterals', async () => {
        expect.assertions(1)

        const collaterals = getRandomERC20Collaterals(5)

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )
        await approveCollateral(provider, signerAddress, collaterals, POOL_FEE)

        const tx = await provider.contract.createPool({
          softCap: BigInt(4_000000),
          hardCap: BigInt(10_000000),
          deadline: BigInt(getUnixEpochTimeInFuture(BigInt(86400 * 90))),
          collateralTokens: collaterals
        })

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
    })

    describe('commitToPool()', () => {
      it('failure - non-existed pool', async () => {
        await expect(
          provider.contract.commitToPool(BigInt(MAX_BIGINT), BigInt(1_000000))
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - amount no positive', async () => {
        await expect(
          provider.contract.commitToPool(BigInt(1), BigInt(-15_000000))
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })
      it('failure - deadline has passed', async () => {
        await expect(
          provider.contract.commitToPool(BigInt(0), BigInt(1_000000))
        ).rejects.toThrow(cppErrorMessage.deadlineReached)
      })
      it('failure - amount was not approved', async () => {
        expect.assertions(1)
        try {
          await provider.contract.commitToPool(BigInt(1), BigInt(1_000000))
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
    })
  })

  describe('Views', () => {
    describe('getPool()', () => {
      it('failure - wrong pool id', async () => {
        await expect(
          provider.contract.getPool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(`Pool id ${MAX_BIGINT.toString()} does not exist`)
      })
      it('success - get a pool by id', async () => {
        const pool = await provider.contract.getPool(BigInt(0))

        const coldPoolData = {
          softCap: pool.softCap,
          hardCap: pool.hardCap,
          deadline: pool.deadline,
          collateralTokens: Array.isArray(pool.collateralToken)
            ? pool.collateralToken
            : []
        }

        expect(firstPool).toEqual(coldPoolData)
      })
    })
    describe('getPools()', () => {
      it('success - fetch pools by pagination', async () => {
        const { data: pools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(1)
        )
        expect(pools.length).toBe(1)

        const { data: tempPools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(10)
        )

        expect(tempPools.length).toBe(4)

        const { data: tempPools2 } = await provider.contract.getPools(
          BigInt(20),
          BigInt(10)
        )

        expect(tempPools2.length).toBe(0)
      })
      it('success - offset exceeds total pools', async () => {
        const { data: pools } = await provider.contract.getPools(
          MAX_BIGINT,
          BigInt(10)
        )

        expect(pools.length).toBe(0)
      })
    })
  })
})
