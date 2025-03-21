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
  let dummySchedule: VestingSchedule
  let validSchedule: VestingSchedule
  let notStartedSchedule: VestingSchedule
  const multipleValidSchedule: Array<VestingSchedule> = []

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

    dummySchedule = {
      cliff: BigInt(0),
      start: BigInt(0),
      duration: BigInt(0),
      secondsPerSlice: BigInt(0),
      beneficiary: signerAddress,
      tokenAddress: FACTR_TOKEN_ADDRESS,
      amount: BigInt(1) * BigInt(1e18), // 1 FACTR
      initialAmount: BigInt(0)
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

    notStartedSchedule = {
      cliff: BigInt(0),
      start: BigInt(1801668561), // 02/03/2027
      duration: BigInt(ONE_YEAR_SEC),
      secondsPerSlice: BigInt(ONE_YEAR_SEC / 4),
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
    describe('requestWithdraw()', () => {
      it('failure - the address is not the admin', async () => {
        await expect(
          notAdminProvider.contract.requestWithdraw([FACTR_TOKEN_ADDRESS])
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('failure - the token array is empty', async () => {
        await expect(provider.contract.requestWithdraw([])).rejects.toThrow(
          vestingErrorMessage.tokensArrayIsEmpty
        )
      })
      it('failure - the token address is invalid', async () => {
        await expect(
          provider.contract.requestWithdraw(['0xInvalid'])
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the token address is zero', async () => {
        await expect(
          provider.contract.requestWithdraw([
            FACTR_TOKEN_ADDRESS,
            ethers.ZeroAddress
          ])
        ).rejects.toThrow(commonErrorMessage.nonZeroAddress)
      })
      it('success - request withdraw', async () => {
        await expect(
          provider.contract.requestWithdraw([FACTR_TOKEN_ADDRESS])
        ).resolves.not.toThrow()
      })
    })
    describe('withdraw()', () => {
      it('failure - the address is not the admin', async () => {
        await expect(
          notAdminProvider.contract.withdraw(
            [FACTR_TOKEN_ADDRESS],
            signerAddress
          )
        ).rejects.toThrow(commonErrorMessage.addressIsNotAdmin)
      })
      it('failure - the token array is empty', async () => {
        await expect(
          provider.contract.withdraw([], signerAddress)
        ).rejects.toThrow(vestingErrorMessage.tokensArrayIsEmpty)
      })
      it('failure - the token address is invalid', async () => {
        await expect(
          provider.contract.withdraw(['0xInvalid'], signerAddress)
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the token address is zero', async () => {
        await expect(
          provider.contract.withdraw(
            [FACTR_TOKEN_ADDRESS, ethers.ZeroAddress],
            signerAddress
          )
        ).rejects.toThrow(commonErrorMessage.nonZeroAddress)
      })
      it('failure - the signer address is invalid', async () => {
        await expect(
          provider.contract.withdraw([FACTR_TOKEN_ADDRESS], '0xInvalid')
        ).rejects.toThrow(commonErrorMessage.wrongAddressFormat)
      })
      it('failure - the signer address is zero', async () => {
        await expect(
          provider.contract.withdraw([FACTR_TOKEN_ADDRESS], ethers.ZeroAddress)
        ).rejects.toThrow(commonErrorMessage.nonZeroAddress)
      })
      it('failure - the 30 days after request has not passed', async () => {
        expect.assertions(2)

        try {
          await provider.contract.withdraw([FACTR_TOKEN_ADDRESS], signerAddress)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'Not enough time has pased'
          )
        }
      })
      it.skip('success - withdraw', async () => {
        await expect(
          provider.contract.withdraw([FACTR_TOKEN_ADDRESS], signerAddress)
        ).resolves.not.toThrow()
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
          beneficiary: signerAddress
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

        expect.assertions(2)

        try {
          await provider.contract.release(scheduleWithBeneficiary, [])
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'Ivalid merkletree root'
          )
        }
      })
      it('failure - schedule not started', async () => {
        expect(notStartedSchedule.start > getUnixEpochTime())

        const merkleTree = provider.contract.buildMerkletree([
          notStartedSchedule
        ])

        await provider.contract.addValidMerkletreeRoot(merkleTree.root, true)

        await expect(
          provider.contract.release(notStartedSchedule, [])
        ).rejects.toThrow(vestingErrorMessage.startTimeNotReached)

        try {
          const pop =
            await provider.contract.contract.release.populateTransaction(
              notStartedSchedule,
              []
            )

          await provider.contract.signer!.sendTransaction(pop)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(17)
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
        const tree = provider.contract.buildMerkletree(multipleValidSchedule)

        await expect(
          provider.contract.addValidMerkletreeRoot(tree.root, true)
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
        const tree = provider.contract.buildMerkletree(multipleValidSchedule)
        const proof = provider.contract.getProof(multipleValidSchedule[1], tree)

        await expect(
          provider.contract.revokeSchedules(tree.root, proof)
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
      it('failure - beneficiary address is zero address', async () => {
        const schedule = { ...dummySchedule, beneficiary: ethers.ZeroAddress }

        try {
          provider.contract.getScheduleHash(schedule)
        } catch (error) {
          expect(error instanceof Error)
          expect((error as Error).message).toBe(
            commonErrorMessage.nonZeroAddress
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

        expect.assertions(2)

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
        const merkleTree = provider.contract.buildMerkletree(
          multipleValidSchedule
        )
        const proof = provider.contract.getProof(schedule, merkleTree)

        try {
          await notAdminProvider.contract.getReleasableAmount(schedule, proof)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'This schedule was revoked'
          )
        }
      })
      it('failure - schedule not started', async () => {
        const releasableAmount = await provider.contract.getReleasableAmount(
          notStartedSchedule,
          []
        )

        expect(notStartedSchedule.start > getUnixEpochTime())
        expect(releasableAmount).toBe(BigInt(0))

        try {
          const pop =
            await provider.contract.contract.getReleasableAmount.populateTransaction(
              notStartedSchedule,
              []
            )

          await provider.contract.signer!.sendTransaction(pop)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(17)
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
        const merkleTree = provider.contract.buildMerkletree(
          multipleValidSchedule
        )
        const proof = provider.contract.getProof(schedule, merkleTree)
        const releasableAmount = await provider.contract.getReleasableAmount(
          schedule,
          proof
        )

        expect(typeof releasableAmount).toBe('bigint')
        expect(releasableAmount).toBeGreaterThanOrEqual(schedule.initialAmount)
        expect(releasableAmount).toBeLessThan(
          schedule.amount + schedule.initialAmount
        )
      })
      it('success - get the releasable amount when cliff is not over', async () => {
        const schedule = multipleValidSchedule[2]
        const merkleTree = provider.contract.buildMerkletree(
          multipleValidSchedule
        )
        const proof = provider.contract.getProof(schedule, merkleTree)
        const releasableAmount = await provider.contract.getReleasableAmount(
          schedule,
          proof
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

        expect.assertions(2)

        try {
          await provider.contract.getReleasedAmount(scheduleWithBeneficiary, [])
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(
            'Ivalid merkletree root'
          )
        }
      })
      it('failure - schedule not started', async () => {
        const releasedAmount = await provider.contract.getReleasedAmount(
          notStartedSchedule,
          []
        )

        expect(notStartedSchedule.start > getUnixEpochTime())
        expect(releasedAmount).toBe(BigInt(0))

        try {
          const pop =
            await provider.contract.contract.getReleasedAmount.populateTransaction(
              notStartedSchedule,
              []
            )

          await provider.contract.signer!.sendTransaction(pop)
        } catch (error) {
          expect(isError(error, 'CALL_EXCEPTION')).toBeTruthy()
          expect((error as ethers.CallExceptionError).revert?.args[0]).toBe(17)
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

  describe('Utils - openzeppelin / merkletree', () => {
    describe('buildMerkleTree()', () => {
      it('success - compute same root', () => {
        const merkleTree = provider.contract.buildMerkletree(
          multipleValidSchedule
        )
        const leafHash = provider.contract.getScheduleHash(
          multipleValidSchedule[0]
        )
        const proof = merkleTree.getProof(leafHash)
        const root = provider.contract.getComputedRoot(leafHash, proof)

        expect(root === merkleTree.root)
        expect(merkleTree.verify(leafHash, proof)).toBe(true)
      })
      it('success - compute same root', () => {
        const multipleValidSchedule = Array.from(new Array(1500)).map(
          (_e, index) => ({
            ...validSchedule,
            duration: BigInt(index)
          })
        )
        const merkleTree = provider.contract.buildMerkletree(
          multipleValidSchedule
        )
        const proof = provider.contract.getProof(
          multipleValidSchedule[12],
          merkleTree
        )

        expect(
          provider.contract.verify(multipleValidSchedule[12], proof, merkleTree)
        ).toBe(true)
      })
    })
    describe('getProof()', () => {
      it('success - compute same root', () => {
        const merkleTree = provider.contract.buildMerkletree(
          multipleValidSchedule
        )
        const leafHash = provider.contract.getScheduleHash(
          multipleValidSchedule[1]
        )
        const proof = provider.contract.getProof(
          multipleValidSchedule[1],
          merkleTree
        )

        expect(merkleTree.verify(leafHash, proof)).toBe(true)
      })
    })
  })
})
