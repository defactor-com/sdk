import { ethers } from 'ethers'

import { Stake as StakeV1, Functions as StakingV1Functions } from './v1'

export type Plan = {
  stakingToken: bigint
  rewardToken: bigint
  totalStaked: bigint
  totalUnstaked: bigint
  maxStaked: bigint
  minStakeAmount: bigint
  stakingEndTime: bigint
  rewardEndTime: bigint
  lockDuration: bigint
  apy: bigint
  apyAfterUnlock: bigint
}

export type Stake = StakeV1

export type TokenRatio = {
  timestamp: bigint
  ratio: bigint
}

export type TokenAmount = {
  token: string
  amount: bigint
}

export interface Constants {
  PERCENTAGE_MULTIPLIER(): Promise<bigint>
  RATIO_DECIMALS_DIVIDER(): Promise<bigint>
}

export interface Views {
  getBalanceOf(address: string, token: string): Promise<bigint>
  calculateStakeRewardByIndex(
    address: string,
    timestamp: bigint,
    stakeIndex: bigint
  ): Promise<bigint>
  calculateStakeRewardsForUser(
    address: string,
    timestamp: bigint
  ): Promise<bigint>
  getUserStake(address: string, stakeIndex: bigint): Promise<Stake>
  getUserStakes(address: string): Promise<Array<Stake>>
  getPlans(): Promise<Array<Plan>>
  getPlanTokenRatios(planId: bigint): Promise<Array<TokenRatio>>
}

export interface AdminFunctions {
  addPlan(
    stakingToken: bigint,
    rewardToken: bigint,
    totalStaked: bigint,
    totalUnstaked: bigint,
    maxStaked: bigint,
    minStakeAmount: bigint,
    stakingEndTime: bigint,
    rewardEndTime: bigint,
    lockDuration: bigint,
    apy: bigint,
    apyAfterUnlock: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  editPlan(
    planId: bigint,
    maxStaked: bigint,
    minStakeAmount: bigint,
    stakingEndTime: bigint,
    rewardEndTime: bigint,
    lockDuration: bigint,
    apy: bigint,
    apyAfterUnlock: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  withdraw(
    tokenAddress: string,
    to: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  changeTokenRatioForPlan(
    planId: bigint,
    ratio: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface Functions extends StakingV1Functions {
  claimAllRewards(
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}
