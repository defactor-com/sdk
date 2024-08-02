import { ContractTransaction, TransactionResponse, ethers } from 'ethers'

import { miscStaking } from '../artifacts'
import { BaseContract } from '../base-classes'
import { commonErrorMessage, stakingErrorMessage } from '../errors'
import { AdminFunctions, Functions, Plan, Stake, Views } from '../types/staking'
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

  async getUserTotalStakes(address: string): Promise<number> {
    const userStakes = await this.getUserStakes(address)

    return (userStakes as ReadonlyArray<Stake>).length
  }

  async getUserStake(address: string, stakeIndex: bigint): Promise<Stake> {
    const userStakes = await this.getUserStakes(address)

    if ((userStakes as Array<Stake>).length <= Number(stakeIndex)) {
      throw new Error(stakingErrorMessage.invalidStakeIndex)
    }

    return userStakes[Number(stakeIndex)]
  }

  async getUserStakes(address: string): Promise<Array<Stake>> {
    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.getUserStakes(address)
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

  async unstake(
    stakeIndex: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    await this._checkIsNotPaused()

    if (this.signer) {
      const userStake = await this.getUserStake(this.signer.address, stakeIndex)

      if (userStake.unstaked) {
        throw new Error(stakingErrorMessage.stakeAlreadyUnstaked)
      }

      const plans = await this.getPlans()
      const plan = plans[Number(userStake.planId)]
      const currentTime = Math.floor(Date.now() / 1000)

      if (userStake.stakeTime + plan.lockDuration > currentTime) {
        throw new Error(stakingErrorMessage.stakeIsLocked)
      }
    }

    const pop = await this.contract.unstake.populateTransaction(stakeIndex)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async restake(
    planId: bigint,
    stakeIndex: bigint
  ): Promise<ContractTransaction | TransactionResponse> {
    await this._checkIsNotPaused()

    const plans = await this.getPlans()

    if (planId >= plans.length) {
      throw new Error(stakingErrorMessage.invalidPlan)
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const stakingEndTime = await this.stakingEndTime()

    if (currentTime > stakingEndTime) {
      throw new Error(stakingErrorMessage.stakingHasEnded)
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

  async setDates(
    stakingEndTime: number,
    rewardsEndTime: number
  ): Promise<ContractTransaction | TransactionResponse> {
    await this._checkIsAdmin()

    if (stakingEndTime < rewardsEndTime) {
      throw new Error(stakingErrorMessage.stakingCantBeLessThanRewardsEnd)
    }

    const pop = await this.contract.setDates.populateTransaction(
      stakingEndTime,
      rewardsEndTime
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
