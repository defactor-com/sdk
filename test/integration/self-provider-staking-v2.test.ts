import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import { commonErrorMessage, stakingErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import { StakingV2 } from '../../src/staking'
import { AddPlanInput, Plan } from '../../src/types/staking/v2'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  AMOY_STAKING_CONTRACT_ADDRESS,
  FACTR_TOKEN_ADDRESS,
  MAX_BIGINT,
  ONE_DAY_SEC,
  USD_TOKEN_ADDRESS,
  approveTokenAmount,
  getUnixEpochTime,
  loadEnv,
  waitUntilConfirmationCompleted
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Staking', () => {
  let provider: SelfProvider<StakingV2>
  let signerAddress: string
  let factrTokenContract: Erc20
  const APY_PRECISION = 2
  const TOKEN_RATIO_PRECISION = 18

  const isSameDummyPlan = (
    plan: Plan,
    dummyPlan: AddPlanInput & {
      initialRatio: bigint
    }
  ) => {
    return (
      plan.rewardEndTime === dummyPlan.rewardEndTime &&
      plan.stakingEndTime === dummyPlan.stakingEndTime &&
      plan.stakingToken === dummyPlan.stakingToken &&
      plan.rewardToken === dummyPlan.rewardToken &&
      plan.maxStaked === dummyPlan.maxStaked &&
      plan.minStakeAmount === dummyPlan.minStakeAmount &&
      plan.apy === dummyPlan.apy &&
      plan.apyAfterUnlock === dummyPlan.apyAfterUnlock &&
      plan.lockDuration === dummyPlan.lockDuration
    )
  }

  const dummyPlan: AddPlanInput & {
    initialRatio: bigint
  } = {
    apy: BigInt(10) * BigInt(10 ** APY_PRECISION),
    apyAfterUnlock: BigInt(5) * BigInt(10 ** APY_PRECISION),
    lockDuration: BigInt(30 * ONE_DAY_SEC),
    maxStaked: BigInt(1000 * 1e18),
    minStakeAmount: BigInt(10 * 1e18),
    initialRatio: BigInt(1) * BigInt(10 ** TOKEN_RATIO_PRECISION),
    rewardEndTime: BigInt(1754632800),
    rewardToken: FACTR_TOKEN_ADDRESS,
    stakingEndTime: BigInt(1749535200),
    stakingToken: FACTR_TOKEN_ADDRESS
  }

  const editPlanInput = {
    planId: BigInt(0),
    maxStaked: dummyPlan.maxStaked,
    minStakeAmount: dummyPlan.minStakeAmount,
    stakingEndTime: dummyPlan.stakingEndTime,
    rewardEndTime: dummyPlan.rewardEndTime,
    lockDuration: dummyPlan.lockDuration,
    apy: dummyPlan.apy,
    apyAfterUnlock: dummyPlan.apyAfterUnlock
  }

  const dummyFactrPlan = {
    ...dummyPlan,
    lockDuration: BigInt(0),
    rewardEndTime: BigInt(1769817600),
    stakingEndTime: BigInt(1767139200)
  }

  const dummyUsdcPlan = {
    ...dummyPlan,
    lockDuration: BigInt(0),
    rewardEndTime: BigInt(1769817600),
    stakingEndTime: BigInt(1767139200),
    maxStaked: BigInt(1000 * 1e6),
    minStakeAmount: BigInt(10 * 1e6),
    rewardToken: FACTR_TOKEN_ADDRESS,
    stakingToken: USD_TOKEN_ADDRESS
  }

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    factrTokenContract = new Erc20(
      FACTR_TOKEN_ADDRESS,
      process.env.PROVIDER_URL,
      null
    )

    provider = new SelfProvider(
      StakingV2,
      AMOY_STAKING_CONTRACT_ADDRESS,
      process.env.PROVIDER_URL,
      ADMIN_TESTING_PRIVATE_KEY
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

    it('success - get ratio decimals divider', () => {
      expect(provider.contract.RATIO_DECIMALS_DIVIDER).toBe(BigInt(1e18))
    })

    it('success - max ratio changes', () => {
      expect(provider.contract.MAX_TOKEN_RATIOS_PER_PLAN).toBe(BigInt('100'))
    })
  })

  describe('Admin Functions', () => {
    describe('addPlan()', () => {
      it('failure - invalid staking address format', async () => {
        const invalidAddress = 'invalid_address'

        await expect(
          provider.contract.addPlan({
            ...dummyPlan,
            stakingToken: invalidAddress
          })
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)

        await expect(
          provider.contract.addPlan({
            ...dummyPlan,
            rewardToken: invalidAddress
          })
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - negative values', async () => {
        await expect(
          provider.contract.addPlan({ ...dummyPlan, maxStaked: BigInt(-1) })
        ).rejects.toThrow(stakingErrorMessage.minStakeMustBeLessThanMaxStake)

        await expect(
          provider.contract.addPlan({
            ...dummyPlan,
            minStakeAmount: BigInt(-1)
          })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeMinStakeAmount)

        await expect(
          provider.contract.addPlan({ ...dummyPlan, initialRatio: BigInt(-1) })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeInitialRatio)

        await expect(
          provider.contract.addPlan({ ...dummyPlan, lockDuration: BigInt(-1) })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeLockDuration)

        await expect(
          provider.contract.addPlan({ ...dummyPlan, apy: BigInt(-1) })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeApy)

        await expect(
          provider.contract.addPlan({
            ...dummyPlan,
            apyAfterUnlock: BigInt(-1)
          })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeApy)
      })
      it('failure - staking end time is in the past', async () => {
        await expect(
          provider.contract.addPlan({
            ...dummyPlan,
            stakingEndTime: BigInt(1577836800),
            rewardEndTime: getUnixEpochTime() + BigInt(30 * ONE_DAY_SEC)
          })
        ).rejects.toThrow(stakingErrorMessage.timeMustBeInFuture)
      })
      it('failure - invalid staking and reward time', async () => {
        await expect(
          provider.contract.addPlan({ ...dummyPlan, rewardEndTime: BigInt(0) })
        ).rejects.toThrow(stakingErrorMessage.rewardEndTimeTooLow)
      })
      it('failure - max staked is less than min staked', async () => {
        await expect(
          provider.contract.addPlan({
            ...dummyPlan,
            minStakeAmount:
              (dummyPlan.minStakeAmount + dummyPlan.maxStaked) * BigInt(2)
          })
        ).rejects.toThrow(stakingErrorMessage.minStakeMustBeLessThanMaxStake)
      })
      it.skip('failure - plan already exists', async () => {
        await expect(provider.contract.addPlan(dummyPlan)).rejects.toThrow(
          stakingErrorMessage.planAlreadyExists
        )
      })
      it.skip('success - add new plan successfully', async () => {
        await expect(
          provider.contract.addPlan(dummyPlan)
        ).resolves.not.toThrow()

        await expect(
          provider.contract.addPlan(dummyFactrPlan)
        ).resolves.not.toThrow()

        await expect(
          provider.contract.addPlan(dummyUsdcPlan)
        ).resolves.not.toThrow()
      })
    })
    describe('changeTokenRatioForPlan()', () => {
      it('failure - negative plan Id', async () => {
        const planId = BigInt(-1)
        const newRatio = BigInt(4)

        await expect(
          provider.contract.changeTokenRatioForPlan(planId, newRatio)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)
      })
      it('failure - plan does not exists', async () => {
        const planId = BigInt(MAX_BIGINT)
        const newRatio = BigInt(4)

        await expect(
          provider.contract.changeTokenRatioForPlan(planId, newRatio)
        ).rejects.toThrow(stakingErrorMessage.invalidPlanId)
      })
      it('failure - negative new ratio', async () => {
        const planId = BigInt(0)
        const newRatio = BigInt(-1)

        await expect(
          provider.contract.changeTokenRatioForPlan(planId, newRatio)
        ).rejects.toThrow(commonErrorMessage.nonNegativeValue)
      })
      it.skip('success - add new ratio to the plan', async () => {
        const planId = BigInt(0)
        const newRatio = BigInt(4)

        await expect(
          provider.contract.changeTokenRatioForPlan(planId, newRatio)
        ).resolves.not.toThrow()
      })
    })
    describe('editPlan()', () => {
      it('failure - negative values', async () => {
        await expect(
          provider.contract.editPlan({ ...editPlanInput, planId: BigInt(-1) })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)

        await expect(
          provider.contract.editPlan({
            ...editPlanInput,
            minStakeAmount: BigInt(-1)
          })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeMinStakeAmount)

        await expect(
          provider.contract.editPlan({
            ...editPlanInput,
            lockDuration: BigInt(-1)
          })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeLockDuration)

        await expect(
          provider.contract.editPlan({ ...editPlanInput, apy: BigInt(-1) })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeApy)

        await expect(
          provider.contract.editPlan({
            ...editPlanInput,
            apyAfterUnlock: BigInt(-1)
          })
        ).rejects.toThrow(stakingErrorMessage.nonNegativeApy)
      })
      it('failure - invalid staking and reward time', async () => {
        await expect(
          provider.contract.editPlan({
            ...editPlanInput,
            rewardEndTime: BigInt(0)
          })
        ).rejects.toThrow(stakingErrorMessage.rewardEndTimeTooLow)
      })
      it('failure - max staked is less than min staked', async () => {
        await expect(
          provider.contract.editPlan({
            ...editPlanInput,
            minStakeAmount:
              (dummyPlan.minStakeAmount + dummyPlan.maxStaked) * BigInt(2)
          })
        ).rejects.toThrow(stakingErrorMessage.minStakeMustBeLessThanMaxStake)
      })
      it.skip('failure - plan already exists', async () => {
        await expect(provider.contract.editPlan(editPlanInput)).rejects.toThrow(
          stakingErrorMessage.planAlreadyExists
        )
      })
      it.skip('success - edit plan successfully', async () => {
        await expect(
          provider.contract.editPlan({
            ...editPlanInput,
            minStakeAmount: BigInt(100 * 1e18)
          })
        ).resolves.not.toThrow()
      })
    })
  })

  describe('Functions', () => {
    describe('stake()', () => {
      it.skip('failure - Contract is paused', async () => {
        const tx = await provider.contract.pause()
        const planId = BigInt(0)
        const amount = dummyPlan.minStakeAmount

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(provider.contract.stake(planId, amount)).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )

        const tx2 = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx2
        )
      })
      it('failure - the plan id is invalid', async () => {
        const amount = BigInt(1e18)

        await expect(
          provider.contract.stake(BigInt(-1), amount)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)

        await expect(
          provider.contract.stake(BigInt(MAX_BIGINT), amount)
        ).rejects.toThrow(stakingErrorMessage.invalidPlanId)
      })
      it('failure - amount is less than the minimum', async () => {
        const planId = BigInt(0)
        const plans = await provider.contract.getPlans()
        const plan = plans[Number(planId)]
        const amount = plan.minStakeAmount - BigInt(1e18)

        await expect(provider.contract.stake(planId, amount)).rejects.toThrow(
          stakingErrorMessage.stakeAmountTooLow
        )
      })
      it('failure - amount exceeds the maximum stake amount', async () => {
        const plans = await provider.contract.getPlans()
        const planId = plans.findIndex(plan =>
          isSameDummyPlan(plan, dummyFactrPlan)
        )!
        const plan = plans[planId]
        const amount = plan.maxStaked + BigInt(1e18)

        await expect(
          provider.contract.stake(BigInt(planId), amount)
        ).rejects.toThrow(stakingErrorMessage.maxStakedReached)
      })
      it('failure - staking has ended', async () => {
        const planId = BigInt(0)
        const plans = await provider.contract.getPlans()
        const plan = plans[Number(planId)]
        const amount = plan.minStakeAmount + BigInt(1e18)

        await expect(provider.contract.stake(planId, amount)).rejects.toThrow(
          stakingErrorMessage.stakingHasEnded
        )
      })
      it('failure - Amount has not been pre-approved', async () => {
        const plans = await provider.contract.getPlans()
        const planId = plans.findIndex(plan =>
          isSameDummyPlan(plan, dummyFactrPlan)
        )!
        const plan = plans[planId]
        const amount = plan.minStakeAmount

        await expect(
          provider.contract.stake(BigInt(planId), amount)
        ).rejects.toThrow('ERC20: insufficient allowance')
      })
      it.skip('success - stake', async () => {
        const plans = await provider.contract.getPlans()
        const planId = BigInt(
          plans.findIndex(plan => isSameDummyPlan(plan, dummyUsdcPlan))!
        )
        const plan = plans[Number(planId)]
        const amount = plan.minStakeAmount
        const stakingToken = plan.stakingToken
        const tokenContract = new Erc20(
          stakingToken,
          provider.contract.apiUrl,
          null
        )

        await approveTokenAmount(tokenContract, provider, amount)
        await expect(
          provider.contract.stake(BigInt(planId), amount)
        ).resolves.not.toThrow()
      })
      it.skip('success - stake max amount twice', async () => {
        const plans = await provider.contract.getPlans()
        const planId = BigInt(
          plans.findIndex(plan => isSameDummyPlan(plan, dummyUsdcPlan))!
        )
        const plan = plans[Number(planId)]
        const amount = plan.maxStaked
        const stakingToken = plan.stakingToken
        const tokenContract = new Erc20(
          stakingToken,
          provider.contract.apiUrl,
          null
        )

        // Stake max amount
        await approveTokenAmount(tokenContract, provider, amount)
        await expect(
          provider.contract.stake(BigInt(planId), amount)
        ).resolves.not.toThrow()

        const stakeIndexes =
          await provider.contract.getUserStakes(signerAddress)
        const stakeIndex = BigInt(stakeIndexes.length - 1)

        // Unstake position
        await expect(
          provider.contract.unstake(stakeIndex)
        ).resolves.not.toThrow()

        // Stake max amount again
        await approveTokenAmount(tokenContract, provider, amount)
        await expect(
          provider.contract.stake(BigInt(planId), amount)
        ).resolves.not.toThrow()
      })
    })
    describe('unstake()', () => {
      it.skip('failure - Contract is paused', async () => {
        const tx = await provider.contract.pause()
        const stakeIndex = BigInt(0)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(provider.contract.unstake(stakeIndex)).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )

        const tx2 = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx2
        )
      })
      it('failure - stake index is negative', async () => {
        await expect(provider.contract.unstake(BigInt(-1))).rejects.toThrow(
          stakingErrorMessage.nonNegativeIndexId
        )
      })
      it('failure - stake index is invalid', async () => {
        await expect(
          provider.contract.unstake(BigInt(MAX_BIGINT))
        ).rejects.toThrow(stakingErrorMessage.invalidStakeIndex)
      })
      it('failure - stake is already unstaked', async () => {
        const stakeIndex = BigInt(0)

        await expect(provider.contract.unstake(stakeIndex)).rejects.toThrow(
          stakingErrorMessage.stakeAlreadyUnstaked
        )
      })
      it.skip('failure - Stake is locked', async () => {
        const stakeIndex = BigInt(0)

        timekeeper.travel(
          new Date(Number(dummyFactrPlan.stakingEndTime) * 1000 + ONE_DAY_SEC)
        )

        await expect(provider.contract.unstake(stakeIndex)).rejects.toThrow(
          stakingErrorMessage.stakeIsLocked
        )

        timekeeper.reset()
      })
      it.skip('success - Unstake successfully', async () => {
        const stakeIndex = BigInt(1)

        await expect(
          provider.contract.unstake(stakeIndex)
        ).resolves.not.toThrow()
      })
    })
    describe('restake()', () => {
      it('failure - Negative stake index', async () => {
        await expect(
          provider.contract.restake(BigInt(0), BigInt(-1))
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)

        await expect(
          provider.contract.restake(BigInt(-1), BigInt(0))
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)

        await expect(
          provider.contract.restake(BigInt(-1), BigInt(-1))
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)
      })
      it.skip('failure - Staking has ended', async () => {
        timekeeper.travel(new Date('2050-01-01T00:00:00Z'))

        await expect(
          provider.contract.restake(BigInt(0), BigInt(0))
        ).rejects.toThrow(stakingErrorMessage.stakingHasEnded)

        timekeeper.reset()
      })
      it.skip('failure - new plan has a different staking token', async () => {
        const plans = await provider.contract.getPlans()
        const planId = BigInt(
          plans.findIndex(plan => isSameDummyPlan(plan, dummyFactrPlan))!
        )
        const stakeIndex = BigInt(0)

        await expect(
          provider.contract.restake(planId, stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.restakedWithWrongToken)
      })
      it('failure - already unstaked the stake', async () => {
        const plans = await provider.contract.getPlans()
        const planId = BigInt(
          plans.findIndex(plan => isSameDummyPlan(plan, dummyFactrPlan))!
        )
        const stakeIndex = BigInt(0)

        await expect(
          provider.contract.restake(planId, stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.stakeAlreadyUnstaked)
      })
      it.skip('success - add restake to a plan successfully', async () => {
        const plans = await provider.contract.getPlans()
        const planId = BigInt(
          plans.findIndex(plan => isSameDummyPlan(plan, dummyUsdcPlan))!
        )
        const stakeIndex = BigInt(0)

        await expect(
          provider.contract.restake(planId, stakeIndex)
        ).resolves.not.toThrow()
      })
    })
    describe('claimRewards()', () => {
      it('failure - stake is already unstaked', async () => {
        const stakeIndex = BigInt(0)

        await expect(
          provider.contract.claimRewards(stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.stakeAlreadyUnstaked)
      })
      it.skip('success - rewards claimed successfully', async () => {
        const stakeIndex = BigInt(0)

        await expect(
          provider.contract.claimRewards(stakeIndex)
        ).resolves.not.toThrow()
      })
    })
    describe('claimAllRewards()', () => {
      it.skip('success - rewards claimed successfully', async () => {
        await expect(provider.contract.claimAllRewards()).resolves.not.toThrow()
      })
    })
  })

  describe('Views', () => {
    describe('balanceOf()', () => {
      it('failure - wrong user address format', async () => {
        const invalidAddress = 'invalid_address'
        const tokenAddress = factrTokenContract.address

        await expect(
          provider.contract.getBalanceOf(invalidAddress, tokenAddress)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - wrong token address format', async () => {
        const invalidAddress = 'invalid_address'

        await expect(
          provider.contract.getBalanceOf(signerAddress, invalidAddress)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - get balance of a valid address', async () => {
        const validAddress = signerAddress
        const tokenAddress = factrTokenContract.address
        const balance = await provider.contract.getBalanceOf(
          validAddress,
          tokenAddress
        )

        expect(typeof balance).toBe('bigint')
      })
    })
    describe('getPlans()', () => {
      it('success - get plans', async () => {
        const plans = await provider.contract.getPlans()

        for (const plan of plans) {
          expect(
            plan.rewardEndTime >= plan.stakingEndTime + plan.lockDuration
          ).toBe(true)
        }
      })
    })
    describe('getPlanTokenRatios()', () => {
      it('failure - negative plan id', async () => {
        const planId = BigInt(-1)

        await expect(
          provider.contract.getPlanTokenRatios(planId)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)
      })
      it('failure - plan id is invalid', async () => {
        const planId = BigInt(MAX_BIGINT)

        await expect(
          provider.contract.getPlanTokenRatios(planId)
        ).rejects.toThrow(stakingErrorMessage.invalidPlanId)
      })
      it.skip('success - get plan token ratios', async () => {
        const planId = BigInt(0)
        const tokenRatios = await provider.contract.getPlanTokenRatios(planId)

        for (const tokenRatio of tokenRatios) {
          expect(tokenRatio.timestamp).toBeGreaterThan(BigInt(0))
        }
      })
    })
    describe('getUserStakes()', () => {
      it('failure - wrong user address format', async () => {
        const invalidAddress = 'invalid_address'

        await expect(
          provider.contract.getUserStakes(invalidAddress)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('success - get user stakes', async () => {
        const validAddress = signerAddress
        const stakes = await provider.contract.getUserStakes(validAddress)

        for (const stake of stakes) {
          expect(stake.planId).toBeGreaterThanOrEqual(BigInt(0))
          expect(stake.stakeTime).toBeGreaterThan(BigInt(0))
        }
      })
    })
    describe('getUserStake()', () => {
      it('failure - wrong user address format', async () => {
        const invalidAddress = 'invalid_address'
        const stakeIndex = BigInt(0)

        await expect(
          provider.contract.getUserStake(invalidAddress, stakeIndex)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - negative stake index', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(-1)

        await expect(
          provider.contract.getUserStake(validAddress, stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)
      })
      it('failure - stake index is invalid', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(MAX_BIGINT)

        await expect(
          provider.contract.getUserStake(validAddress, stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.invalidStakeIndex)
      })
      it.skip('success - get user stakes', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(0)
        const stake = await provider.contract.getUserStake(
          validAddress,
          stakeIndex
        )

        expect(stake.planId).toBeGreaterThanOrEqual(BigInt(0))
        expect(stake.stakeTime).toBeGreaterThan(BigInt(0))
      })
    })
    describe('calculateStakeRewardByIndex()', () => {
      it('failure - wrong user address format', async () => {
        const invalidAddress = 'invalid_address'
        const stakeIndex = BigInt(0)
        const timestamp = getUnixEpochTime()

        await expect(
          provider.contract.calculateStakeRewardByIndex(
            invalidAddress,
            timestamp,
            stakeIndex
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - negative timestamp', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(0)
        const timestamp = BigInt(-1)

        await expect(
          provider.contract.calculateStakeRewardByIndex(
            validAddress,
            timestamp,
            stakeIndex
          )
        ).rejects.toThrow(commonErrorMessage.nonNegativeDate)
      })
      it('failure - negative stake index', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(-1)
        const timestamp = getUnixEpochTime()

        await expect(
          provider.contract.calculateStakeRewardByIndex(
            validAddress,
            timestamp,
            stakeIndex
          )
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)
      })
      it('failure - stake index is invalid', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(MAX_BIGINT)
        const timestamp = getUnixEpochTime()

        await expect(
          provider.contract.calculateStakeRewardByIndex(
            validAddress,
            timestamp,
            stakeIndex
          )
        ).rejects.toThrow(stakingErrorMessage.invalidStakeIndex)
      })
      it.skip('success - get stake rewards by index', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(0)
        const timestamp = getUnixEpochTime()

        const rewards = await provider.contract.calculateStakeRewardByIndex(
          validAddress,
          stakeIndex,
          timestamp
        )

        expect(typeof rewards).toBe('bigint')
        expect(rewards).toBeGreaterThanOrEqual(BigInt(0))
      })
    })
    describe('calculateStakeRewardsForUser()', () => {
      it('failure - wrong user address format', async () => {
        const invalidAddress = 'invalid_address'
        const timestamp = getUnixEpochTime()

        await expect(
          provider.contract.calculateStakeRewardsForUser(
            invalidAddress,
            timestamp
          )
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - negative timestamp', async () => {
        const validAddress = signerAddress
        const timestamp = BigInt(-1)

        await expect(
          provider.contract.calculateStakeRewardsForUser(
            validAddress,
            timestamp
          )
        ).rejects.toThrow(commonErrorMessage.nonNegativeDate)
      })
      it('success - get stake rewards for user', async () => {
        const validAddress = signerAddress
        const stakeIndex = BigInt(0)

        const rewardsForUser =
          await provider.contract.calculateStakeRewardsForUser(
            validAddress,
            stakeIndex
          )

        for (const reward of rewardsForUser) {
          expect(typeof reward).toBe('bigint')
          expect(reward).toBeGreaterThanOrEqual(BigInt(0))
        }
      })
    })
  })
})
