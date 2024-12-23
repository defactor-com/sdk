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
    proof: Array<ethers.BytesLike>
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
}

export interface OperatorFunctions {
  addValidMerkletreeRoot(
    root: ethers.BytesLike,
    value: boolean
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  revokeSchedules(
    root: ethers.BytesLike,
    leafs: Array<ethers.BytesLike>
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

export interface Views {
  getReleasedAmount(
    schedule: VestingSchedule,
    proof: Array<ethers.BytesLike>
  ): Promise<bigint>
  getReleasableAmount(
    schedule: VestingSchedule,
    proof: Array<ethers.BytesLike>
  ): Promise<bigint>
}
