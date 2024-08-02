import { isAddress, isError } from 'ethers'
import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import {
  commonErrorMessage,
  counterPartyPoolErrorMessage as cppErrorMessage,
  poolCommonErrorMessage
} from '../../src/errors'
import { AdminPools } from '../../src/pools/admin-pools'
import { SelfProvider } from '../../src/provider'
import { PoolInput, PoolStatusOption } from '../../src/types/pools'
import {
  ADMIN_POOLS_ETH_ADDRESS,
  ADMIN_TESTING_PRIVATE_KEY,
  COLLATERAL_ERC20_TOKENS,
  ONE_DAY_MS,
  ONE_DAY_SEC,
  ONE_YEAR_SEC,
  TESTING_PRIVATE_KEY,
  USD_TOKEN_ADDRESS,
  approveCollateral,
  approveTokenAmount,
  getRandomERC20Collaterals,
  getUnixEpochTimeInFuture,
  loadEnv,
  setPause,
  waitUntilConfirmationCompleted,
  waitUntilEpochPasses
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Admin Pools', () => {
  let provider: SelfProvider<AdminPools>
  let notAdminProvider: SelfProvider<AdminPools>
  let signerAddress: string
  let usdcTokenContract: Erc20
  let POOL_FEE: bigint

  const firstPool: PoolInput = {
    softCap: BigInt(1_000000),
    hardCap: BigInt(5_000000),
    deadline: BigInt(getUnixEpochTimeInFuture(BigInt(ONE_DAY_SEC * 30))),
    minimumAPR: BigInt(2_000000),
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
      null
    )

    provider = new SelfProvider(
      AdminPools,
      ADMIN_POOLS_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      ADMIN_TESTING_PRIVATE_KEY
    )

    notAdminProvider = new SelfProvider(
      AdminPools,
      ADMIN_POOLS_ETH_ADDRESS,
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

    POOL_FEE = provider.contract.POOL_FEE

    await setPause(provider, false)
    await approveTokenAmount(usdcTokenContract, provider, BigInt(0))
  })

  beforeEach(() => {
    timekeeper.reset()
  })

  describe.skip('Constant Variables', () => {
    it('success - get usd token address', async () => {
      const usdTokenAddress = await provider.contract.USD_ADDRESS()

      expect(usdTokenAddress).toBe(USD_TOKEN_ADDRESS)
    })
  })

  describe.skip('Admin Functions', () => {
    describe('pause()', () => {
      it('failure - the signer is not admin', async () => {
        expect.assertions(1)

        await expect(notAdminProvider.contract.pause()).rejects.toThrow(
          commonErrorMessage.addressIsNotAdmin
        )
      })
      it('success - pause contract', async () => {
        expect.assertions(1)

        const tx = await provider.contract.pause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        const isPaused = await provider.contract.isPaused()

        expect(isPaused).toBe(true)
      })
    })
    describe('unpause()', () => {
      it('failure - the signer is not admin', async () => {
        expect.assertions(1)

        await expect(notAdminProvider.contract.unpause()).rejects.toThrow(
          commonErrorMessage.addressIsNotAdmin
        )
      })
      it('success - unpause the contract', async () => {
        expect.assertions(1)

        const tx = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        const isPaused = await provider.contract.isPaused()

        expect(isPaused).toBe(false)
      })
    })
  })

  describe.skip('Functions', () => {
    describe('createPool()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(provider.contract.createPool(firstPool)).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )
        await setPause(provider, false)
      })
      it('failure - softCap no positive', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(-10_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            minimumAPR: BigInt(2_000000),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.noNegativeSoftCap)
      })
      it('failure - minimumAPR is negative', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            minimumAPR: BigInt(-2_000000),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.noNegativeMinimumAPR)
      })
      it('failure - hardCap is less than softCap', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(10_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(1715269435),
            minimumAPR: BigInt(2_000000),
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
            minimumAPR: BigInt(2_000000),
            collateralTokens: []
          })
        ).rejects.toThrow(cppErrorMessage.deadlineMustBeInFuture)
      })
      it('failure - deadline is more than one year in the future', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(
              getUnixEpochTimeInFuture(BigInt(ONE_YEAR_SEC + 60))
            ),
            minimumAPR: BigInt(2_000000),
            collateralTokens: []
          })
        ).rejects.toThrow(
          cppErrorMessage.deadlineMustNotBeMoreThan1YearInTheFuture
        )
      })
      it('failure - one or more collateral token has invalid addresses', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            minimumAPR: BigInt(2_000000),
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
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - one or more collateral token has invalid amounts', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            minimumAPR: BigInt(2_000000),
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
      it('failure - the amount of one or more collateral token was not approved', async () => {
        const collateralAmount = BigInt(5_000000)

        await approveTokenAmount(usdcTokenContract, provider, BigInt(0))

        expect.assertions(1)

        try {
          await provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: getUnixEpochTimeInFuture(BigInt(60)),
            minimumAPR: BigInt(2_000000),
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
            minimumAPR: BigInt(2_000000),
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
      it('failure - the signer is not the admin', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            minimumAPR: BigInt(2_000000),
            collateralTokens: []
          })
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('success - without collaterals', async () => {
        expect.assertions(1)

        const tx = await provider.contract.createPool(firstPool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
      it('success - softCap is equal to hardCap', async () => {
        expect.assertions(1)

        const tx = await provider.contract.createPool({
          softCap: BigInt(5_000000),
          hardCap: BigInt(5_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(ONE_DAY_SEC * 90)),
          minimumAPR: BigInt(2_000000),
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

        const collaterals = [1, 2, 1].map(amount => ({
          contractAddress: USD_TOKEN_ADDRESS,
          amount: BigInt(amount * 10 ** 6),
          id: null
        }))

        await approveCollateral(provider, signerAddress, collaterals, POOL_FEE)

        const tx = await provider.contract.createPool({
          softCap: BigInt(3_000000),
          hardCap: BigInt(6_000000),
          deadline: BigInt(getUnixEpochTimeInFuture(BigInt(ONE_DAY_SEC * 90))),
          minimumAPR: BigInt(2_000000),
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

        await approveCollateral(provider, signerAddress, collaterals, POOL_FEE)

        const tx = await provider.contract.createPool({
          softCap: BigInt(4_000000),
          hardCap: BigInt(10_000000),
          deadline: BigInt(getUnixEpochTimeInFuture(BigInt(ONE_DAY_SEC * 90))),
          minimumAPR: BigInt(2_000000),
          collateralTokens: collaterals
        })

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
    })

    describe('collectPool()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(provider.contract.collectPool(BigInt(1))).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )
        await setPause(provider, false)
      })
      it('failure - the signer is not the admin', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.collectPool(BigInt(1))
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('success - collect from a pool which deadline is not reached and softCap was reached', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(5_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(ONE_DAY_SEC)),
          minimumAPR: BigInt(1_000000),
          collateralTokens: []
        }

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        const amount = BigInt(1_000000)

        await approveTokenAmount(usdcTokenContract, notAdminProvider, amount)

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amount
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. COLLECT FROM POOL
        expect.assertions(1)

        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          collectPoolTx
        )

        expect(true).toBe(true)
      })
      it('success - collect from a pool which deadline was reached and softCap is not reached', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(3_000000),
          hardCap: BigInt(5_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(1_000000),
          collateralTokens: []
        }

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        const amount = BigInt(1_000000)

        await approveTokenAmount(usdcTokenContract, notAdminProvider, amount)

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amount
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 4. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 3. COLLECT FROM POOL
        expect.assertions(1)

        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          collectPoolTx
        )

        expect(true).toBe(true)
      })
      it('failure - status is different to CREATED', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        expect.assertions(1)
        await expect(provider.contract.collectPool(poolId)).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
            PoolStatusOption.CREATED
          ])
        )
      })
    })

    describe('depositRewards()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(
          provider.contract.depositRewards(BigInt(1), BigInt(1_000000))
        ).rejects.toThrow(commonErrorMessage.contractIsPaused)
        await setPause(provider, false)
      })
      it('failure - the signer is not the admin', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.depositRewards(BigInt(1), BigInt(1_000000))
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('success - deposit $2 rewards', async () => {
        expect.assertions(1)

        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amount = BigInt(2_000000)

        await approveTokenAmount(usdcTokenContract, provider, amount)

        const tx = await provider.contract.depositRewards(poolId, amount)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
    })

    describe('closePool()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(provider.contract.closePool(BigInt(1))).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )
        await setPause(provider, false)
      })
      it('failure - the signer is not the admin', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.closePool(BigInt(1))
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('failure - status is different than ACTIVE', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)

        // TRY TO CLOSE A CREATED POOL
        expect.assertions(1)
        await expect(provider.contract.closePool(poolId)).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
            PoolStatusOption.ACTIVE
          ])
        )
      })
      it('success - close an ACTIVE Pool with enough deposited rewards', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)

        const closePoolTx = await provider.contract.closePool(poolId)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          closePoolTx
        )

        expect(true).toBe(true)
      })
    })

    describe('archivePool()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(provider.contract.archivePool(BigInt(1))).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )
        await setPause(provider, false)
      })
      it('failure - the signer is not the admin', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.archivePool(BigInt(1))
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('failure - status is different than CLOSED', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)

        // TRY TO CLOSE A CREATED POOL
        expect.assertions(1)
        await expect(provider.contract.archivePool(poolId)).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
            PoolStatusOption.CLOSED
          ])
        )
      })
      it('success - archive the pool', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        // STEP 1. CLAIM REWARDS
        const claimTx = await notAdminProvider.contract.claim(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          claimTx
        )

        // STEP 2. SIMULATE THAT THE MIN CLOSE TIME HAS PASSED
        const maxDays = Number(provider.contract.MIN_POOL_CLOSED_DAYS)
        const closedTimeMs = Number(pool.closedTime) * 1000
        const collectTimeHasPassed = closedTimeMs + ONE_DAY_MS * maxDays + 500

        timekeeper.travel(new Date(collectTimeHasPassed))

        // STEP 3. ARCHIVE THE POOL
        try {
          await provider.contract.archivePool(poolId)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }

        timekeeper.reset()
      })
    })
  })

  describe('Views', () => {
    describe('getPool()', () => {
      it('success - get a pool by id', async () => {
        expect.assertions(1)

        const pool = await provider.contract.getPool(BigInt(0))
        const coldPoolData = {
          softCap: pool.softCap,
          hardCap: pool.hardCap,
          deadline: pool.deadline,
          minimumAPR: pool.minimumAPR,
          collateralTokens: pool.collateralTokens
        }

        expect(firstPool).toEqual(coldPoolData)
      })
    })
  })
})
