import { ethers } from 'ethers'

export type VestingSchedule = {
  cliff: bigint
  start: bigint
  duration: bigint
  secondsPerSlice: bigint
  beneficiary: string
  tokenAddress: string
  amount: bigint
  initialAmount: bigint
}

export interface Functions {
  release(
    schedule: VestingSchedule,
    proof: Array<string>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface OperatorFunctions {
  addValidMerkletreeRoot(
    root: string,
    value: boolean
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  revokeSchedules(
    root: string,
    leafs: Array<string>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface AdminFunctions {
  requestWithdraw(
    tokens: Array<string>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  withdraw(
    tokens: Array<string>,
    recipient: string
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface UtilityFunctions {
  getScheduleHash(schedule: VestingSchedule): string
  getComputedRoot(leaf: string, proof: Array<string>): string
}

export interface Views {
  getReleasedAmount(
    schedule: VestingSchedule,
    proof: Array<string>
  ): Promise<bigint>
  getReleasableAmount(
    schedule: VestingSchedule,
    proof: Array<string>
  ): Promise<bigint>
}
