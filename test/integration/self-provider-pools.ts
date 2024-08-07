import { isAddress, isError } from 'ethers'
import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import {
  commonErrorMessage,
  counterPartyPoolErrorMessage as cppErrorMessage,
  poolCommonErrorMessage
} from '../../src/errors'
import { Pools } from '../../src/pools'
import { SelfProvider } from '../../src/provider'
import { PoolInput, PoolStatusOption } from '../../src/types/pools'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  COLLATERAL_ERC20_TOKENS,
  MAX_BIGINT,
  ONE_DAY_MS,
  ONE_DAY_SEC,
  ONE_YEAR_SEC,
  POOLS_ETH_ADDRESS,
  SECOND_TESTING_PRIVATE_KEY,
  TESTING_PRIVATE_KEY,
  USD_TOKEN_ADDRESS,
  approveCollateral,
  approveCreationFee,
  approveTokenAmount,
  getRandomERC20Collaterals,
  getUnixEpochTimeInFuture,
  loadEnv,
  setPause,
  waitUntilConfirmationCompleted,
  waitUntilEpochPasses
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Pools', () => {
  let provider: SelfProvider<Pools>
  let notAdminProvider: SelfProvider<Pools>
  let anotherNotAdminProvider: SelfProvider<Pools>
  let signerAddress: string
  let usdcTokenContract: Erc20
  let POOL_FEE: bigint

  const firstPool: PoolInput = {
    softCap: BigInt(1_000000),
    hardCap: BigInt(5_000000),
    deadline: BigInt(getUnixEpochTimeInFuture(BigInt(120))),
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
      Pools,
      POOLS_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      ADMIN_TESTING_PRIVATE_KEY
    )

    notAdminProvider = new SelfProvider(
      Pools,
      POOLS_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
    )

    anotherNotAdminProvider = new SelfProvider(
      Pools,
      POOLS_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      SECOND_TESTING_PRIVATE_KEY
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

  describe('Constant Variables', () => {
    it('success - get usd token address', async () => {
      const usdTokenAddress = await provider.contract.USD_ADDRESS()

      expect(usdTokenAddress).toBe(USD_TOKEN_ADDRESS)
    })
  })

  describe('Admin Functions', () => {
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

  describe('Functions', () => {
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
      it('failure - the amount of 200 fee base tokens (USDC) was not approved', async () => {
        await approveTokenAmount(usdcTokenContract, provider, BigInt(0))

        expect.assertions(1)

        try {
          await provider.contract.createPool({
            softCap: BigInt(1_000000),
            hardCap: BigInt(5_000000),
            deadline: BigInt(getUnixEpochTimeInFuture(BigInt(60))),
            minimumAPR: BigInt(2_000000),
            collateralTokens: []
          })
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('failure - the amount of one or more collateral token was not approved', async () => {
        const collateralAmount = BigInt(5_000000)

        await approveTokenAmount(usdcTokenContract, provider, BigInt(0))
        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

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

    describe('commitToPool()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(
          notAdminProvider.contract.commitToPool(BigInt(1), BigInt(1_000000))
        ).rejects.toThrow(commonErrorMessage.contractIsPaused)
        await setPause(provider, false)
      })
      it('failure - non-existed pool', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.commitToPool(
            BigInt(MAX_BIGINT),
            BigInt(1_000000)
          )
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - the signer is the owner of the pool', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.commitToPool(BigInt(1), BigInt(1_000000))
        ).rejects.toThrow(cppErrorMessage.poolOwnerCannotCommitToTheirOwnPool)
      })
      it('failure - amount no positive', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.commitToPool(BigInt(1), BigInt(-15_000000))
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })
      it('failure - deadline has passed', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)

        await waitUntilEpochPasses(pool.deadline, BigInt(180))

        expect.assertions(1)
        await expect(
          notAdminProvider.contract.commitToPool(poolId, BigInt(1_000000))
        ).rejects.toThrow(cppErrorMessage.deadlineReached)
      })
      it('failure - amount was not approved', async () => {
        const amount = BigInt(1_000000)

        await approveTokenAmount(usdcTokenContract, notAdminProvider, BigInt(0))

        expect.assertions(1)

        try {
          await notAdminProvider.contract.commitToPool(BigInt(1), amount)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('failure - amount exceeds the hardCap', async () => {
        expect.assertions(1)

        const poolId = BigInt(1)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.hardCap + BigInt(1_000000)

        await expect(
          notAdminProvider.contract.commitToPool(poolId, amount)
        ).rejects.toThrow(cppErrorMessage.amountExceedsHardCap)
      })
      it('success - commit to pool', async () => {
        const poolId = BigInt(1)
        const amount = BigInt(2_000000)

        expect.assertions(1)

        await approveTokenAmount(usdcTokenContract, notAdminProvider, amount)

        const tx = await notAdminProvider.contract.commitToPool(poolId, amount)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
      it('failure - amount plus total committed exceeds the hardCap', async () => {
        expect.assertions(1)

        const poolId = BigInt(1)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.hardCap + BigInt(1_000000) - pool.totalCommitted

        await expect(
          notAdminProvider.contract.commitToPool(poolId, amount)
        ).rejects.toThrow(cppErrorMessage.amountExceedsHardCap)
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
      it('failure - non-existed pool', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.collectPool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - not owner address', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.collectPool(BigInt(1))
        ).rejects.toThrow(cppErrorMessage.addressIsNotOwner)
      })
      it('failure - softCap not reached', async () => {
        expect.assertions(1)
        await expect(provider.contract.collectPool(BigInt(2))).rejects.toThrow(
          cppErrorMessage.softCapNotReached
        )
      })
      it('failure - deadline not reached', async () => {
        expect.assertions(1)
        await expect(provider.contract.collectPool(BigInt(1))).rejects.toThrow(
          cppErrorMessage.deadlineNotReached
        )
      })
      it('failure - after deadline + 30 days', async () => {
        const poolId = BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        const maxDays = Number(provider.contract.COLLECT_POOL_MAX_DAYS)
        const deadlineMs = Number(pool.deadline) * 1000
        const invalidCollectTimeMs = deadlineMs + ONE_DAY_MS * maxDays + 500

        timekeeper.travel(new Date(invalidCollectTimeMs))

        expect.assertions(1)
        await expect(provider.contract.collectPool(poolId)).rejects.toThrow(
          cppErrorMessage.cannotCollectDaysAfterDeadline(
            provider.contract.COLLECT_POOL_MAX_DAYS
          )
        )

        timekeeper.reset()
      })
      it('success - collectPool', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

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

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL
        expect.assertions(1)

        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
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

    describe('commitToPool()', () => {
      it('failure - status is different to CREATED', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        expect.assertions(1)
        await expect(
          notAdminProvider.contract.commitToPool(poolId, BigInt(1_000000))
        ).rejects.toThrow(
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
      it('failure - non-existed pool', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.depositRewards(BigInt(MAX_BIGINT), BigInt(1_000000))
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - amount is not positive', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.depositRewards(BigInt(1), BigInt(-1_000000))
        ).rejects.toThrow(poolCommonErrorMessage.noNegativeAmountOrZero)
      })
      it('failure - not owner address', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.depositRewards(BigInt(1), BigInt(1_000000))
        ).rejects.toThrow(cppErrorMessage.addressIsNotOwner)
      })
      it('failure - status is different to ACTIVE', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)

        expect.assertions(1)
        await expect(
          provider.contract.depositRewards(poolId, BigInt(1_000000))
        ).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
            PoolStatusOption.ACTIVE
          ])
        )
      })
      it('failure - amount was not approved', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amount = BigInt(1_000000)

        await approveTokenAmount(usdcTokenContract, provider, BigInt(0))

        expect.assertions(1)

        try {
          await provider.contract.depositRewards(poolId, amount)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('success - deposit $100 rewards', async () => {
        expect.assertions(1)

        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amount = BigInt(100_000000)

        await approveTokenAmount(usdcTokenContract, provider, amount)

        const tx = await provider.contract.depositRewards(poolId, amount)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        expect(true).toBe(true)
      })
      it('success - deposit $1000 rewards', async () => {
        expect.assertions(1)

        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amount = BigInt(1000_000000)

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
      it('failure - non-existed pool', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.closePool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - not owner address', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.closePool(BigInt(1))
        ).rejects.toThrow(cppErrorMessage.addressIsNotOwner)
      })
      it('failure - status is different than CREATED or ACTIVE', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        // STEP 1. CLOSE THE POOL (IT CHANGES POOL STATUS FROM ACTIVE TO CLOSED)
        const closePoolTx = await provider.contract.closePool(poolId)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          closePoolTx
        )

        // TRY TO CLOSE AN ALREADY CLOSED POOL
        expect.assertions(1)
        await expect(provider.contract.closePool(poolId)).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
            PoolStatusOption.CREATED,
            PoolStatusOption.ACTIVE
          ])
        )
      })
      it('failure - status is CREATED and deadline not reached', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. TRY TO CLOSE THE POOL BEFORE THE DEADLINE HAS PASSED
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)
        await expect(provider.contract.closePool(poolId)).rejects.toThrow(
          cppErrorMessage.deadlineNotReached
        )
      }, 600000)
      it('failure - status is CREATED, soft cap reached and max collect time has not passed', async () => {
        // STEP 1. GET LAST POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        // STEP 2. COMMIT TO POOL MORE THAN SOFT CAP
        const amount = pool.softCap + BigInt(1_000000)

        await approveTokenAmount(usdcTokenContract, notAdminProvider, amount)

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amount
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. TRY TO CLOSE THE POOL BEFORE MAX COLLECT TIME HAS NOT PASSED
        expect.assertions(1)
        await expect(provider.contract.closePool(poolId)).rejects.toThrow(
          cppErrorMessage.softCapReached
        )
      }, 600000)
      it('failure - status is ACTIVE and the deposited amount is zero', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

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

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. TRY TO CLOSE THE POOL WITHOUT DEPOSIT REWARDS
        expect.assertions(1)
        await expect(provider.contract.closePool(poolId)).rejects.toThrow(
          cppErrorMessage.mustDepositAtLeastCommittedAmount
        )
      }, 600000)
      it('failure - status is ACTIVE and the deposited amount is less than the committed amount', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(2_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amount = BigInt(2_000000)

        await approveTokenAmount(usdcTokenContract, notAdminProvider, amount)

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amount
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. DEPOSITS LESS THAN TOTAL COMMITTED
        const amountToDeposit = BigInt(1_000000)

        await approveTokenAmount(usdcTokenContract, provider, amountToDeposit)

        const depositRewardsTx = await provider.contract.depositRewards(
          poolId,
          amountToDeposit
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          depositRewardsTx
        )

        // STEP 5. TRY TO CLOSE THE POOL
        expect.assertions(1)
        await expect(provider.contract.closePool(poolId)).rejects.toThrow(
          cppErrorMessage.mustDepositAtLeastCommittedAmount
        )
      }, 600000)
      it('success - status is CREATED and max collect time has passed, close the pool', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(120)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. SIMULATE THAT THE MAX COLLECT TIME HAS PASSED
        const maxDays = Number(provider.contract.COLLECT_POOL_MAX_DAYS)
        const deadlineMs = Number(pool.deadline) * 1000
        const collectTimeHasPassed = deadlineMs + ONE_DAY_MS * maxDays + 500

        timekeeper.travel(new Date(collectTimeHasPassed))

        // STEP 3. CLOSE THE POOL BEFORE THE MAX COLLECT TIME HAS PASSED
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)

        try {
          await provider.contract.closePool(poolId)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }

        timekeeper.reset()
      }, 600000)
      it('success - status is ACTIVE and pool owner has deposited enough rewards, close pool', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        expect.assertions(1)

        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. DEPOSIT ENOUGH REWARDS TO EXCEED THE COMMITTED AMOUNT
        const amountToDeposit = BigInt(2_000000)

        await approveTokenAmount(usdcTokenContract, provider, amountToDeposit)

        const depositRewardsTx = await provider.contract.depositRewards(
          poolId,
          amountToDeposit
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          depositRewardsTx
        )

        // STEP 6. CLOSE THE POOL
        const closePoolTx = await provider.contract.closePool(poolId)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          closePoolTx
        )

        expect(true).toBe(true)
      }, 600000)
    })

    describe('claim()', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(
          notAdminProvider.contract.claim(BigInt(1))
        ).rejects.toThrow(commonErrorMessage.contractIsPaused)
        await setPause(provider, false)
      })
      it('failure - non-existed pool', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.claim(BigInt(MAX_BIGINT))
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - status is different than CLOSE or ACTIVE', async () => {
        // STEP 1. CREATE POOL
        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool({
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        })

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. TRY TO CLAIM AN CREATED POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        expect.assertions(1)
        await expect(notAdminProvider.contract.claim(poolId)).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
            PoolStatusOption.ACTIVE,
            PoolStatusOption.CLOSED
          ])
        )
      })
      it('failure - claim rewards from a pool without deposited rewards', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. TRY TO CLAIM WITHOUT DEPOSITED REWARDS
        expect.assertions(1)
        await expect(notAdminProvider.contract.claim(poolId)).rejects.toThrow(
          cppErrorMessage.poolHasNoRewards
        )
      }, 600000)
      it('failure - claim rewards from an already claimed pool', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. DEPOSIT ENOUGH REWARDS TO EXCEED THE COMMITTED AMOUNT
        const amountToDeposit = BigInt(2_000000)

        await approveTokenAmount(usdcTokenContract, provider, amountToDeposit)

        const depositRewardsTx = await provider.contract.depositRewards(
          poolId,
          amountToDeposit
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          depositRewardsTx
        )

        // STEP 6. CLAIM REWARDS
        const claimTx = await notAdminProvider.contract.claim(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          claimTx
        )

        // STEP 7. TRY TO CLAIM AGAIN
        expect.assertions(1)
        await expect(notAdminProvider.contract.claim(poolId)).rejects.toThrow(
          cppErrorMessage.poolAlreadyClaimed
        )
      }, 600000)
      it('failure - the owner of the pool cannot claim rewards', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)
        await expect(provider.contract.claim(poolId)).rejects.toThrow(
          cppErrorMessage.poolOwnerCannotClaimToTheirOwnPool
        )
      })
      it('failure - claim rewards before to commit', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)
        await expect(
          anotherNotAdminProvider.contract.claim(poolId)
        ).rejects.toThrow(cppErrorMessage.mustCommitBeforeClaim)
      })
      it('success - claim rewards from an ACTIVE pool', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        expect.assertions(1)

        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. DEPOSIT ENOUGH REWARDS TO EXCEED THE COMMITTED AMOUNT
        const amountToDeposit = BigInt(2_000000)

        await approveTokenAmount(usdcTokenContract, provider, amountToDeposit)

        const depositRewardsTx = await provider.contract.depositRewards(
          poolId,
          amountToDeposit
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          depositRewardsTx
        )

        // STEP 6. CLAIM REWARDS
        const claimTx = await notAdminProvider.contract.claim(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          claimTx
        )

        expect(true).toBe(true)
      }, 600000)
      it('success - claim rewards from an CLOSE pool', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. DEPOSIT ENOUGH REWARDS TO EXCEED THE COMMITTED AMOUNT
        const amountToDeposit = BigInt(2_000000)

        await approveTokenAmount(usdcTokenContract, provider, amountToDeposit)

        const depositRewardsTx = await provider.contract.depositRewards(
          poolId,
          amountToDeposit
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          depositRewardsTx
        )

        // STEP 6. CLOSE THE POOL
        const closePoolTx = await provider.contract.closePool(poolId)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          closePoolTx
        )

        // STEP 7. CLAIM REWARDS
        const claimTx = await notAdminProvider.contract.claim(poolId)

        expect.assertions(1)
        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          claimTx
        )

        expect(true).toBe(true)
      }, 600000)
    })

    describe('uncommitFromPool', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(
          notAdminProvider.contract.uncommitFromPool(BigInt(1))
        ).rejects.toThrow(commonErrorMessage.contractIsPaused)
        await setPause(provider, false)
      })
      it('failure - non-existed pool', async () => {
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.uncommitFromPool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - status is different to CREATED', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        expect.assertions(1)
        await expect(
          notAdminProvider.contract.uncommitFromPool(BigInt(poolId))
        ).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, pool.poolStatus, [
            PoolStatusOption.CREATED
          ])
        )
      })
      it('failure - the signer is the owner of the pool', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        // STEP 2. TRY TO UN-COMMIT AS THE OWNER OF THE POOL
        expect.assertions(1)
        await expect(
          provider.contract.uncommitFromPool(BigInt(poolId))
        ).rejects.toThrow(cppErrorMessage.poolOwnerCannotUncommitToTheirOwnPool)
      })
      it('failure - the user has no commit to the pool', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)
        await expect(
          notAdminProvider.contract.uncommitFromPool(BigInt(poolId))
        ).rejects.toThrow(cppErrorMessage.poolHasNoCommittedAmount)
      })
      it('failure - softCap is less than totalCommitted and deadline has been reached', async () => {
        // STEP 1. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)
        const amountToCommit = BigInt(2_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 2. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 3. TRY TO UN-COMMIT FROM POOL
        expect.assertions(1)
        await expect(
          notAdminProvider.contract.uncommitFromPool(BigInt(poolId))
        ).rejects.toThrow(cppErrorMessage.deadlineAndSoftCapReached)
      })
      it('success - status is CREATED and max collect time has passed', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        // STEP 1. SIMULATE THAT THE MAX COLLECT TIME HAS PASSED
        const maxDays = Number(provider.contract.COLLECT_POOL_MAX_DAYS)
        const deadlineMs = Number(pool.deadline) * 1000
        const collectTimeHasPassed = deadlineMs + ONE_DAY_MS * maxDays + 500

        timekeeper.travel(new Date(collectTimeHasPassed))

        // STEP 2. UN-COMMIT AFTER COLLECT TIME HAS PASSED
        try {
          await notAdminProvider.contract.uncommitFromPool(poolId)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }

        timekeeper.reset()
      })
      it('success - status is CREATED and soft cap is no reached and deadline reached', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(2_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. UN-COMMIT
        const uncommitFromPoolTx =
          await notAdminProvider.contract.uncommitFromPool(poolId)

        expect.assertions(1)
        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          uncommitFromPoolTx
        )

        expect(true).toBe(true)
      })
      it('success - status is CREATED and soft cap is reached and deadline not reached', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(120)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL TO REACH THE SOFT CAP
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. UN-COMMIT
        const uncommitFromPoolTx =
          await notAdminProvider.contract.uncommitFromPool(poolId)

        expect.assertions(1)
        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          uncommitFromPoolTx
        )

        expect(true).toBe(true)
      })
    })

    describe('archivePool', () => {
      it('failure - the contract is paused', async () => {
        expect.assertions(1)
        await setPause(provider, true)
        await expect(provider.contract.archivePool(BigInt(1))).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )
        await setPause(provider, false)
      })
      it('failure - non-existed pool', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.archivePool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(BigInt(MAX_BIGINT))
        )
      })
      it('failure - the signer is not the owner of the pool or the admin of the contract', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)
        await expect(
          notAdminProvider.contract.archivePool(BigInt(poolId))
        ).rejects.toThrow(cppErrorMessage.mustBeOwnerOrAdmin)
      })
      it('failure - status is not CREATED or CLOSED', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

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

        // STEP 3. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 4. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 5. TRY TO ARCHIVE THE ACTIVE POOL
        expect.assertions(1)
        await expect(provider.contract.archivePool(poolId)).rejects.toThrow(
          cppErrorMessage.poolStatusMustBe(poolId, PoolStatusOption.ACTIVE, [
            PoolStatusOption.CLOSED,
            PoolStatusOption.CREATED
          ])
        )
      }, 600000)
      it('failure - status is CREATED and total committed is not empty', async () => {
        // STEP 1. CREATE POOL
        const pool: PoolInput = {
          softCap: BigInt(1_000000),
          hardCap: BigInt(3_000000),
          deadline: getUnixEpochTimeInFuture(BigInt(60)),
          minimumAPR: BigInt(2_000000),
          collateralTokens: []
        }

        await approveCreationFee(
          usdcTokenContract,
          provider,
          signerAddress,
          POOL_FEE
        )

        const createPoolTx = await provider.contract.createPool(pool)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          createPoolTx
        )

        // STEP 2. COMMIT TO POOL
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const amountToCommit = BigInt(1_000000)

        await approveTokenAmount(
          usdcTokenContract,
          notAdminProvider,
          amountToCommit
        )

        const commitToPoolTx = await notAdminProvider.contract.commitToPool(
          poolId,
          amountToCommit
        )

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          commitToPoolTx
        )

        // STEP 3. SIMULATE THAT THE MIN CLOSE TIME HAS PASSED
        const maxDays = Number(provider.contract.MIN_POOL_CLOSED_DAYS)
        const deadlineMs = Number(pool.deadline) * 1000
        const collectTimeHasPassed = deadlineMs + ONE_DAY_MS * maxDays + 500

        timekeeper.travel(new Date(collectTimeHasPassed))

        // STEP 4. TRY TO ARCHIVE THE POOL WITH COMMITTED AMOUNT
        expect.assertions(1)
        await expect(provider.contract.archivePool(poolId)).rejects.toThrow(
          cppErrorMessage.committedAmountMustBeZero
        )

        timekeeper.reset()
      }, 600000)
      it('failure - status is CREATED and has not passed 60 days after deadline time', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)

        expect.assertions(1)
        await expect(provider.contract.archivePool(poolId)).rejects.toThrow(
          cppErrorMessage.cannotArchiveBeforeDeadline(
            provider.contract.MIN_POOL_CLOSED_DAYS
          )
        )
      })
      it('failure - status is CLOSED and has not passed 60 days after closed time', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        // STEP 1. WAIT UNTIL DEADLINE
        await waitUntilEpochPasses(pool.deadline, BigInt(60))

        // STEP 2. COLLECT FROM POOL (IT CHANGES POOL STATUS FROM CREATED TO ACTIVE)
        const collectPoolTx = await provider.contract.collectPool(poolId)

        await waitUntilConfirmationCompleted(
          notAdminProvider.contract.jsonRpcProvider,
          collectPoolTx
        )

        // STEP 3. DEPOSIT ENOUGH REWARDS TO EXCEED THE COMMITTED AMOUNT
        const amountToDeposit = BigInt(2_000000)

        await approveTokenAmount(usdcTokenContract, provider, amountToDeposit)

        const depositRewardsTx = await provider.contract.depositRewards(
          poolId,
          amountToDeposit
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          depositRewardsTx
        )

        // STEP 4. CLOSE THE POOL
        const closePoolTx = await provider.contract.closePool(poolId)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          closePoolTx
        )

        // STEP 5. TRY TO ARCHIVE THE POOL BEFORE 60 DAYS AFTER CLOSING TIME
        expect.assertions(1)
        await expect(provider.contract.archivePool(poolId)).rejects.toThrow(
          cppErrorMessage.cannotArchiveBeforeClosedTime(
            provider.contract.MIN_POOL_CLOSED_DAYS
          )
        )
      })
      it('failure - rewards has not been paid out', async () => {
        const poolIndex: bigint = await provider.contract.contract.poolIndex()
        const poolId = poolIndex - BigInt(1)
        const pool = await provider.contract.getPool(poolId)

        // STEP 1. SIMULATE THAT THE MIN CLOSE TIME HAS PASSED
        const maxDays = Number(provider.contract.MIN_POOL_CLOSED_DAYS)
        const closedTimeMs = Number(pool.closedTime) * 1000
        const collectTimeHasPassed = closedTimeMs + ONE_DAY_MS * maxDays + 500

        timekeeper.travel(new Date(collectTimeHasPassed))

        // STEP 2. TRY TO ARCHIVE THE POOL BEFORE PAY THE REWARDS
        expect.assertions(1)
        await expect(provider.contract.archivePool(poolId)).rejects.toThrow(
          cppErrorMessage.rewardsHaveNotYetBeenPaidOut
        )

        timekeeper.reset()
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
      it('failure - wrong pool id', async () => {
        expect.assertions(1)
        await expect(
          provider.contract.getPool(BigInt(MAX_BIGINT))
        ).rejects.toThrow(`Pool id ${MAX_BIGINT.toString()} does not exist`)
      })
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
    describe('getPools()', () => {
      it('success - fetch pools by pagination', async () => {
        expect.assertions(3)

        const { data: pools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(1)
        )
        expect(pools.length).toBe(1)

        const { data: tempPools } = await provider.contract.getPools(
          BigInt(0),
          BigInt(10)
        )

        expect(tempPools.length).toBe(5)

        const { data: tempPools2 } = await provider.contract.getPools(
          BigInt(20),
          BigInt(10)
        )

        expect(tempPools2.length).toBe(0)
      })
      it('success - offset exceeds total pools', async () => {
        expect.assertions(1)

        const { data: pools } = await provider.contract.getPools(
          MAX_BIGINT,
          BigInt(10)
        )

        expect(pools.length).toBe(0)
      })
    })
  })
})
