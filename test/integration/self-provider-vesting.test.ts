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
  ONE_YEAR_SEC,
  SECOND_TESTING_PRIVATE_KEY,
  VESTING_CONTRACT_ADDRESS,
  getUnixEpochTime,
  loadEnv,
  waitUntilConfirmationCompleted
} from '../test-util'

jest.setTimeout(300000)

describe('SelfProvider - Vesting', () => {
  let provider: SelfProvider<Vesting>
  let notAdminProvider: SelfProvider<Vesting>
  let signerAddress: string
  let notAdminSignerAddress: string
  let validSchedule: VestingSchedule
  const multipleValidSchedule: Array<VestingSchedule> = []
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

  const computeTreeAux = (
    tree: Array<string>,
    hashFunction: (hash0: string, hash1: string) => string
  ): string => {
    if (tree.length <= 1) {
      return tree[0] || ''
    }

    const [hash0, hash1, ...subTree] = tree
    const parent = hashFunction(hash0, hash1)

    return computeTreeAux([parent, ...subTree], hashFunction)
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

    notAdminSignerAddress = provider.contract.signer?.address || ''

    if (!notAdminSignerAddress) {
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

    multipleValidSchedule.push({
      ...validSchedule,
      duration: BigInt(ONE_YEAR_SEC),
      amount: BigInt(0.25 * 1e18)
    })
    multipleValidSchedule.push({
      ...validSchedule,
      duration: BigInt(ONE_YEAR_SEC),
      beneficiary: notAdminSignerAddress,
      amount: BigInt(0.15 * 1e18)
    })
    multipleValidSchedule.push({
      ...validSchedule,
      amount: BigInt(0.5 * 1e18),
      cliff: validSchedule.start + BigInt(ONE_YEAR_SEC),
      duration: BigInt(2 * ONE_YEAR_SEC),
      initialAmount: BigInt(0.1 * 1e18)
    })
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
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'Ivalid merkletree root'
          )
        }
      })
      it('success - release from a valid schedule', async () => {
        await expect(
          provider.contract.release(validSchedule, [])
        ).resolves.not.toThrow()
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
      it('success - add valid merkle tree root with multiple schedules', async () => {
        const hashes = multipleValidSchedule.map(schedule =>
          provider.contract.getScheduleHash(schedule)
        )
        const hashFunction = (hash0: string, hash1: string) =>
          provider.contract.getComputedRoot(hash0, [hash1])
        const root = computeTreeAux(hashes, hashFunction)

        await expect(
          provider.contract.addValidMerkletreeRoot(root, true)
        ).resolves.not.toThrow()
      })
      it('success - remove a valid merkle tree root', async () => {
        const root = provider.contract.getScheduleHash(dummySchedule)

        await expect(
          provider.contract.addValidMerkletreeRoot(root, false)
        ).resolves.not.toThrow()
      })
    })
    describe('revokeSchedules()', () => {
      it('failure - the leafs array is empty', async () => {
        const root = 'root'

        await expect(
          notAdminProvider.contract.revokeSchedules(root, [])
        ).rejects.toThrow(vestingErrorMessage.leafsArrayIsEmpty)
      })
      it('failure - the root is not a valid byte like string', async () => {
        const root = 'root'

        await expect(
          notAdminProvider.contract.revokeSchedules('0xInvalidHash', [root])
        ).rejects.toThrow(commonErrorMessage.invalidBytesLike)
      })
      it('failure - the address is not the operator', async () => {
        const root = provider.contract.getScheduleHash(dummySchedule)

        await expect(
          notAdminProvider.contract.revokeSchedules(root, [root])
        ).rejects.toThrow(vestingErrorMessage.addressIsNotOperator)
      })
      it('success - revoke a schedule', async () => {
        const hashes = multipleValidSchedule.map(schedule =>
          provider.contract.getScheduleHash(schedule)
        )
        const hashFunction = (hash0: string, hash1: string) =>
          provider.contract.getComputedRoot(hash0, [hash1])
        const root = computeTreeAux(hashes, hashFunction)

        await expect(
          provider.contract.revokeSchedules(root, [hashes[1]])
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
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'Ivalid merkletree root'
          )
        }
      })
      it('failure - invalid merkle tree', async () => {
        const hash = provider.contract.getScheduleHash(dummySchedule)
        const root = provider.contract.getComputedRoot(hash, [])

        try {
          await notAdminProvider.contract.getReleasableAmount(dummySchedule, [
            root
          ])
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'Ivalid merkletree root'
          )
        }
      })
      it('failure - the schedule was revoked', async () => {
        const schedule = multipleValidSchedule[1]
        const hashes = multipleValidSchedule.map(schedule =>
          provider.contract.getScheduleHash(schedule)
        )

        try {
          await notAdminProvider.contract.getReleasableAmount(schedule, [
            hashes[0],
            hashes[2]
          ])
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'This schedule was revoked'
          )
        }
      })
      it('success - get the releasable amount', async () => {
        const releasableAmount = await provider.contract.getReleasableAmount(
          validSchedule,
          []
        )
        const releasedAmount = await provider.contract.getReleasedAmount(
          validSchedule,
          []
        )

        expect(typeof releasableAmount).toBe('bigint')
        expect(releasableAmount).toBeGreaterThanOrEqual(BigInt(0))
        expect(releasableAmount).toBe(
          validSchedule.amount + validSchedule.initialAmount - releasedAmount
        )
      })
      it('success - get the releasable amount when duration has not passed', async () => {
        const schedule = multipleValidSchedule[0]
        const hashes = multipleValidSchedule.map(schedule =>
          provider.contract.getScheduleHash(schedule)
        )
        const releasableAmount = await provider.contract.getReleasableAmount(
          schedule,
          [hashes[1], hashes[2]]
        )

        expect(typeof releasableAmount).toBe('bigint')
        expect(releasableAmount).toBeGreaterThanOrEqual(schedule.initialAmount)
        expect(releasableAmount).toBeLessThan(
          schedule.amount + schedule.initialAmount
        )
      })
      it('success - get the releasable amount when cliff is not over', async () => {
        const schedule = multipleValidSchedule[2]
        const hashes = multipleValidSchedule.map(schedule =>
          provider.contract.getScheduleHash(schedule)
        )
        const root = provider.contract.getComputedRoot(hashes[0], [hashes[1]])
        const releasableAmount = await provider.contract.getReleasableAmount(
          schedule,
          [root]
        )

        expect(schedule.cliff).toBeGreaterThan(getUnixEpochTime())
        expect(typeof releasableAmount).toBe('bigint')
        expect(releasableAmount).toBe(schedule.initialAmount)
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
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'Ivalid merkletree root'
          )
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
