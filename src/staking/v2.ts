import { ethers } from 'ethers'

import { miscStakingV2 } from '../artifacts'
import { BaseContract } from '../base-classes'
import { commonErrorMessage, stakingErrorMessage } from '../errors'
import { Stake } from '../types/staking/v1'
import {
  AddPlanInput,
  AdminFunctions,
  Constants,
  EditPlanInput,
  Functions,
  Plan,
  TokenRatio,
  Views
} from '../types/staking/v2'
import { Abi, PrivateKey } from '../types/types'
import { getUnixEpochTime } from '../utilities/util'

export class StakingV2
  extends BaseContract
  implements Constants, Functions, Views, AdminFunctions
{
  readonly BPS_DIVIDER = BigInt(10_000)
  readonly MAX_TOKEN_RATIOS_PER_PLAN = BigInt(100)
  readonly RATIO_DECIMALS_DIVIDER = BigInt('1000000000000000000')
  constructor(
    address: string,
    apiUrl: string,
    privateKey: PrivateKey | null,
    abi?: Abi
  ) {
    super(address, apiUrl, privateKey, abi || miscStakingV2.abi)
  }

  async getBalanceOf(address: string, tokenAddress: string): Promise<bigint> {
    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (!ethers.isAddress(tokenAddress)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.balanceOf(address, tokenAddress)
  }

  async calculateStakeRewardByIndex(
    address: string,
    timestamp: bigint,
    stakeIndex: bigint
  ): Promise<bigint> {
    if (stakeIndex < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    if (timestamp < 0) {
      throw new Error(commonErrorMessage.nonNegativeDate)
    }

    const userStakes = await this.getUserStakes(address)

    if (userStakes.length <= Number(stakeIndex)) {
      throw new Error(stakingErrorMessage.invalidStakeIndex)
    }

    return await this.contract.calculateStakeRewardByIndex(
      address,
      timestamp,
      stakeIndex
    )
  }

  async calculateStakeRewardsForUser(
    address: string,
    timestamp: bigint
  ): Promise<Array<bigint>> {
    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (timestamp < 0) {
      throw new Error(commonErrorMessage.nonNegativeDate)
    }

    return await this.contract.calculateStakeRewardsForUser(address, timestamp)
  }

  async getUserStake(address: string, stakeIndex: bigint): Promise<Stake> {
    if (stakeIndex < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    const userStakes = await this.getUserStakes(address)

    if (userStakes.length <= Number(stakeIndex)) {
      throw new Error(stakingErrorMessage.invalidStakeIndex)
    }

    return await this.contract.getUserStake(address, stakeIndex)
  }

  async getUserStakes(address: string): Promise<Stake[]> {
    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    return await this.contract.getUserStakes(address)
  }

  async getPlans(): Promise<Plan[]> {
    return await this.contract.getPlans()
  }

  private async _getPlan(planId: bigint): Promise<Plan> {
    if (planId < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    const plans = await this.getPlans()

    if (plans.length <= Number(planId)) {
      throw new Error(stakingErrorMessage.invalidPlanId)
    }

    return plans[Number(planId)]
  }

  async getPlanTokenRatios(planId: bigint): Promise<TokenRatio[]> {
    if (planId < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    const plans = await this.getPlans()

    if (plans.length <= Number(planId)) {
      throw new Error(stakingErrorMessage.invalidPlanId)
    }

    return await this.contract.getPlanTokenRatios(planId)
  }

  private async _checkIfPlanAlreadyExists(
    stakingToken: string,
    rewardToken: string,
    maxStaked: bigint,
    minStakeAmount: bigint,
    stakingEndTime: bigint,
    rewardEndTime: bigint,
    lockDuration: bigint,
    apy: bigint,
    apyAfterUnlock: bigint
  ) {
    const plans = await this.getPlans()

    for (const plan of plans) {
      const alreadyExists =
        plan.stakingToken === stakingToken &&
        plan.rewardToken === rewardToken &&
        plan.maxStaked === maxStaked &&
        plan.minStakeAmount === minStakeAmount &&
        plan.stakingEndTime === stakingEndTime &&
        plan.rewardEndTime === rewardEndTime &&
        plan.lockDuration === lockDuration &&
        plan.apy === apy &&
        plan.apyAfterUnlock === apyAfterUnlock

      if (alreadyExists) {
        throw new Error(stakingErrorMessage.planAlreadyExists)
      }
    }
  }

  private _checkPlanData(
    maxStaked: bigint,
    minStakeAmount: bigint,
    stakingEndTime: bigint,
    rewardEndTime: bigint,
    lockDuration: bigint,
    apy: bigint,
    apyAfterUnlock: bigint
  ) {
    if (rewardEndTime < stakingEndTime + lockDuration) {
      throw new Error(stakingErrorMessage.rewardEndTimeTooLow)
    }

    if (lockDuration < 0) {
      throw new Error(stakingErrorMessage.nonNegativeLockDuration)
    }

    if (apy < 0 || apyAfterUnlock < 0) {
      throw new Error(stakingErrorMessage.nonNegativeApy)
    }

    if (minStakeAmount < 0) {
      throw new Error(stakingErrorMessage.nonNegativeMinStakeAmount)
    }

    if (minStakeAmount < 0) {
      throw new Error(stakingErrorMessage.nonNegativeMinStakeAmount)
    }

    if (maxStaked < minStakeAmount) {
      throw new Error(stakingErrorMessage.minStakeMustBeLessThanMaxStake)
    }

    if (rewardEndTime < 0 || stakingEndTime < 0) {
      throw new Error(stakingErrorMessage.nonNegativeDates)
    }
  }

  async addPlan({
    stakingToken,
    rewardToken,
    maxStaked,
    minStakeAmount,
    initialRatio,
    stakingEndTime,
    rewardEndTime,
    lockDuration,
    apy,
    apyAfterUnlock
  }: AddPlanInput): Promise<
    ethers.ContractTransaction | ethers.TransactionResponse
  > {
    this._checkPlanData(
      maxStaked,
      minStakeAmount,
      stakingEndTime,
      rewardEndTime,
      lockDuration,
      apy,
      apyAfterUnlock
    )

    if (!ethers.isAddress(stakingToken) || !ethers.isAddress(rewardToken)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (initialRatio < 0) {
      throw new Error(stakingErrorMessage.nonNegativeInitialRatio)
    }

    await this._checkIsAdmin()
    await this._checkIfPlanAlreadyExists(
      stakingToken,
      rewardToken,
      maxStaked,
      minStakeAmount,
      stakingEndTime,
      rewardEndTime,
      lockDuration,
      apy,
      apyAfterUnlock
    )

    const pop = await this.contract.addPlan.populateTransaction(
      stakingToken,
      rewardToken,
      maxStaked,
      minStakeAmount,
      initialRatio,
      stakingEndTime,
      rewardEndTime,
      lockDuration,
      apy,
      apyAfterUnlock
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async editPlan({
    planId,
    maxStaked,
    minStakeAmount,
    stakingEndTime,
    rewardEndTime,
    lockDuration,
    apy,
    apyAfterUnlock
  }: EditPlanInput): Promise<
    ethers.ContractTransaction | ethers.TransactionResponse
  > {
    this._checkPlanData(
      maxStaked,
      minStakeAmount,
      stakingEndTime,
      rewardEndTime,
      lockDuration,
      apy,
      apyAfterUnlock
    )

    await this._checkIsAdmin()

    const plan = await this._getPlan(planId)

    await this._checkIfPlanAlreadyExists(
      plan.stakingToken,
      plan.rewardToken,
      maxStaked,
      minStakeAmount,
      stakingEndTime,
      rewardEndTime,
      lockDuration,
      apy,
      apyAfterUnlock
    )

    const pop = await this.contract.editPlan.populateTransaction(
      planId,
      maxStaked,
      minStakeAmount,
      stakingEndTime,
      rewardEndTime,
      lockDuration,
      apy,
      apyAfterUnlock
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async withdraw(
    tokenAddress: string,
    to: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsAdmin()

    if (!ethers.isAddress(tokenAddress)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    if (!ethers.isAddress(to)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
    }

    const pop = await this.contract.withdraw.populateTransaction(
      tokenAddress,
      to
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async changeTokenRatioForPlan(
    planId: bigint,
    ratio: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    await this._checkIsAdmin()

    if (ratio < 0) {
      throw new Error(commonErrorMessage.nonNegativeValue)
    }

    const plan = await this._getPlan(planId)
    const planTokenRatios = await this.getPlanTokenRatios(planId)

    if (planTokenRatios.length >= Number(this.MAX_TOKEN_RATIOS_PER_PLAN)) {
      throw new Error(stakingErrorMessage.maxTokenRatiosIsReached)
    }

    if (plan.rewardEndTime < getUnixEpochTime()) {
      throw new Error(stakingErrorMessage.rewardsEndTimeReached)
    }

    const pop = await this.contract.changeTokenRatioForPlan.populateTransaction(
      planId,
      ratio
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async stake(
    planId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (planId < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    await this._checkIsNotPaused()

    const plan = await this._getPlan(planId)

    if (amount < plan.minStakeAmount) {
      throw new Error(stakingErrorMessage.stakeAmountTooLow)
    }

    if (getUnixEpochTime() > plan.stakingEndTime) {
      throw new Error(stakingErrorMessage.stakingHasEnded)
    }

    if (plan.totalStaked + amount > plan.maxStaked) {
      throw new Error(stakingErrorMessage.maxStakedReached)
    }

    const pop = await this.contract.stake.populateTransaction(planId, amount)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async unstake(
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (stakeIndex < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    await this._checkIsNotPaused()

    if (this.signer) {
      const userStake = await this.getUserStake(this.signer.address, stakeIndex)
      const plan = await this._getPlan(userStake.planId)

      if (userStake.unstaked) {
        throw new Error(stakingErrorMessage.stakeAlreadyUnstaked)
      }

      if (userStake.stakeTime + plan.lockDuration > getUnixEpochTime()) {
        throw new Error(stakingErrorMessage.stakeIsLocked)
      }
    }

    const pop = await this.contract.unstake.populateTransaction(stakeIndex)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async restake(
    planId: bigint,
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (planId < 0 || stakeIndex < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    await this._checkIsNotPaused()

    const newPlan = await this._getPlan(planId)

    if (getUnixEpochTime() > newPlan.stakingEndTime) {
      throw new Error(stakingErrorMessage.stakingHasEnded)
    }

    if (this.signer) {
      const userStake = await this.getUserStake(this.signer.address, stakeIndex)
      const oldPlan =
        planId !== userStake.planId
          ? await this._getPlan(userStake.planId)
          : newPlan

      if (userStake.unstaked) {
        throw new Error(stakingErrorMessage.stakeAlreadyUnstaked)
      }

      if (userStake.stakeTime + oldPlan.lockDuration > getUnixEpochTime()) {
        throw new Error(stakingErrorMessage.stakeIsLocked)
      }

      if (oldPlan.stakingToken !== newPlan.stakingToken) {
        throw new Error(stakingErrorMessage.restakedWithWrongToken)
      }
    }

    const pop = await this.contract.restake.populateTransaction(
      planId,
      stakeIndex
    )

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async claimRewards(
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse> {
    if (stakeIndex < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    await this._checkIsNotPaused()

    if (this.signer) {
      const userStake = await this.getUserStake(this.signer.address, stakeIndex)

      if (userStake.unstaked) {
        throw new Error(stakingErrorMessage.stakeAlreadyUnstaked)
      }
    }

    const pop = await this.contract.claimRewards.populateTransaction(stakeIndex)

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }

  async claimAllRewards(): Promise<
    ethers.ContractTransaction | ethers.TransactionResponse
  > {
    await this._checkIsNotPaused()

    const pop = await this.contract.claimAllRewards.populateTransaction()

    return this.signer ? await this.signer.sendTransaction(pop) : pop
  }
}
