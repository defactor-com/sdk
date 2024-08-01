import { ContractTransaction, TransactionResponse } from 'ethers'

import { miscStaking } from '../artifacts'
import { BaseContract } from '../base-classes'
import { stakingErrorMessage } from '../errors'
import { AdminFunctions, Functions, Plan, Views } from '../types/staking'
import { Abi, PrivateKey } from '../types/types'

export class Staking
  extends BaseContract
  implements Functions, Views, AdminFunctions
{
  readonly PERCENTAGE_MULTIPLIER = BigInt(100)
  readonly MIN_STAKE_AMOUNT = BigInt('1000000000000000000000')

  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscStaking.abi)
  }

  async stakingEndTime(): Promise<bigint> {
    return await this.contract.stakingEndTime()
  }

  async addPlan(
    lockDuration: bigint,
    apy: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    await this._checkIsAdmin()

    if (lockDuration < 0) {
      throw new Error(stakingErrorMessage.nonNegativeLockDuration)
    }

    if (apy < 0) {
      throw new Error(stakingErrorMessage.nonNegativeApy)
    }

    const pop = await this.contract.addPlan.populateTransaction(
      lockDuration.toString(),
      apy.toString()
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async getPlans(): Promise<Array<Plan>> {
    return await this.contract.getPlans()
  }

  async stake(
    planId: bigint,
    amount: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    await this._checkIsNotPaused()

    const plans = await this.getPlans()

    if (planId >= plans.length) {
      throw new Error(stakingErrorMessage.invalidPlan)
    }

    if (amount < this.MIN_STAKE_AMOUNT) {
      throw new Error(stakingErrorMessage.stakeAmountTooLow)
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const stakingEndTime = await this.stakingEndTime()

    if (currentTime > stakingEndTime) {
      throw new Error(stakingErrorMessage.stakingHasEnded)
    }

    const pop = await this.contract.stake.populateTransaction(
      planId,
      amount.toString()
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
