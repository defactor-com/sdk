import { SimpleMerkleTree } from '@openzeppelin/merkle-tree'
import { ethers } from 'ethers'

import { miscVesting } from '../artifacts'
import { BaseContract } from '../base-classes'
import { commonErrorMessage, vestingErrorMessage } from '../errors'
import { Abi, PrivateKey } from '../types/types'
import {
  AdminFunctions,
  Functions,
  OperatorFunctions,
  UtilityFunctions,
  VestingSchedule,
  Views
} from '../types/vesting'
import { Role, is32BytesString } from '../utilities/util'

export class Vesting
  extends BaseContract
  implements
    AdminFunctions,
    Functions,
    OperatorFunctions,
    UtilityFunctions,
    Views
{
  public readonly vestingScheduleInterface: Array<string>
  private readonly vestingRootInterface: Array<string>
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscVesting.abi)

    const fragment = this.contract.getFunction('release').fragment
    const input = fragment.inputs.find(input => input.name === '_schedule')

    this.vestingScheduleInterface = input!.components!.map(param => param.type)
    this.vestingRootInterface = ['bytes32', 'bytes32']
  }

  protected _checkIsOperator = async () => {
    if (this.signer) {
      const isOperator = await this.contract.hasRole(Role.OPERATOR, this.signer)

      if (!isOperator) {
        throw new Error(vestingErrorMessage.addressIsNotOperator)
      }
    }
  }

  private _checkScheduleData = (schedule: VestingSchedule) => {
    if (
      !ethers.isAddress(schedule.beneficiary) ||
      !ethers.isAddress(schedule.tokenAddress)
    ) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (
      ethers.ZeroAddress === schedule.beneficiary ||
      ethers.ZeroAddress === schedule.tokenAddress
    ) {
      throw new Error(commonErrorMessage.nonZeroAddress)
    }

    const ints64: Array<keyof typeof schedule> = [
      'cliff',
      'start',
      'duration',
      'secondsPerSlice'
    ]

    for (const int64 of ints64) {
      if (BigInt(schedule[int64]) >= BigInt(1) << BigInt(64)) {
        throw new Error(commonErrorMessage.nonGreaterThan(int64, '64 bits'))
      }

      if (BigInt(schedule[int64]) < 0) {
        throw new Error(commonErrorMessage.nonNegativeValue)
      }
    }

    const ints256: Array<keyof typeof schedule> = ['amount', 'initialAmount']

    for (const int256 of ints256) {
      if (BigInt(schedule[int256]) >= BigInt(1) << BigInt(256)) {
        throw new Error(commonErrorMessage.nonGreaterThan(int256, '256 bits'))
      }
    }

    if (schedule.initialAmount < 0) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    if (schedule.amount <= 0) {
      throw new Error(vestingErrorMessage.nonNegativeAmountOrZero)
    }
  }

  getScheduleHash = (schedule: VestingSchedule) => {
    this._checkScheduleData(schedule)

    const scheduleArray = [
      schedule.cliff,
      schedule.start,
      schedule.duration,
      schedule.secondsPerSlice,
      schedule.beneficiary,
      schedule.tokenAddress,
      schedule.amount,
      schedule.initialAmount
    ]
    const leaf = ethers.solidityPackedKeccak256(
      this.vestingScheduleInterface,
      scheduleArray
    )

    return leaf
  }

  getComputedRoot = (leaf: string, proof: Array<string>): string => {
    if (!is32BytesString(leaf) || proof.some(hash => !is32BytesString(hash))) {
      throw new Error(commonErrorMessage.invalidBytesLike)
    }

    let computedHash = leaf

    for (const proofHash of proof) {
      const children =
        BigInt(computedHash) <= BigInt(proofHash)
          ? [computedHash, proofHash]
          : [proofHash, computedHash]

      computedHash = ethers.solidityPackedKeccak256(
        this.vestingRootInterface,
        children
      )
    }

    return computedHash
  }

  getReleasedAmount = async (
    schedule: VestingSchedule,
    proof: Array<string>
  ): Promise<bigint> => {
    if (proof.some(hash => !is32BytesString(hash))) {
      throw new Error(commonErrorMessage.invalidBytesLike)
    }

    this._checkScheduleData(schedule)

    return await this.contract.getReleasedAmount(schedule, proof)
  }

  getReleasableAmount = async (
    schedule: VestingSchedule,
    proof: Array<string>
  ): Promise<bigint> => {
    if (proof.some(hash => !is32BytesString(hash))) {
      throw new Error(commonErrorMessage.invalidBytesLike)
    }

    this._checkScheduleData(schedule)

    return await this.contract.getReleasableAmount(schedule, proof)
  }

  release = async (
    schedule: VestingSchedule,
    proof: Array<string>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> => {
    if (proof.some(hash => !is32BytesString(hash))) {
      throw new Error(commonErrorMessage.invalidBytesLike)
    }

    this._checkScheduleData(schedule)

    await this._checkIsNotPaused()

    if (this.signer) {
      const isBeneficiary = this.signer.address === schedule.beneficiary
      const hasPermissions =
        isBeneficiary ||
        (await this.contract.hasRole(Role.OPERATOR, this.signer))

      if (!hasPermissions) {
        throw new Error(vestingErrorMessage.onlyBeneficiaryOrOperator)
      }
    }

    const pop = await this.contract.release.populateTransaction(schedule, proof)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  addValidMerkletreeRoot = async (
    root: string,
    value: boolean
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> => {
    if (!is32BytesString(root)) {
      throw new Error(commonErrorMessage.invalidBytesLike)
    }

    await this._checkIsOperator()

    const pop = await this.contract.addValidMerkletreeRoot.populateTransaction(
      root,
      value
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  revokeSchedules = async (
    root: string,
    leafs: Array<string>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> => {
    if (!leafs.length) {
      throw new Error(vestingErrorMessage.leafsArrayIsEmpty)
    }

    if (!is32BytesString(root) || leafs.some(hash => !is32BytesString(hash))) {
      throw new Error(commonErrorMessage.invalidBytesLike)
    }

    await this._checkIsOperator()

    const pop = await this.contract.revokeSchedules.populateTransaction(
      root,
      leafs
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  requestWithdraw = async (
    tokens: Array<string>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> => {
    if (!tokens.length) {
      throw new Error(vestingErrorMessage.tokensArrayIsEmpty)
    }

    if (tokens.some(token => !ethers.isAddress(token))) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (tokens.some(token => token === ethers.ZeroAddress)) {
      throw new Error(commonErrorMessage.nonZeroAddress)
    }

    await this._checkIsAdmin()

    const pop = await this.contract.requestWithdraw.populateTransaction(tokens)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  withdraw = async (
    tokens: Array<string>,
    recipient: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> => {
    if (!tokens.length) {
      throw new Error(vestingErrorMessage.tokensArrayIsEmpty)
    }

    if (
      recipient === ethers.ZeroAddress ||
      tokens.some(token => token === ethers.ZeroAddress)
    ) {
      throw new Error(commonErrorMessage.nonZeroAddress)
    }

    if (
      tokens.some(token => !ethers.isAddress(token)) ||
      !ethers.isAddress(recipient)
    ) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    await this._checkIsAdmin()

    const pop = await this.contract.withdraw.populateTransaction(
      tokens,
      recipient
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  buildMerkletree = (schedules: Array<VestingSchedule>): SimpleMerkleTree => {
    const hashes = schedules.map(this.getScheduleHash)

    return SimpleMerkleTree.of(hashes)
  }

  getProof = (schedule: VestingSchedule, tree: SimpleMerkleTree): string[] => {
    const hash = this.getScheduleHash(schedule)

    return tree.getProof(hash)
  }

  verify = (
    schedule: VestingSchedule,
    proof: Array<string>,
    tree: SimpleMerkleTree
  ): boolean => {
    const hash = this.getScheduleHash(schedule)

    return tree.verify(hash, proof)
  }
}
