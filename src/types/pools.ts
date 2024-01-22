import { ethers } from 'ethers'

export const PoolStatusOption = {
  CREATED: 'CREATED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED'
} as const

export type PoolStatus =
  (typeof PoolStatusOption)[keyof typeof PoolStatusOption]

export type PoolCommit = {
  amount: bigint
  claimedAmount: bigint
}

export type CollateralToken = {
  contractAddress: string
  amount: bigint
  id: bigint | null
}

// TODO: use uint48 instead of bigint for deadline
export type PoolInput = {
  softCap: bigint
  hardCap: bigint
  deadline: bigint
  collateralTokens: Array<CollateralToken>
}

// TODO: use uint48 instead of bigint for createdAt, deadline and closedTime
export type Pool = {
  softCap: bigint
  hardCap: bigint
  totalCommitted: bigint
  totalRewards: bigint
  rewardsPaidOut: bigint
  createdAt: bigint
  deadline: bigint
  closedTime: bigint
  poolStatus: PoolStatus
  poolOwner: string
  collateralToken: Array<CollateralToken>
}

export interface Functions {
  createPool(
    pool: PoolInput
  ): Promise<ethers.ContractTransaction | ethers.TransactionResponse>
  collectPool(poolId: bigint): Promise<void>
  depositRewards(poolId: bigint, amount: bigint): Promise<void>
  closePool(poolId: bigint): Promise<void>
  archivePool(poolId: bigint): Promise<void>
  commitToPool(poolId: bigint, amount: bigint): Promise<void>
  uncommitFromPool(poolId: bigint): Promise<void>
  claim(poolId: bigint): Promise<void>
}
