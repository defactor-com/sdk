import { ethers } from 'ethers'
import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import {
  commonErrorMessage,
  erc20CollateralPoolV2ErrorMessage as ecpErrorMessage,
  poolCommonErrorMessage
} from '../../src/errors'
import { ERC20CollateralPoolV2 } from '../../src/pools'
import { SelfProvider } from '../../src/provider'
import { InitPool } from '../../src/types/erc20-collateral-pool/v2'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  ERC20_COLLATERAL_POOL_ETH_ADDRESS,
  FACTR_TOKEN_ADDRESS,
  MAX_BIGINT,
  ONE_DAY_SEC,
  TESTING_PRIVATE_KEY,
  USD_TOKEN_ADDRESS,
  approveTokenAmount,
  getUnixEpochTime,
  loadEnv
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Staking', () => {
  let provider: SelfProvider<ERC20CollateralPoolV2>
  let notAdminProvider: SelfProvider<ERC20CollateralPoolV2>
  let signerAddress: string
  let usdcTokenContract: Erc20
  const initialPool: InitPool = {
    collateralToken: FACTR_TOKEN_ADDRESS,
    collateralTokenFactor: BigInt(100_00),
    collateralTokenLTVPercentage: BigInt(50_00),
    collateralTokenPriceOracle: ethers.ZeroAddress,
    collateralTokenSequencerOracle: ethers.ZeroAddress,
    endTime: BigInt(1774472070),
    interest: BigInt(5_00),
    maxPoolCapacity: BigInt(5000 * 10 ** 6),
    minBorrow: BigInt(100 * 10 ** 6),
    minLended: BigInt(100 * 10 ** 6)
  }

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    provider = new SelfProvider(
      ERC20CollateralPoolV2,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      ADMIN_TESTING_PRIVATE_KEY
    )

    notAdminProvider = new SelfProvider(
      ERC20CollateralPoolV2,
      ERC20_COLLATERAL_POOL_ETH_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
    )

    usdcTokenContract = new Erc20(
      USD_TOKEN_ADDRESS,
      provider.contract.apiUrl,
      null
    )

    signerAddress = provider.contract.signer?.address || ''

    if (!signerAddress) {
      throw new Error('signer address is not defined')
    }
  })

  beforeEach(() => {
    timekeeper.reset()
  })

  describe('Constant Variables', () => {
    it('success - bps divider', () => {
      expect(provider.contract.BPS_DIVIDER).toBe(BigInt('10000'))
    })
    it('success - one year', () => {
      expect(provider.contract.ONE_YEAR).toBe(BigInt(86400 * 365))
    })
    it('success - liquidation fee', () => {
      expect(provider.contract.LIQUIDATION_FEE).toBe(BigInt(10 * 10 ** 2))
    })
  })

  describe('Admin Functions', () => {
    describe('addPool', () => {
      it('failure - the signer is not admin', async () => {
        const res = notAdminProvider.contract.addPool(initialPool)

        await expect(res).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('failure - the collateral token is not an address', async () => {
        const res = provider.contract.addPool({
          ...initialPool,
          collateralToken: '0x'
        })

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the collateral token is the zero address', async () => {
        const res = provider.contract.addPool({
          ...initialPool,
          collateralToken: ethers.ZeroAddress
        })

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the oracle address is non a valid address', async () => {
        const res = provider.contract.addPool({
          ...initialPool,
          collateralTokenPriceOracle: '0xinvalid'
        })

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the end time is in the past', async () => {
        const res = provider.contract.addPool({
          ...initialPool,
          endTime: getUnixEpochTime() - BigInt(ONE_DAY_SEC * 365)
        })

        await expect(res).rejects.toThrow(ecpErrorMessage.timeMustBeInFuture)
      })
      it('failure - the max pool capacity is less than the min lended', async () => {
        const res = provider.contract.addPool({
          ...initialPool,
          minLended: initialPool.maxPoolCapacity * BigInt(2)
        })

        await expect(res).rejects.toThrow(
          ecpErrorMessage.minLentMustBeLessThanMaxPoolCapacity
        )
      })
      it('failure - collateral ltv is zero', async () => {
        const res = provider.contract.addPool({
          ...initialPool,
          collateralTokenLTVPercentage: BigInt(0)
        })

        await expect(res).rejects.toThrow(
          ecpErrorMessage.nonNegativeOrZeroCollateralTokenLTV
        )
      })
      it('failure - token percentage is greater than the ', async () => {
        const maxLVT = provider.contract.MAX_LTV_PERCENTAGE
        const res = provider.contract.addPool({
          ...initialPool,
          collateralTokenLTVPercentage:
            maxLVT + initialPool.collateralTokenLTVPercentage
        })

        await expect(res).rejects.toThrow(
          ecpErrorMessage.collateralTokenLTVTooHigh
        )
      })
      it.skip('success - create pool', async () => {
        const promise = provider.contract.addPool(initialPool)

        await expect(promise).resolves.not.toThrow()
      })
    })
    describe('announceEditPool', () => {
      it.skip('failure - the signer is not admin', async () => {
        const poolId = BigInt(0)
        const res = notAdminProvider.contract.announceEditPool(
          poolId,
          initialPool
        )

        await expect(res).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('failure - the pool does not exists', async () => {
        const poolId = BigInt(MAX_BIGINT)
        const res = provider.contract.announceEditPool(poolId, initialPool)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
    })
    describe('cancelEditPool', () => {
      it.skip('failure - the edit annoucement does not exists', async () => {
        const poolId = BigInt(BigInt(0))
        const res = provider.contract.cancelEditPool(poolId)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.poolAnnouncementIsLocked
        )
      })
    })
    describe('commitEditPool', () => {
      it.skip('failure - the edit annoucement is locked', async () => {
        const poolId = BigInt(BigInt(0))
        const res = provider.contract.commitEditPool(poolId)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.poolAnnouncementIsLocked
        )
      })
    })
    describe('withdrawProtocolRewards', () => {
      it.skip('failure - the address is not a collateral token', async () => {
        const tokenAddress = signerAddress
        const res = provider.contract.withdrawProtocolRewards(
          tokenAddress,
          signerAddress
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.collateralTokenDoesNotExist
        )
      })
    })
  })

  describe('Functions', () => {
    describe('Lend', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const amount = BigInt(1000 * 10 ** 6)
        const res = provider.contract.lend(poolId, amount)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the amount is less than min lended', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minLended / BigInt(4)
        const res = provider.contract.lend(poolId, amount)

        await expect(res).rejects.toThrow(ecpErrorMessage.amountTooLow)
      })
      it('failure - the amount overpass the pool capacity', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.maxPoolCapacity * BigInt(2)
        const res = provider.contract.lend(poolId, amount)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.maxPoolCapacityIsReached
        )
      })
      it('failure - the amount was not approved', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minLended
        const res = provider.contract.lend(poolId, amount)

        await expect(res).rejects.toThrow('ERC20: insufficient allowance')
      })
      it.skip('success - lend min amount', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minLended

        await approveTokenAmount(usdcTokenContract, provider, amount)

        await expect(
          provider.contract.lend(poolId, amount)
        ).resolves.not.toThrow()
      })
    })
  })

  describe('Views', () => {
    describe('getUsdc()', () => {
      it('success - get usdc', async () => {
        const usdc = await provider.contract.getUsdc()

        expect(usdc).toBe(USD_TOKEN_ADDRESS)
      })
      it('success - get oracles', async () => {
        const priceOracle = await provider.contract.getUsdcPriceOracle()
        const sequencerOracle = await provider.contract.getUsdcSequencerOracle()

        expect(ethers.isAddress(priceOracle)).toBe(true)
        expect(ethers.isAddress(sequencerOracle)).toBe(true)
      })
    })
    describe('getPool()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const res = provider.contract.getPool(poolId)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the id is negative', async () => {
        const poolId = BigInt(-1)
        const res = provider.contract.getPool(poolId)

        await expect(res).rejects.toThrow(commonErrorMessage.nonNegativeValue)
      })
      it('success - get the pool', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)

        expect(ethers.isAddress(pool.collateralDetails.collateralToken)).toBe(
          true
        )
        expect(pool.endTime).toBeGreaterThan(0)
      })
    })
    describe('getTotalPools()', () => {
      it('success - get total pools', async () => {
        const totalPools = await provider.contract.getTotalPools()

        expect(typeof totalPools).toBe('bigint')
        expect(totalPools).toBeGreaterThanOrEqual(0)
      })
    })
    describe('getPools()', () => {
      it('failure - the offset is negative', async () => {
        const offset = BigInt(-1)
        const limit = BigInt(0)
        const res = provider.contract.getPools(offset, limit)

        await expect(res).rejects.toThrow(ecpErrorMessage.noNegativeOffset)
      })
      it('failure - the limit is negative', async () => {
        const offset = BigInt(0)
        const limit = BigInt(-1)
        const res = provider.contract.getPools(offset, limit)

        await expect(res).rejects.toThrow(ecpErrorMessage.noNegativeLimitOrZero)
      })
      it('success - get all pools', async () => {
        const offset = BigInt(0)
        const limit = await provider.contract.getTotalPools()
        const res = await provider.contract.getPools(offset, limit)

        for (const pool of res.data) {
          expect(ethers.isAddress(pool.collateralDetails.collateralToken))
        }

        expect(res.more).toBe(false)
      })
      it('success - get half of the pools', async () => {
        const totalPools = await provider.contract.getTotalPools()
        const offset = BigInt(0)
        const limit = BigInt(Math.trunc(Number(totalPools) / 2))
        const res = await provider.contract.getPools(offset, limit)

        for (const pool of res.data) {
          expect(ethers.isAddress(pool.collateralDetails.collateralToken))
          expect(pool.endTime).toBeGreaterThan(0)
        }

        expect(res.more).toBe(true)
        expect(res.data.length).toBe(Number(limit))
      })
    })
    describe('getTotalLoans()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const res = provider.contract.getTotalLoansByUser(poolId, signerAddress)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the user address is not valid', async () => {
        const poolId = BigInt(0)
        const user = '0xinvalid'
        const res = provider.contract.getTotalLoansByUser(poolId, user)

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - get total loans', async () => {
        const poolId = BigInt(0)
        const totalLoans = await provider.contract.getTotalLoansByUser(
          poolId,
          signerAddress
        )

        expect(typeof totalLoans).toBe('bigint')
        expect(totalLoans).toBeGreaterThanOrEqual(0)
      })
    })
    describe('getLoansByLender()', () => {
      it('success - get all loans', async () => {
        const poolId = BigInt(0)
        const offset = BigInt(0)
        const limit = BigInt(1000)
        const res = await provider.contract.getLoansByLender(
          poolId,
          signerAddress,
          offset,
          limit
        )

        for (const loan of res.data) {
          expect(loan.usdcAmount).toBeGreaterThan(0)
        }

        expect(res.more).toBe(false)
      })
    })
    describe('calculateRewards()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const lendId = BigInt(0)
        const res = provider.contract.calculateReward(
          poolId,
          lendId,
          signerAddress
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the loan does not exists', async () => {
        const poolId = BigInt(0)
        const lendId = MAX_BIGINT
        const res = provider.contract.calculateReward(
          poolId,
          lendId,
          signerAddress
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistLendingId(lendId)
        )
      })
      it('failure - the address is not valid', async () => {
        const poolId = BigInt(0)
        const lendId = BigInt(0)
        const user = '0xInvalid'
        const res = provider.contract.calculateReward(poolId, lendId, user)

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - calculate rewards', async () => {
        const poolId = BigInt(0)
        const lendId = BigInt(0)
        const user = signerAddress
        const rewards = await provider.contract.calculateReward(
          poolId,
          lendId,
          user
        )

        expect(typeof rewards).toBe('bigint')
        expect(rewards).toBeGreaterThanOrEqual(0)
      })
    })
    describe('calculateCollateralTokenAmount()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const amount = BigInt(1000 * 10 ** 6)
        const res = provider.contract.calculateCollateralTokenAmount(
          poolId,
          amount
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - amount cannot be negative', async () => {
        const poolId = BigInt(0)
        const amount = BigInt(-1)
        const res = provider.contract.calculateCollateralTokenAmount(
          poolId,
          amount
        )

        await expect(res).rejects.toThrow(ecpErrorMessage.nonNegativeOrZero)
      })
      it('success - calculate collateral token amount', async () => {
        const poolId = BigInt(0)
        const amount = BigInt(100 * 10 ** 6)
        const collateralTokenAmount =
          await provider.contract.calculateCollateralTokenAmount(poolId, amount)

        expect(typeof collateralTokenAmount).toBe('bigint')
        expect(collateralTokenAmount).toBeGreaterThanOrEqual(0)
      })
    })
    describe('getCollateralTokens()', () => {
      it('success - get collateral tokens', async () => {
        const collateralTokens = await provider.contract.getCollateralTokens()

        for (const token of collateralTokens) {
          expect(ethers.isAddress(token)).toBe(true)
        }

        expect(collateralTokens).toContain(FACTR_TOKEN_ADDRESS)
      })
    })
    describe('getCollateralTokenFee()', () => {
      it('failure - token address is invalid', async () => {
        const tokenAddress = '0xInvalid'
        const res =
          provider.contract.getCollateralTokenProtocolFee(tokenAddress)

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - get collateral token fee', async () => {
        const feesCollected =
          await provider.contract.getCollateralTokenProtocolFee(
            FACTR_TOKEN_ADDRESS
          )

        expect(typeof feesCollected).toBe('bigint')
        expect(feesCollected).toBeGreaterThanOrEqual(0)
      })
    })
    describe('getAvailableAmountsInPool()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const res = provider.contract.getAvailableAmountsInPool(poolId)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('success - get available amounts in pool', async () => {
        const poolId = BigInt(0)
        const availableAmounts =
          await provider.contract.getAvailableAmountsInPool(poolId)

        expect(typeof availableAmounts).toBe('object')

        const availableUSDC = availableAmounts.availableUSDC
        const availableCollateralTokens =
          availableAmounts.availableCollateralTokens

        expect(typeof availableUSDC).toBe('bigint')
        expect(typeof availableCollateralTokens).toBe('bigint')
        expect(availableUSDC).toBeGreaterThanOrEqual(0)
        expect(availableCollateralTokens).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
