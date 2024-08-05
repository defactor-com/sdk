import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import { commonErrorMessage, stakingErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import { Staking } from '../../src/staking'
import { Plan } from '../../src/types/staking'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  AMOY_STAKING_CONTRACT_ADDRESS,
  FACTR_TOKEN_ADDRESS,
  TESTING_PRIVATE_KEY,
  approveTokenAmount,
  loadEnv,
  setPause,
  waitUntilConfirmationCompleted
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Staking', () => {
  let provider: SelfProvider<Staking>
  let notAdminProvider: SelfProvider<Staking>
  let signerAddress: string
  let factrTokenContract: Erc20

  const defaultPlans: ReadonlyArray<Plan> = [
    {
      lockDuration: BigInt(0),
      apy: BigInt(5)
    },
    {
      lockDuration: BigInt(90 * 24 * 60 * 60),
      apy: BigInt(10)
    },
    {
      lockDuration: BigInt(180 * 24 * 60 * 60),
      apy: BigInt(25)
    }
  ]

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
      Staking,
      AMOY_STAKING_CONTRACT_ADDRESS,
      process.env.PROVIDER_URL,
      ADMIN_TESTING_PRIVATE_KEY
    )

    notAdminProvider = new SelfProvider(
      Staking,
      AMOY_STAKING_CONTRACT_ADDRESS,
      process.env.PROVIDER_URL,
      TESTING_PRIVATE_KEY
    )

    signerAddress = provider.contract.signer?.address || ''

    if (!signerAddress) {
      throw new Error('signer address is not defined')
    }

    await setPause(provider, false)
    await approveTokenAmount(factrTokenContract, provider, BigInt(0))
  })

  beforeEach(() => {
    timekeeper.reset()
  })

  describe('Constant Variables', () => {
    it('success - percentage multiplier', async () => {
      expect(provider.contract.PERCENTAGE_MULTIPLIER).toBe(BigInt('100'))
    })

    it('success - get min stake amount', async () => {
      expect(provider.contract.MIN_STAKE_AMOUNT).toBe(
        BigInt('1000000000000000000000')
      )
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
    describe('addPlan()', () => {
      it('failure - not an admin', async () => {
        const res = notAdminProvider.contract.addPlan(
          BigInt(180 * 24 * 60 * 60),
          BigInt(25)
        )

        await expect(res).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })

      it('failure - lockDuration is less than 0', async () => {
        const res = provider.contract.addPlan(BigInt(-1), BigInt(25))

        await expect(res).rejects.toThrow(
          stakingErrorMessage.nonNegativeLockDuration
        )
      })

      it('failure - apy is less than 0', async () => {
        const res = provider.contract.addPlan(BigInt(0), BigInt(-1))

        await expect(res).rejects.toThrow(stakingErrorMessage.nonNegativeApy)
      })

      it('success - the plan is registered', async () => {
        const res = provider.contract.addPlan(
          BigInt(180 * 24 * 60 * 60),
          BigInt(25)
        )

        await expect(res).resolves.not.toThrow()
      })
    })

    describe('stakingEndTime()', () => {
      it('success - get staking end time', async () => {
        const res = await provider.contract.stakingEndTime()

        expect(typeof res).toBe('bigint')
      })
    })

    describe('stake()', () => {
      it('failure - Contract is paused', async () => {
        const tx = await provider.contract.pause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(
          provider.contract.stake(BigInt(0), BigInt(0))
        ).rejects.toThrow(commonErrorMessage.contractIsPaused)

        const tx2 = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx2
        )
      })

      it('failure - Plan Id does not exist', async () => {
        const planId = BigInt(9999) // Assuming 999 is an invalid plan ID
        const amount = provider.contract.MIN_STAKE_AMOUNT

        await expect(provider.contract.stake(planId, amount)).rejects.toThrow(
          stakingErrorMessage.invalidPlanId
        )
      })

      it('failure - Amount is less than MIN_STAKE_AMOUNT', async () => {
        const planId = BigInt(0) // Assuming 0 is a valid plan ID
        const amount = provider.contract.MIN_STAKE_AMOUNT - BigInt(1)

        await expect(provider.contract.stake(planId, amount)).rejects.toThrow(
          stakingErrorMessage.stakeAmountTooLow
        )
      })

      it('failure - Staking end time is in the past', async () => {
        const planId = BigInt(0)
        const amount = provider.contract.MIN_STAKE_AMOUNT
        const stakingEndTime = await provider.contract.stakingEndTime()

        timekeeper.travel(Number(stakingEndTime) * 1000 + 500)

        await expect(provider.contract.stake(planId, amount)).rejects.toThrow(
          stakingErrorMessage.stakingHasEnded
        )

        timekeeper.reset()
      })

      it('failure - Amount has not been pre-approved', async () => {
        const planId = BigInt(0)
        const amount = provider.contract.MIN_STAKE_AMOUNT

        await expect(provider.contract.stake(planId, amount)).rejects.toThrow(
          'ERC20: insufficient allowance'
        )
      })

      it('success - Stake MIN_STAKE_AMOUNT', async () => {
        const planId = BigInt(0)
        const amount = provider.contract.MIN_STAKE_AMOUNT

        await approveTokenAmount(factrTokenContract, provider, amount)
        await expect(
          provider.contract.stake(planId, amount)
        ).resolves.not.toThrow()
      })

      it('success - Stake using latest plan Id', async () => {
        const plans = await provider.contract.getPlans()
        const latestPlanId = BigInt(plans.length - 1)
        const amount = provider.contract.MIN_STAKE_AMOUNT

        await approveTokenAmount(factrTokenContract, provider, amount)
        await expect(
          provider.contract.stake(latestPlanId, amount)
        ).resolves.not.toThrow()
      })
    })

    describe('unstake()', () => {
      it('failure - Negative stake index', async () => {
        const stakeIndex = BigInt(-1)

        await expect(provider.contract.unstake(stakeIndex)).rejects.toThrow(
          stakingErrorMessage.nonNegativeIndexId
        )
      })

      it('failure - Contract is paused', async () => {
        const tx = await provider.contract.pause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(provider.contract.unstake(BigInt(0))).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )

        const tx2 = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx2
        )
      })

      it('failure - Stake Id does not exist', async () => {
        const stakeIndex = BigInt(999)

        await expect(provider.contract.unstake(stakeIndex)).rejects.toThrow(
          stakingErrorMessage.invalidStakeIndex
        )
      })

      it('failure - Stake is already unstaked', async () => {
        const stakeIndex = BigInt(0)
        const userStake = await provider.contract.getUserStake(
          provider.contract.signer!.address,
          stakeIndex
        )

        if (!userStake.unstaked) {
          const tx = await provider.contract.unstake(stakeIndex)

          await waitUntilConfirmationCompleted(
            provider.contract.jsonRpcProvider,
            tx
          )
        }

        await expect(provider.contract.unstake(stakeIndex)).rejects.toThrow(
          stakingErrorMessage.stakeAlreadyUnstaked
        )
      })

      it('failure - Stake is locked', async () => {
        const stakeIndex = BigInt(4)

        timekeeper.travel(new Date('2020-01-01T00:00:00Z'))

        await expect(provider.contract.unstake(stakeIndex)).rejects.toThrow(
          stakingErrorMessage.stakeIsLocked
        )

        timekeeper.reset()
      })

      it('success - Unstake successfully', async () => {
        const planId = BigInt(0)
        const amount = provider.contract.MIN_STAKE_AMOUNT
        const totalUserStakes = await provider.contract.getUserTotalStakes(
          provider.contract.signer!.address
        )

        await approveTokenAmount(factrTokenContract, provider, amount)

        const tx = await provider.contract.stake(planId, amount)

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(
          provider.contract.unstake(BigInt(totalUserStakes))
        ).resolves.not.toThrow()
      })
    })

    describe('restake', () => {
      it('failure - Negative stake index', async () => {
        const planId = BigInt(-1)
        const stakeIndex = BigInt(0)

        await expect(
          provider.contract.restake(planId, stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)
      })

      it('failure - Negative stake index', async () => {
        const planId = BigInt(0)
        const stakeIndex = BigInt(-1)

        await expect(
          provider.contract.restake(planId, stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeIndexId)
      })

      it('failure - Contract is paused', async () => {
        const tx = await provider.contract.pause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(
          provider.contract.restake(BigInt(0), BigInt(0))
        ).rejects.toThrow(commonErrorMessage.contractIsPaused)

        const tx2 = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx2
        )
      })

      it('failure - Invalid plan Id', async () => {
        await expect(
          provider.contract.restake(BigInt(999), BigInt(0))
        ).rejects.toThrow(stakingErrorMessage.invalidPlanId)
      })

      it('failure - Staking has ended', async () => {
        timekeeper.travel(new Date('2050-01-01T00:00:00Z'))

        await expect(
          provider.contract.restake(BigInt(0), BigInt(0))
        ).rejects.toThrow(stakingErrorMessage.stakingHasEnded)

        timekeeper.reset()
      })

      it('failure - Stake already unstaked', async () => {
        const stakeIndex = BigInt(0)
        const userStake = await provider.contract.getUserStake(
          provider.contract.signer!.address,
          stakeIndex
        )

        if (!userStake.unstaked) {
          const tx = await provider.contract.unstake(stakeIndex)

          await waitUntilConfirmationCompleted(
            provider.contract.jsonRpcProvider,
            tx
          )
        }

        await expect(
          provider.contract.restake(BigInt(0), BigInt(0))
        ).rejects.toThrow(stakingErrorMessage.stakeAlreadyUnstaked)
      })

      it.skip('failure - Stake is locked', async () => {
        timekeeper.travel(new Date('2020-01-01T00:00:00Z'))

        await expect(
          provider.contract.restake(BigInt(0), BigInt(7))
        ).rejects.toThrow(stakingErrorMessage.stakeIsLocked)

        timekeeper.reset()
      })

      it.skip('success - Restake successfully', async () => {
        const planId = BigInt(0)
        const stakeIndex = BigInt(6)

        await expect(
          provider.contract.restake(planId, stakeIndex)
        ).resolves.not.toThrow()
      })
    })

    describe('getUserStakes()', () => {
      it('failure - wrong address format', async () => {
        const res = provider.contract.getUserStakes(`0xinvalid`)

        await expect(res).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })

      it('success - get user total stakes', async () => {
        const res = await provider.contract.getUserStakes(signerAddress)

        expect(Array.isArray(res)).toBe(true)
      })
    })

    describe('setDates()', () => {
      it('failure - Negative dates', async () => {
        let stakingEndTime = -1
        let rewardsEndTime = 0

        await expect(
          provider.contract.setDates(stakingEndTime, rewardsEndTime)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeDates)

        stakingEndTime = -2
        rewardsEndTime = -1

        await expect(
          provider.contract.setDates(stakingEndTime, rewardsEndTime)
        ).rejects.toThrow(stakingErrorMessage.nonNegativeDates)
      })

      it('failure - return error if not the admin calls this function', async () => {
        const res = notAdminProvider.contract.setDates(1609545600, 1609459200)

        await expect(res).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })

      it('failure - staking end time < rewards end time', async () => {
        await expect(
          provider.contract.setDates(1609459200, 1609545600)
        ).rejects.toThrow(stakingErrorMessage.stakingCantBeLessThanRewardsEnd)
      })

      it.skip('success - set dates successfully', async () => {
        await expect(
          provider.contract.setDates(1609545600, 1609459200)
        ).resolves.not.toThrow()
      })
    })

    describe('withdraw()', () => {
      it('failure - return error if not the admin calls this function', async () => {
        const res = notAdminProvider.contract.withdraw(
          FACTR_TOKEN_ADDRESS,
          '0xinvalid'
        )

        await expect(res).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })

      it('failure - invalid token address format', async () => {
        await expect(
          provider.contract.withdraw('0xinvalid', '0xinvalid')
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })

      it('failure - invalid recipient address format', async () => {
        await expect(
          provider.contract.withdraw(FACTR_TOKEN_ADDRESS, '0xinvalid')
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })

      it.skip('success - withdraw successfully', async () => {
        await expect(
          provider.contract.withdraw(FACTR_TOKEN_ADDRESS, signerAddress)
        ).resolves.not.toThrow()
      })
    })

    describe('claimRewards()', () => {
      it('failure - contract is paused', async () => {
        const tx = await provider.contract.pause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx
        )

        await expect(provider.contract.claimRewards(BigInt(0))).rejects.toThrow(
          commonErrorMessage.contractIsPaused
        )

        const tx2 = await provider.contract.unpause()

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          tx2
        )
      })

      it('failure - stake is already unstaked', async () => {
        const stakeIndex = BigInt(0)
        // const unstakeTx = await provider.contract.unstake(stakeIndex)

        // await waitUntilConfirmationCompleted(
        //   provider.contract.jsonRpcProvider,
        //   unstakeTx
        // )

        await expect(
          provider.contract.claimRewards(stakeIndex)
        ).rejects.toThrow(stakingErrorMessage.stakeAlreadyUnstaked)
      })

      it('success - rewards claimed successfully', async () => {
        const totalStakes =
          await provider.contract.getUserTotalStakes(signerAddress)
        const amount = provider.contract.MIN_STAKE_AMOUNT

        await approveTokenAmount(factrTokenContract, provider, amount)

        const stakeTx = await provider.contract.stake(
          BigInt(0),
          provider.contract.MIN_STAKE_AMOUNT
        )

        await waitUntilConfirmationCompleted(
          provider.contract.jsonRpcProvider,
          stakeTx
        )

        const claimTx = provider.contract.claimRewards(BigInt(totalStakes))

        await expect(claimTx).resolves.not.toThrow()
      })
    })

    describe('balanceOf()', () => {
      it('failure - wrong address format', async () => {
        const invalidAddress = 'invalid_address'

        await expect(
          provider.contract.balanceOf(invalidAddress)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })

      it('success - get balance of a valid address', async () => {
        const validAddress = signerAddress
        const balance = await provider.contract.balanceOf(validAddress)

        expect(typeof balance).toBe('bigint')
      })
    })
  })

  describe('Views', () => {
    describe('getPlans()', () => {
      it('success - get plans', async () => {
        const plans = await provider.contract.getPlans()

        for (let i = 0; i < defaultPlans.length; i++) {
          expect(plans[i].lockDuration).toBe(defaultPlans[i].lockDuration)
          expect(plans[i].apy).toBe(defaultPlans[i].apy)
        }
      })
    })
  })
})
