import timekeeper from 'timekeeper'

import { Erc20 } from '../../src'
import {
  commonErrorMessage,
  stakingErrorMessage
} from '../../src/errors/error-messages'
import { SelfProvider } from '../../src/provider'
import { Staking } from '../../src/staking'
import { Plan } from '../../src/types/staking'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  AMOY_STAKING_CONTRACT_ADDRESS,
  TESTING_PRIVATE_KEY,
  USD_TOKEN_ADDRESS,
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
  let usdcTokenContract: Erc20

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

    usdcTokenContract = new Erc20(
      USD_TOKEN_ADDRESS,
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
    await approveTokenAmount(usdcTokenContract, provider, BigInt(0))
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
