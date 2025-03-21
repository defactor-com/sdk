import { ethers } from 'ethers'

export type Plan = {
  lockDuration: bigint
  apy: bigint
  expires?: bigint
}

export type Stake = {
  amount: number
  claimed: bigint
  stakeTime: bigint
  planId: bigint
  unstaked: boolean
}

export interface Constants {
  PERCENTAGE_MULTIPLIER: bigint
  MIN_STAKE_AMOUNT: bigint
}

export interface Views {
  getUserTotalStakes(address: string): Promise<number>
  getUserStake(address: string, stakeIndex: bigint): Promise<Stake>
  getUserStakes(address: string): Promise<Array<Stake>>
  getRewardsEndTime(): Promise<bigint>
  getTotalFactrStaked(): Promise<bigint>
  getBaseTokenAddress(): Promise<string>
  stakingEndTime(): Promise<bigint>
  getPlans(): Promise<Array<Plan>>
}

export interface AdminFunctions {
  addPlan(
    lockDuration: bigint,
    apy: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  setDates(
    stakingEndTime: number,
    rewardsEndTime: number
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  withdraw(
    tokenAddress: string,
    to: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface Functions {
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
  claimRewards(
    stakeIndex: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface ExpirationFunctions {
  setPlanExpiration(
    planId: bigint,
    planExpiration: bigint
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}
