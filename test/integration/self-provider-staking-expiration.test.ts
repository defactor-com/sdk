import { ethers } from 'ethers'
import timekeeper from 'timekeeper'

import { stakingErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import { StakingExpiration } from '../../src/staking'
import { Plan } from '../../src/types/staking'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  AMOY_STAKING_CONTRACT_ADDRESS,
  FACTR_TOKEN_ADDRESS,
  MAX_BIGINT,
  loadEnv
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Staking with plan Expiration', () => {
  let provider: SelfProvider<StakingExpiration>
  let signerAddress: string
  let baseToken: string
  const expirationTime = BigInt(1765052950)
  const defaultPlans: ReadonlyArray<Plan> = [
    {
      lockDuration: BigInt(0),
      expires: BigInt(0),
      apy: BigInt(5)
    },
    {
      lockDuration: BigInt(30 * 24 * 60 * 60),
      expires: BigInt(0),
      apy: BigInt(8)
    },
    {
      lockDuration: BigInt(90 * 24 * 60 * 60),
      expires: BigInt(0),
      apy: BigInt(10)
    },
    {
      lockDuration: BigInt(180 * 24 * 60 * 60),
      expires: BigInt(0),
      apy: BigInt(20)
    },
    {
      lockDuration: BigInt(360 * 24 * 60 * 60),
      expires: BigInt(0),
      apy: BigInt(40)
    }
  ]

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    baseToken = FACTR_TOKEN_ADDRESS
    provider = new SelfProvider(
      StakingExpiration,
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
    it('success - get base token address', async () => {
      const baseTokenAddress = await provider.contract.getBaseTokenAddress()

      expect(ethers.isAddress(baseTokenAddress)).toBe(true)
      expect(baseTokenAddress).toBe(baseToken)
    })
  })

  describe('Functions', () => {
    describe('setPlanExpiration()', () => {
      it('failure - Plan Id does not exist', async () => {
        const planId = MAX_BIGINT
        const expiration = BigInt(0)

        await expect(
          provider.contract.setPlanExpiration(planId, expiration)
        ).rejects.toThrow(stakingErrorMessage.invalidPlanId)
      })
      it('failure - Expiration is negative', async () => {
        const planId = BigInt(0)
        const expiration = BigInt(-5)

        await expect(
          provider.contract.setPlanExpiration(planId, expiration)
        ).rejects.toThrow(stakingErrorMessage.nonNegativePlanExpiration)
      })
      it('success - Set new Expiration time', async () => {
        const planId = BigInt(0)
        const expiration = expirationTime

        await expect(
          provider.contract.setPlanExpiration(planId, expiration)
        ).resolves.not.toThrow()
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
          expect(plans[i].expires).toBe(
            i > 0 ? defaultPlans[i].expires : expirationTime
          )
        }
      })
    })
  })
})
