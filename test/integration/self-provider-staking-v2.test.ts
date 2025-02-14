import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import { commonErrorMessage, stakingErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import { StakingV2 } from '../../src/staking'
import { Plan } from '../../src/types/staking/v2'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  AMOY_STAKING_CONTRACT_ADDRESS,
  FACTR_TOKEN_ADDRESS,
  MAX_BIGINT,
  ONE_DAY_SEC,
  TESTING_PRIVATE_KEY,
  getUnixEpochTime,
  loadEnv
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Staking', () => {
  let provider: SelfProvider<StakingV2>
  let notAdminProvider: SelfProvider<StakingV2>
  let signerAddress: string
  let factrTokenContract: Erc20

  const dummyPlan: Omit<Plan, 'totalStaked' | 'totalUnstaked'> & {
    initialRatio: bigint
  } = {
    apy: BigInt(10),
    apyAfterUnlock: BigInt(5),
    lockDuration: BigInt(30 * ONE_DAY_SEC),
    maxStaked: BigInt(1000 * 1e18),
    minStakeAmount: BigInt(10 * 1e18),
    initialRatio: BigInt(5),
    rewardEndTime: BigInt(1744264800),
    rewardToken: FACTR_TOKEN_ADDRESS,
    stakingEndTime: BigInt(1739167200),
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

    notAdminProvider = new SelfProvider(
      StakingV2,
      AMOY_STAKING_CONTRACT_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
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
    it('success - percentage multiplier', () => {
      expect(provider.contract.PERCENTAGE_MULTIPLIER).toBe(BigInt('100'))
    })

    it('success - get ratio decimals divider', () => {
      expect(provider.contract.RATIO_DECIMALS_DIVIDER).toBe(BigInt(1e18))
    })
  })

  describe('Admin Functions', () => {
    describe('withdraw()', () => {
      it('failure - the signer is not admin', async () => {
        const validAddress = notAdminProvider.contract.address
        const res = notAdminProvider.contract.withdraw(
          FACTR_TOKEN_ADDRESS,
          validAddress
        )

        await expect(res).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })

      it('failure - invalid token address format', async () => {
        const validAddress = signerAddress
        const invalidTokenAddress = 'invalid_address'

        await expect(
          provider.contract.withdraw(invalidTokenAddress, validAddress)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - invalid recipient address format', async () => {
        const invalidAddress = 'invalid_address'

        await expect(
          provider.contract.withdraw(FACTR_TOKEN_ADDRESS, invalidAddress)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it.skip('success - withdraw successfully', async () => {
        await expect(
          provider.contract.withdraw(FACTR_TOKEN_ADDRESS, signerAddress)
        ).resolves.not.toThrow()
      })
    })
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

  describe('Functions', () => {})

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
      it('success - get plan token ratios', async () => {
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
