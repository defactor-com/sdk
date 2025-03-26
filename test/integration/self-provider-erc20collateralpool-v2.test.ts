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
import {
  Claim,
  InitPool,
  Liquidation
} from '../../src/types/erc20-collateral-pool/v2'
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
  const usdcPrecision = 10 ** 6
  let collateralTokenContract: Erc20
  const collateralPrecision = 10 ** 18
  const initialPool: InitPool = {
    collateralToken: FACTR_TOKEN_ADDRESS,
    collateralTokenFactor: BigInt(100_00),
    collateralTokenLTVPercentage: BigInt(50_00),
    collateralTokenPriceOracle: ethers.ZeroAddress,
    collateralTokenSequencerOracle: ethers.ZeroAddress,
    endTime: BigInt(1774472070),
    interest: BigInt(5_00),
    maxPoolCapacity: BigInt(5000 * usdcPrecision),
    minBorrow: BigInt(100 * usdcPrecision),
    minLended: BigInt(100 * usdcPrecision)
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

    collateralTokenContract = new Erc20(
      FACTR_TOKEN_ADDRESS,
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
    describe('Lend()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const amount = BigInt(1000 * usdcPrecision)
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
      it('failure - the end time has been reached', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minLended

        timekeeper.travel(new Date(Number(pool.endTime) * 1000 + ONE_DAY_SEC))

        const res = provider.contract.lend(poolId, amount)

        await expect(res).rejects.toThrow(ecpErrorMessage.poolIsClosed)

        timekeeper.reset()
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
    describe('Borrow()', () => {
      it('failure - the pool id does not exists', async () => {
        const poolId = MAX_BIGINT
        const amount = BigInt(1000 * usdcPrecision)
        const collateralTokenAmount = BigInt(1000 * collateralPrecision)
        const res = provider.contract.borrow(
          poolId,
          amount,
          collateralTokenAmount
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the amount is negative', async () => {
        const poolId = BigInt(0)
        const amount = BigInt(-1)
        const collateralTokenAmount = BigInt(1000 * collateralPrecision)
        const res = provider.contract.borrow(
          poolId,
          amount,
          collateralTokenAmount
        )

        await expect(res).rejects.toThrow(ecpErrorMessage.nonNegativeOrZero)
      })
      it('failure - the amount is less than the minimum', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minBorrow / BigInt(4)
        const collateralTokenAmount = BigInt(1000 * collateralPrecision)
        const res = provider.contract.borrow(
          poolId,
          amount,
          collateralTokenAmount
        )

        await expect(res).rejects.toThrow(ecpErrorMessage.amountTooLow)
      })
      it('failure - the amount is greater than the available usdc amount', async () => {
        const poolId = BigInt(0)
        const { availableUSDC } =
          await provider.contract.getAvailableAmountsInPool(poolId)
        const amount = availableUSDC * BigInt(2)
        const collateralTokenAmount = BigInt(1000 * collateralPrecision)
        const res = provider.contract.borrow(
          poolId,
          amount,
          collateralTokenAmount
        )

        await expect(res).rejects.toThrow(ecpErrorMessage.notEnoughUSDCInPool)
      })
      it('failure - the collateral amount is less than the minimum', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minBorrow
        const minCollateralTokenAmount =
          await provider.contract.calculateCollateralTokenAmount(poolId, amount)
        const collateralTokenAmount = minCollateralTokenAmount / BigInt(2)
        const res = provider.contract.borrow(
          poolId,
          amount,
          collateralTokenAmount
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.collateralAmountTooLow
        )
      })
      it('failure - the end time has been reached', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minBorrow
        const minCollateralTokenAmount =
          await provider.contract.calculateCollateralTokenAmount(poolId, amount)
        const collateralTokenAmount = minCollateralTokenAmount

        timekeeper.travel(new Date(Number(pool.endTime) * 1000 + ONE_DAY_SEC))

        const res = provider.contract.borrow(
          poolId,
          amount,
          collateralTokenAmount
        )

        await expect(res).rejects.toThrow(ecpErrorMessage.endTimeReached)

        timekeeper.reset()
      })
      it('failure - the amount was not approved', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minBorrow
        const minCollateralTokenAmount =
          await provider.contract.calculateCollateralTokenAmount(poolId, amount)
        const collateralTokenAmount = minCollateralTokenAmount
        const res = provider.contract.borrow(
          poolId,
          amount,
          collateralTokenAmount
        )

        await expect(res).rejects.toThrow('ERC20: insufficient allowance')
      })
      it.skip('success - borrow min amount', async () => {
        const poolId = BigInt(0)
        const pool = await provider.contract.getPool(poolId)
        const amount = pool.collateralDetails.minBorrow
        const collateralTokenAmount =
          await provider.contract.calculateCollateralTokenAmount(poolId, amount)

        await approveTokenAmount(
          collateralTokenContract,
          provider,
          collateralTokenAmount
        )

        await expect(
          provider.contract.borrow(poolId, amount, collateralTokenAmount)
        ).resolves.not.toThrow()
      })
    })
    describe('Repay()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const borrowId = BigInt(0)
        const amount = BigInt(100 * usdcPrecision)
        const res = provider.contract.repay(poolId, borrowId, amount)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the borrow does not exists', async () => {
        const poolId = BigInt(0)
        const borrowId = MAX_BIGINT
        const amount = BigInt(100 * usdcPrecision)
        const res = provider.contract.repay(poolId, borrowId, amount)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistBorrowId(borrowId)
        )
      })
      it('failure - the amount is zero', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const amount = BigInt(0)
        const res = provider.contract.repay(poolId, borrowId, amount)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noNegativeAmountOrZero
        )
      })
      it('failure - the repay amount is too big', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const borrow = await provider.contract.getBorrow(
          poolId,
          signerAddress,
          borrowId
        )
        const amount = borrow.usdcAmount * BigInt(4)
        const res = provider.contract.repay(poolId, borrowId, amount)

        await expect(res).rejects.toThrow(ecpErrorMessage.amountTooBig)
      })
      it('failure - the amount was not approved', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const borrow = await provider.contract.getBorrow(
          poolId,
          signerAddress,
          borrowId
        )
        const amount = borrow.usdcAmount
        const res = provider.contract.repay(poolId, borrowId, amount)

        await expect(res).rejects.toThrow('ERC20: insufficient allowance')
      })
      it.skip('success - repay the borrow', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const borrow = await provider.contract.getBorrow(
          poolId,
          signerAddress,
          borrowId
        )
        const repayInterest = await provider.contract.calculateRepayInterest(
          poolId,
          borrowId,
          signerAddress
        )
        const repayAmount = borrow.usdcAmount
        const extraAmount = BigInt(0.00001 * usdcPrecision)
        const totalAmount = repayAmount + repayInterest + extraAmount

        await approveTokenAmount(usdcTokenContract, provider, totalAmount)
        await expect(
          provider.contract.repay(poolId, borrowId, repayAmount)
        ).resolves.not.toThrow()
      })
    })
    describe('Claim()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const claims = [
          { lendId: BigInt(0), usdcAmount: BigInt(1 * usdcPrecision) }
        ] as Array<Claim>
        const res = provider.contract.claim(poolId, claims)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the claims array is empty', async () => {
        const poolId = BigInt(0)
        const claims = [] as Array<Claim>
        const res = provider.contract.claim(poolId, claims)

        await expect(res).rejects.toThrow(ecpErrorMessage.noClaimsProvided)
      })
      it('failure - a claim amount is zero', async () => {
        const poolId = BigInt(0)
        const claims = [
          { lendId: BigInt(0), usdcAmount: BigInt(0) }
        ] as Array<Claim>
        const res = provider.contract.claim(poolId, claims)

        await expect(res).rejects.toThrow(ecpErrorMessage.nonNegativeOrZero)
      })
      it('failure - the loan does not exists', async () => {
        const poolId = BigInt(0)
        const claims = [
          { lendId: MAX_BIGINT, usdcAmount: BigInt(1 * usdcPrecision) }
        ] as Array<Claim>
        const res = provider.contract.claim(poolId, claims)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistLendingId(MAX_BIGINT)
        )
      })
      it('failure - the claim amount exceeds the loan amount', async () => {
        const poolId = BigInt(0)
        const lendId = BigInt(0)
        const loan = await provider.contract.getLoan(
          poolId,
          signerAddress,
          lendId
        )
        const claims = [
          { lendId: lendId, usdcAmount: loan.usdcAmount * BigInt(2) }
        ] as Array<Claim>
        const res = provider.contract.claim(poolId, claims)

        await expect(res).rejects.toThrow(ecpErrorMessage.amountTooBig)
      })
      it('failure - the sum of the claim amounts exceeds the available amount', async () => {
        const poolId = BigInt(0)
        const lendId = BigInt(0)
        const loan = await provider.contract.getLoan(
          poolId,
          signerAddress,
          lendId
        )
        const claims = [
          { lendId: lendId, usdcAmount: loan.usdcAmount / BigInt(2) },
          { lendId: lendId, usdcAmount: loan.usdcAmount / BigInt(2) },
          { lendId: lendId, usdcAmount: loan.usdcAmount / BigInt(2) }
        ] as Array<Claim>
        const res = provider.contract.claim(poolId, claims)

        await expect(res).rejects.toThrow(ecpErrorMessage.notEnoughUSDCInPool)
      })
      it.skip('success - claim amount', async () => {
        const poolId = BigInt(0)
        const lendId = BigInt(0)
        const loan = await provider.contract.getLoan(
          poolId,
          signerAddress,
          lendId
        )
        const claims = [
          { lendId: lendId, usdcAmount: loan.usdcAmount / BigInt(2) }
        ] as Array<Claim>
        const res = provider.contract.claim(poolId, claims)

        await expect(res).resolves.not.toThrow()
      })
    })
    describe('ChangeCollateralAmount()', () => {
      it('failure - the pool id does not exists', async () => {
        const poolId = MAX_BIGINT
        const borrowId = BigInt(1)
        const res = provider.contract.changeCollateralAmount(
          poolId,
          borrowId,
          BigInt(0),
          BigInt(50_00)
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the borrow id does not exists', async () => {
        const poolId = BigInt(0)
        const borrowId = MAX_BIGINT
        const res = provider.contract.changeCollateralAmount(
          poolId,
          borrowId,
          BigInt(0),
          BigInt(50_00)
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistBorrowId(borrowId)
        )
      })
      it('failure - borrow already liquidated', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const res = provider.contract.changeCollateralAmount(
          poolId,
          borrowId,
          BigInt(0),
          BigInt(50_00)
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.borrowAlreadyLiquidated
        )
      })
      it('failure - collateral token amount is the same as the previous one', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(1)
        const borrow = await provider.contract.getBorrow(
          poolId,
          signerAddress,
          borrowId
        )
        const newCollateralTokenAmount = borrow.collateralTokenAmount
        const res = provider.contract.changeCollateralAmount(
          poolId,
          borrowId,
          newCollateralTokenAmount,
          BigInt(50_00)
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.collateralAmountNotChanged
        )
      })
      it('failure - collateral token amount is less than the minimum', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(1)
        const borrow = await provider.contract.getBorrow(
          poolId,
          signerAddress,
          borrowId
        )
        const minCollateralTokenAmount =
          await provider.contract.calculateCollateralTokenAmount(
            poolId,
            borrow.usdcAmount
          )
        const newCollateralTokenAmount = minCollateralTokenAmount / BigInt(2)
        const maxCollateralTokenLTVPercentage = BigInt(50_00)
        const res = provider.contract.changeCollateralAmount(
          poolId,
          borrowId,
          newCollateralTokenAmount,
          maxCollateralTokenLTVPercentage
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.collateralAmountTooLow
        )
      })
    })
    describe('Liquidate()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const liquidations = [
          {
            user: signerAddress,
            usdcAmount: BigInt(1 * usdcPrecision),
            borrowId: BigInt(0)
          }
        ] as Array<Liquidation>

        const res = provider.contract.liquidate(poolId, liquidations)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - no liquidations provided', async () => {
        const poolId = BigInt(0)
        const liquidations = [] as Array<Liquidation>

        const res = provider.contract.liquidate(poolId, liquidations)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noLiquidationsProvided
        )
      })
      it('failure - amount is zero', async () => {
        const poolId = BigInt(0)
        const liquidations = [
          {
            user: signerAddress,
            borrowId: BigInt(0),
            usdcAmount: BigInt(0)
          }
        ] as Array<Liquidation>

        const res = provider.contract.liquidate(poolId, liquidations)

        await expect(res).rejects.toThrow(ecpErrorMessage.nonNegativeOrZero)
      })
      it('failure - the address is invalid', async () => {
        const poolId = BigInt(0)
        const liquidations = [
          {
            user: '0xInvalid',
            borrowId: BigInt(0),
            usdcAmount: BigInt(1 * usdcPrecision)
          }
        ] as Array<Liquidation>

        const res = provider.contract.liquidate(poolId, liquidations)

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the liquidation amount is too high', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(1)
        const borrow = await provider.contract.getBorrow(
          poolId,
          signerAddress,
          borrowId
        )
        const liquidations = [
          {
            user: signerAddress,
            borrowId,
            usdcAmount: borrow.usdcAmount * BigInt(2)
          }
        ] as Array<Liquidation>

        const res = provider.contract.liquidate(poolId, liquidations)

        await expect(res).rejects.toThrow(ecpErrorMessage.amountTooBig)
      })
    })
    describe('ClaimCollateral', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const claims = [
          {
            usdcAmount: BigInt(1 * usdcPrecision),
            lendId: BigInt(0)
          }
        ] as Array<Claim>
        const liquidations = [
          {
            user: signerAddress,
            usdcAmount: BigInt(1 * usdcPrecision),
            borrowId: BigInt(0)
          }
        ] as Array<Liquidation>

        const res = provider.contract.claimCollateral(
          poolId,
          claims,
          liquidations
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - no claims provided', async () => {
        const poolId = BigInt(0)
        const claims = [] as Array<Claim>
        const liquidations = [
          {
            user: signerAddress,
            usdcAmount: BigInt(1 * usdcPrecision),
            borrowId: BigInt(0)
          }
        ] as Array<Liquidation>

        const res = provider.contract.claimCollateral(
          poolId,
          claims,
          liquidations
        )

        await expect(res).rejects.toThrow(ecpErrorMessage.noClaimsProvided)
      })
      it('failure - no liquidation provided', async () => {
        const poolId = BigInt(0)
        const claims = [
          {
            usdcAmount: BigInt(1 * usdcPrecision),
            lendId: BigInt(0)
          }
        ] as Array<Claim>
        const liquidations = [] as Array<Liquidation>

        const res = provider.contract.claimCollateral(
          poolId,
          claims,
          liquidations
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noLiquidationsProvided
        )
      })
    })
  })

  describe('Views', () => {
    describe('getUsdc()', () => {
      it('success - get fees collected', async () => {
        const feesCollected = await provider.contract.USDC_FEES_COLLECTED()

        expect(feesCollected).toBeGreaterThanOrEqual(0)
      })
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
        const firstPools = await provider.contract.getPools(offset, limit)

        for (const pool of firstPools.data) {
          expect(ethers.isAddress(pool.collateralDetails.collateralToken))
          expect(pool.endTime).toBeGreaterThan(0)
        }

        expect(firstPools.more).toBe(true)
        expect(firstPools.data).toHaveLength(Number(limit))

        const lastPools = await provider.contract.getPools(
          offset + limit,
          totalPools
        )

        expect(lastPools.more).toBe(false)
        expect(lastPools.data).toHaveLength(
          Number(totalPools) - firstPools.data.length
        )
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
    describe('getLoan()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const lendId = BigInt(0)
        const res = provider.contract.getLoan(poolId, signerAddress, lendId)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the borrow does not exists', async () => {
        const poolId = BigInt(0)
        const lendId = MAX_BIGINT
        const res = provider.contract.getLoan(poolId, signerAddress, lendId)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistLendingId(lendId)
        )
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
        const amount = BigInt(1000 * usdcPrecision)
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
        const amount = BigInt(100 * usdcPrecision)
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
    describe('getBorrow()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const borrowId = BigInt(0)
        const res = provider.contract.getBorrow(poolId, signerAddress, borrowId)

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the borrow does not exists', async () => {
        const poolId = BigInt(0)
        const borrowId = MAX_BIGINT
        const res = provider.contract.getBorrow(poolId, signerAddress, borrowId)

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistBorrowId(borrowId)
        )
      })
    })
    describe('getTotalBorrows()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const res = provider.contract.getTotalBorrowsByUser(
          poolId,
          signerAddress
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the user address is not valid', async () => {
        const poolId = BigInt(0)
        const user = '0xinvalid'
        const res = provider.contract.getTotalBorrowsByUser(poolId, user)

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - get total borrows', async () => {
        const poolId = BigInt(0)
        const totalBorrows = await provider.contract.getTotalBorrowsByUser(
          poolId,
          signerAddress
        )

        expect(typeof totalBorrows).toBe('bigint')
        expect(totalBorrows).toBeGreaterThanOrEqual(0)
      })
    })
    describe('getBorrowsByBorrower()', () => {
      it('success - get all loans', async () => {
        const poolId = BigInt(0)
        const offset = BigInt(0)
        const limit = BigInt(1000)
        const res = await provider.contract.getBorrowsByBorrower(
          poolId,
          signerAddress,
          offset,
          limit
        )

        for (const borrow of res.data) {
          expect(borrow.usdcAmount).toBeGreaterThan(0)
          expect(borrow.collateralTokenAmount).toBeGreaterThan(0)
          expect(borrow.borrowTime).toBeGreaterThan(0)
        }

        expect(res.more).toBe(false)
      })
    })
    describe('isPositionLiquidatable()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const borrowId = BigInt(0)
        const res = provider.contract.isPositionLiquidatable(
          poolId,
          signerAddress,
          borrowId
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the borrow does not exists', async () => {
        const poolId = BigInt(0)
        const borrowId = MAX_BIGINT
        const res = provider.contract.isPositionLiquidatable(
          poolId,
          signerAddress,
          borrowId
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistBorrowId(borrowId)
        )
      })
      it('failure - the address is invalid', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const address = '0xInvalid'
        const res = provider.contract.isPositionLiquidatable(
          poolId,
          address,
          borrowId
        )

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - is liquidatable', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const isLiquidatable = await provider.contract.isPositionLiquidatable(
          poolId,
          signerAddress,
          borrowId
        )

        expect(typeof isLiquidatable).toBe('boolean')
      })
    })
    describe('calculateRepayInterest()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const borrowId = BigInt(0)
        const res = provider.contract.calculateRepayInterest(
          poolId,
          borrowId,
          signerAddress
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the borrow does not exists', async () => {
        const poolId = BigInt(0)
        const borrowId = MAX_BIGINT
        const res = provider.contract.calculateRepayInterest(
          poolId,
          borrowId,
          signerAddress
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistBorrowId(borrowId)
        )
      })
      it('failure - the address is invalid', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const address = '0xInvalid'
        const res = provider.contract.calculateRepayInterest(
          poolId,
          borrowId,
          address
        )

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - calculate repay interest', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const repayInterest = await provider.contract.calculateRepayInterest(
          poolId,
          borrowId,
          signerAddress
        )

        expect(typeof repayInterest).toBe('bigint')
        expect(repayInterest).toBeGreaterThan(0)
      })
    })
    describe('getLiquidatableAmountWithProtocolFee()', () => {
      it('failure - the pool does not exists', async () => {
        const poolId = MAX_BIGINT
        const borrowId = BigInt(0)
        const res = provider.contract.getLiquidatableAmountWithProtocolFee(
          poolId,
          signerAddress,
          borrowId
        )

        await expect(res).rejects.toThrow(
          poolCommonErrorMessage.noExistPoolId(poolId)
        )
      })
      it('failure - the borrow does not exists', async () => {
        const poolId = BigInt(0)
        const borrowId = MAX_BIGINT
        const res = provider.contract.getLiquidatableAmountWithProtocolFee(
          poolId,
          signerAddress,
          borrowId
        )

        await expect(res).rejects.toThrow(
          ecpErrorMessage.noExistBorrowId(borrowId)
        )
      })
      it('failure - the address is invalid', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const address = '0xInvalid'
        const res = provider.contract.getLiquidatableAmountWithProtocolFee(
          poolId,
          address,
          borrowId
        )

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - calculate repay interest', async () => {
        const poolId = BigInt(0)
        const borrowId = BigInt(0)
        const liquidatableAmountWithProtocolFee =
          await provider.contract.getLiquidatableAmountWithProtocolFee(
            poolId,
            signerAddress,
            borrowId
          )

        expect(typeof liquidatableAmountWithProtocolFee).toBe('bigint')
        expect(liquidatableAmountWithProtocolFee).toBeGreaterThan(0)
      })
    })
  })
})
