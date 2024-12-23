import { ethers, isError } from 'ethers'
import timekeeper from 'timekeeper'

import { commonErrorMessage, vestingErrorMessage } from '../../src/errors'
import { SelfProvider } from '../../src/provider'
import { VestingSchedule } from '../../src/types/vesting'
import { Role } from '../../src/utilities/util'
import { Vesting } from '../../src/vesting'
import {
  ADMIN_TESTING_PRIVATE_KEY,
  FACTR_TOKEN_ADDRESS,
  ONE_SEC,
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
  let validSchedule: VestingSchedule
  const dummySchedule = {
    cliff: BigInt(0),
    start: BigInt(0),
    duration: BigInt(0),
    secondsPerSlice: BigInt(0),
    beneficiary: ethers.ZeroAddress,
    tokenAddress: ethers.ZeroAddress,
    amount: BigInt(1_000000),
    initialAmount: BigInt(0)
  }

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

    validSchedule = {
      cliff: BigInt(0),
      start: BigInt(1734994292),
      duration: BigInt(60 * ONE_SEC),
      secondsPerSlice: BigInt((60 * ONE_SEC) / 4),
      beneficiary: signerAddress,
      tokenAddress: FACTR_TOKEN_ADDRESS,
      amount: BigInt(1) * BigInt(1e18), // 1 FACTR
      initialAmount: BigInt(0)
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

  describe('Functions', () => {
    describe('release()', () => {
      it('failure - the address is not the beneficiary', async () => {
        await expect(
          notAdminProvider.contract.release(dummySchedule, [])
        ).rejects.toThrow(vestingErrorMessage.onlyBeneficiaryOrOperator)
      })
      it('failure - the address is not the operator', async () => {
        const scheduleWithBeneficiary = {
          ...dummySchedule,
          beneficiary: notAdminProvider.contract.signer!.address
        }

        await expect(
          notAdminProvider.contract.release(scheduleWithBeneficiary, [])
        ).rejects.toThrow(vestingErrorMessage.onlyBeneficiaryOrOperator)
      })
      it('failure - invalid merkle tree', async () => {
        const scheduleWithBeneficiary = {
          ...dummySchedule,
          beneficiary: notAdminProvider.contract.signer!.address
        }

        expect.assertions(1)

        try {
          await provider.contract.release(scheduleWithBeneficiary, [])
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
    })
    describe('addValidMerkletreeRoot()', () => {
      it('failure - the root is not a valid byte like string', async () => {
        const root = 'root'

        await expect(
          notAdminProvider.contract.addValidMerkletreeRoot(root, true)
        ).rejects.toThrow(commonErrorMessage.invalidBytesLike)
      })
      it('failure - the address is not the operator', async () => {
        const root = provider.contract.getScheduleHash(dummySchedule)

        await expect(
          notAdminProvider.contract.addValidMerkletreeRoot(root, true)
        ).rejects.toThrow(vestingErrorMessage.addressIsNotOperator)
      })
      it('success - add valid merkle tree root', async () => {
        const root = provider.contract.getScheduleHash(validSchedule)

        await expect(
          provider.contract.addValidMerkletreeRoot(root, true)
        ).resolves.not.toThrow()
      })
    })
  })

  describe('Views', () => {
    it('success - get the operator role', async () => {
      const operatorRole =
        await provider.contract.contract.OPERATOR_ROLE.staticCallResult()

      expect(Role.OPERATOR).toBe(operatorRole[0])
    })
    describe('getScheduleHash', () => {
      it('failure - token address is not a valid address', async () => {
        const schedule = { ...dummySchedule, tokenAddress: '0xInvalid' }

        try {
          provider.contract.getScheduleHash(schedule)
        } catch (error) {
          expect(error instanceof Error)
          expect((error as Error).message).toBe(
            commonErrorMessage.wrongAddressFormat
          )
        }
      })
      it('failure - cliff is bigger than 64 bits', async () => {
        const schedule = { ...dummySchedule, cliff: BigInt(1) << BigInt(128) }

        try {
          provider.contract.getScheduleHash(schedule)
        } catch (error) {
          expect(error instanceof Error)
          expect((error as Error).message).toBe(
            commonErrorMessage.nonGreaterThan('cliff', '64 bits')
          )
        }
      })
      it('success - get the schedule hash', async () => {
        const hash = provider.contract.getScheduleHash(dummySchedule)

        expect(ethers.isBytesLike(hash)).toBe(true)
      })
    })
    describe('getComputedRoot', () => {
      it('failure - invalid hashed in the proof', async () => {
        const hash = provider.contract.getScheduleHash(dummySchedule)

        try {
          provider.contract.getComputedRoot(hash, [hash, ethers.ZeroAddress])
        } catch (error) {
          expect(error instanceof Error)
          expect((error as Error).message).toBe(
            commonErrorMessage.invalidBytesLike
          )
        }
      })
      it('success - get the computed root using the proof array', async () => {
        const hash = provider.contract.getScheduleHash(dummySchedule)
        const root = provider.contract.getComputedRoot(hash, [])

        expect(ethers.isBytesLike(root)).toBe(true)
        expect(root).toBe(hash)
      })
    })
    describe('getReleasableAmount()', () => {
      it('failure - invalid merkle tree', async () => {
        const scheduleWithBeneficiary = {
          ...dummySchedule,
          beneficiary: notAdminProvider.contract.signer!.address
        }

        expect.assertions(1)

        try {
          await provider.contract.getReleasableAmount(
            scheduleWithBeneficiary,
            []
          )
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('success - get the releasable amount', async () => {
        const releasableAmount = await provider.contract.getReleasableAmount(
          validSchedule,
          []
        )

        expect(typeof releasableAmount).toBe('bigint')
        expect(releasableAmount).toBeGreaterThanOrEqual(BigInt(0))
      })
    })
    describe('getReleasedAmount()', () => {
      it('failure - invalid merkle tree', async () => {
        const scheduleWithBeneficiary = {
          ...dummySchedule,
          beneficiary: notAdminProvider.contract.signer!.address
        }

        expect.assertions(1)

        try {
          await provider.contract.getReleasedAmount(scheduleWithBeneficiary, [])
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
        }
      })
      it('success - get the released amount', async () => {
        const releasedAmount = await provider.contract.getReleasedAmount(
          validSchedule,
          []
        )

        expect(typeof releasedAmount).toBe('bigint')
        expect(releasedAmount).toBeGreaterThanOrEqual(BigInt(0))
      })
    })
  })
})
