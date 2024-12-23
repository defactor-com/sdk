import { ethers } from 'ethers'

import { miscVesting } from '../artifacts'
import { BaseContract } from '../base-classes'
import { vestingErrorMessage } from '../errors'
import { Abi, PrivateKey } from '../types/types'
import { UtilityFunctions, VestingSchedule } from '../types/vesting'
import { Role } from '../utilities/util'

export class Vesting extends BaseContract implements UtilityFunctions {
  private readonly vestingScheduleInterface: Array<string>
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

  getScheduleHash = (schedule: VestingSchedule) => {
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

  getComputedRoot(leaf: string, proof: Array<string>): string {
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
}
