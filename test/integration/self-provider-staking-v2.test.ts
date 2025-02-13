import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import { commonErrorMessage, stakingErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import { StakingV2 } from '../../src/staking'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  AMOY_STAKING_CONTRACT_ADDRESS,
  FACTR_TOKEN_ADDRESS,
  getUnixEpochTime,
  loadEnv
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Staking', () => {
  let provider: SelfProvider<StakingV2>
  let signerAddress: string
  let factrTokenContract: Erc20

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
    it('success - percentage multiplier', () => {
      expect(provider.contract.PERCENTAGE_MULTIPLIER).toBe(BigInt('100'))
    })

    it('success - get ratio decimals divider', () => {
      expect(provider.contract.RATIO_DECIMALS_DIVIDER).toBe(BigInt(1e18))
    })
  })

  describe('Admin Functions', () => {})

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
      it('success - get user stakes', async () => {
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
      it('success - get stake rewards by index', async () => {
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
