import { ethers } from 'ethers'

export type Plan = {
  lockDuration: bigint
  apy: bigint
}

export type Stake = {
  amount: number
  claimed: bigint
  stakeTime: bigint
  planId: bigint
  unstaked: boolean
}

export interface Constants {
  PERCENTAGE_MULTIPLIER(): Promise<bigint>
  MIN_STAKE_AMOUNT(): Promise<bigint>
}

export interface Views {}

export interface AdminFunctions {}

export interface Functions {
  getUserTotalStakes(address: string): Promise<number>
  getUserStake(address: string, stakeIndex: bigint): Promise<Stake>
  getUserStakes(address: string): Promise<Array<Stake>>
  getRewardsEndTime(): Promise<bigint>
  getTotalFactrStaked(): Promise<bigint>
  getBaseTokenAddress(): Promise<string>
  stakingEndTime(): Promise<bigint>
  addPlan(
    lockDuration: bigint,
    apy: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  getPlans(): Promise<Array<Plan>>
  stake(
    planId: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  unstake(
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  restake(
    planId: bigint,
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  setDates(
    stakingEndTime: number,
    rewardsEndTime: number
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  withdraw(
    tokenAddress: string,
    to: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  claimRewards(
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}
