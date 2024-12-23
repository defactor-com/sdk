import timekeeper from 'timekeeper'

import { commonErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import { Role } from '../../src/utilities/util'
import { Vesting } from '../../src/vesting'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  SECOND_TESTING_PRIVATE_KEY,
  VESTING_CONTRACT_ADDRESS,
  loadEnv,
  waitUntilConfirmationCompleted
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Vesting', () => {
  let provider: SelfProvider<Vesting>
  let notAdminProvider: SelfProvider<Vesting>
  let signerAddress: string

  beforeAll(async () => {
    await loadEnv()

    if (!process.env.PROVIDER_URL) {
      throw new Error('PROVIDER_URL is not defined')
    }

    provider = new SelfProvider(
      Vesting,
      VESTING_CONTRACT_ADDRESS,
      process.env.PROVIDER_URL,
      ADMIN_TESTING_PRIVATE_KEY
    )

    notAdminProvider = new SelfProvider(
      Vesting,
      VESTING_CONTRACT_ADDRESS,
      process.env.PROVIDER_URL,
      SECOND_TESTING_PRIVATE_KEY
    )

    signerAddress = provider.contract.signer?.address || ''

    if (!signerAddress) {
      throw new Error('signer address is not defined')
    }
  })

  beforeEach(() => {
    timekeeper.reset()
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

  describe('Views', () => {
    it('success - get the operator role', async () => {
      const operatorRole =
        await provider.contract.contract.OPERATOR_ROLE.staticCallResult()

      expect(Role.OPERATOR).toBe(operatorRole[0])
    })
  })
})
