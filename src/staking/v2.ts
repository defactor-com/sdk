import { ethers } from 'ethers'

import { miscStakingV2 } from '../artifacts'
import { BaseContract } from '../base-classes'
import { commonErrorMessage, stakingErrorMessage } from '../errors'
import { Stake } from '../types/staking/v1'
import { Plan, TokenRatio, Views } from '../types/staking/v2'
import { Abi, PrivateKey } from '../types/types'

export class StakingV2 extends BaseContract implements Views {
  readonly PERCENTAGE_MULTIPLIER = BigInt(100)
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

    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
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

    if (!ethers.isAddress(address)) {
      throw new Error(commonErrorMessage.wrongAddressFormat)
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

  async getPlanTokenRatios(planId: bigint): Promise<TokenRatio[]> {
    if (planId < 0) {
      throw new Error(stakingErrorMessage.nonNegativeIndexId)
    }

    return await this.contract.getPlanTokenRatios(planId)
  }
}
