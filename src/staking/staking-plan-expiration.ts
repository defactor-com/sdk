import { ContractTransaction, TransactionResponse } from 'ethers'

import { miscStakingExpiration } from '../artifacts'
import { stakingErrorMessage } from '../errors'
import { ExpirationFunctions } from '../types/staking/v1'
import { Abi, PrivateKey } from '../types/types'
import { Staking } from './staking'

export class StakingExpiration extends Staking implements ExpirationFunctions {
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscStakingExpiration.abi)
  }

  async getBaseTokenAddress(): Promise<string> {
    return await this.contract.TOKEN()
  }

  async setPlanExpiration(
    planId: bigint,
    planExpiration: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    await this._checkIsAdmin()

    if (planId < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    if (planExpiration < 0) {
      throw new Error(stakingErrorMessage.nonNegativePlanExpiration)
    }

    const plans = await this.getPlans()

    if (planId >= plans.length) {
      throw new Error(stakingErrorMessage.invalidPlanId)
    }

    const pop = await this.contract.setPlanExpiration.populateTransaction(
      planId,
      planExpiration.toString()
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async stake(
    planId: bigint,
    amount: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    if (planId < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    await this._checkIsNotPaused()

    const plans = await this.getPlans()

    if (planId >= plans.length) {
      throw new Error(stakingErrorMessage.invalidPlanId)
    }

    if (amount < this.MIN_STAKE_AMOUNT) {
      throw new Error(stakingErrorMessage.stakeAmountTooLow)
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const stakingEndTime = await this.stakingEndTime()

    if (currentTime > stakingEndTime) {
      throw new Error(stakingErrorMessage.stakingHasEnded)
    }

    const plan = plans[Number(planId)]

    if (
      typeof plan.expires === 'bigint' &&
      plan.expires > 0 &&
      plan.expires < currentTime
    ) {
      throw new Error(stakingErrorMessage.planHasExpired)
    }

    const pop = await this.contract.stake.populateTransaction(
      planId,
      amount.toString()
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async restake(
    planId: bigint,
    stakeIndex: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    if (planId < 0 || stakeIndex < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    await this._checkIsNotPaused()

    const plans = await this.getPlans()

    if (planId >= plans.length) {
      throw new Error(stakingErrorMessage.invalidPlanId)
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const stakingEndTime = await this.stakingEndTime()

    if (currentTime > stakingEndTime) {
      throw new Error(stakingErrorMessage.stakingHasEnded)
    }

    const plan = plans[Number(planId)]

    if (
      typeof plan.expires === 'bigint' &&
      plan.expires > 0 &&
      plan.expires < currentTime
    ) {
      throw new Error(stakingErrorMessage.planHasExpired)
    }

    if (this.signer) {
      const userStake = await this.getUserStake(this.signer.address, stakeIndex)

      if (userStake.unstaked) {
        throw new Error(stakingErrorMessage.stakeAlreadyUnstaked)
      }

      const plan = plans[Number(userStake.planId)]

      if (userStake.stakeTime + plan.lockDuration > currentTime) {
        throw new Error(stakingErrorMessage.stakeIsLocked)
      }
    }

    const pop = await this.contract.restake.populateTransaction(
      planId,
      stakeIndex
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
